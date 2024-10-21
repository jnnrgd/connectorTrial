import {
  AccountStatusUpdate,
  ConnectorConfiguration,
  ConnectorGroup,
  Credential,
  HtxEvent,
  PrivateExchangeConnector,
  Serializable,
  Side,
  SklEvent,
} from "../types";
import { getDefaultQueryParams, getHtxOrderType, getHtxSymbol, getSklSymbol, mapOrderToStatusUpdate, splitIntoBatches, toAsciiOrderedQueryString, transformKeysToCamelCase, transformKeysToKebabCase } from "../utils/utils";
import { v4 as uuidv4 } from 'uuid';
import {
  BalanceRequest,
  BalanceResponse,
  OpenOrdersRequest,
  OrderStatusUpdate,
  BatchOrdersRequest,
  CancelOrdersRequest,
} from "../types";
import logger from "../utils/logger";
import WebSocket from 'ws';
import { WebSocketConnectionError, WebsocketFeedError } from "../errors";
import { createPrivateKey, KeyObject, sign } from 'crypto';
import axios, { AxiosInstance, AxiosResponse } from "axios";
import { BatchCancelOrderRequest, BatchCancelOrderResponse, GetAccountBalanceResponse, GetAccountsResponse, GetOpenOrdersRequest, GetOpenOrdersResponse, OpenOrder, PostBatchOrdersRequest, PostBatchOrdersResponse, WsAccountUpdate, WsOrderUpdateEvent } from "./dtos";

const MAX_CREATE_BATCH_SIZE = 10;
const MAX_DELETE_BATCH_SIZE = 50;
const RATE_LIMIT = 50;
const WAIT_TIME = 2000;


export class HtxPrivateConnector implements PrivateExchangeConnector {
  public connectorId: string;
  private accountId = 0;
  private exchangeSymbol: string;
  private sklSymbol: string;
  private url: string;
  public privateWsFeed?: WebSocket;
  private accessKey: string;
  private privateKey: KeyObject;
  private topics: string[] = [];
  private axiosInstance: AxiosInstance;

  constructor(
    private group: ConnectorGroup,
    private config: ConnectorConfiguration,
    private credential: Credential,
  ) {
    if (!this.credential.accessKey || !this.credential.privateKey) {
      throw new Error('No credential provided for authentication');
    }
    this.accessKey = this.credential.accessKey;
    this.privateKey = createPrivateKey({
      key: Buffer.from(this.credential.privateKey, 'hex'),
      format: 'der',
      type: 'pkcs8',
    });

    this.connectorId = uuidv4();
    this.url = `wss://${this.config.wsAddress}${this.config.wsPath}`;

    this.exchangeSymbol = getHtxSymbol(this.group, this.config);
    this.sklSymbol = getSklSymbol(this.group, this.config);

    this.topics = [
      "accounts.update#0",
      `orders#${this.exchangeSymbol}`
    ];

    this.axiosInstance = axios.create({
      baseURL: `https://${this.config.wsAddress}`,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000,
    });
  }

  public async connect(onMessage: (m: Serializable[]) => void, socket?: WebSocket): Promise<void> {
    try {
      this.setupHttpClient();
      this.accountId = await this.getAccountId();

      await this.initializeWebsocket(socket);
      this.setupWsHandlers(onMessage);
    }
    catch (err) {
      logger.error(`Error connecting to HTX: ${err}`);
    }
  }

  public stop(): void {
    this.unsubscribeFromTopics();
    if (!this.privateWsFeed) {
      throw new WebsocketFeedError;
    }
    this.privateWsFeed.close(1000);
  }

  public async getBalancePercentage(request: BalanceRequest): Promise<BalanceResponse> {
    const path = `/v1/account/accounts/${this.accountId}/balance`;
    const response: AxiosResponse<GetAccountBalanceResponse> = await this.axiosInstance.get<GetAccountBalanceResponse>(path);
    const baseAsset = this.group.name;
    const quoteAsset = this.config.quoteAsset;
    const quote = response.data.data.list
      .filter(d => d.currency === quoteAsset)
      .reduce((acc, curr) => ({
        available: (parseFloat(acc.available) + parseFloat(curr.available)).toString(),
        balance: (parseFloat(acc.balance) + parseFloat(curr.balance)).toString(),
      }), { available: '0', balance: '0' });

    const base = response.data.data.list
      .filter(d => d.currency === baseAsset)
      .reduce((acc, curr) => ({
        available: (parseFloat(acc.available) + parseFloat(curr.available)).toString(),
        balance: (parseFloat(acc.balance) + parseFloat(curr.balance)).toString(),
      }), { available: '0', balance: '0' });

    const baseVal = parseFloat(base.available) + parseFloat(base.balance);
    const baseValue = baseVal * request.lastPrice;
    const quoteValue = parseFloat(quote.available) + parseFloat(quote.balance);

    const whole = baseValue + quoteValue;
    const pairPercentage = (baseValue / whole) * 100;

    return {
      event: "BalanceRequest",
      symbol: this.sklSymbol,
      baseBalance: baseVal,
      quoteBalance: quoteValue,
      inventory: pairPercentage,
      timestamp: new Date().getTime()
    };
  }

  public async getCurrentActiveOrders(request: OpenOrdersRequest): Promise<OrderStatusUpdate[]> {
    const params: GetOpenOrdersRequest = {
      accountId: `${this.accountId}`,
      symbol: this.exchangeSymbol,
    };

    const buyOrders = await this.getActiveOrders({ ...params, side: 'buy' });
    const buyOrderStatusUpdate = buyOrders.map(order => mapOrderToStatusUpdate(order, Side.BUY));
    const sellOrders = await this.getActiveOrders({ ...params, side: 'sell' });
    const sellOrderStatusUpdate = sellOrders.map(order => mapOrderToStatusUpdate(order, Side.SELL));

    return [...buyOrderStatusUpdate, ...sellOrderStatusUpdate];
  }

  public async placeOrders(request: BatchOrdersRequest): Promise<void> {
    const path = '/v1/order/batch-orders';

    const orders: PostBatchOrdersRequest[] = request.orders.map(order => {
      const orderParams: PostBatchOrdersRequest = {
        symbol: this.exchangeSymbol,
        type: getHtxOrderType(order.type, order.side),
        price: order.price.toString(),
        amount: order.size.toString(),
        accountId: this.accountId.toString(),
        clientOrderId: uuidv4(),
      };
      return orderParams;
    });

    const batches = splitIntoBatches<PostBatchOrdersRequest>(orders, MAX_CREATE_BATCH_SIZE);

    for (let i = 0; i < batches.length; i++) {
      if (i > 0 && i % RATE_LIMIT === 0) {
        console.log('Pausing for rate limit...');
        await new Promise(resolve => setTimeout(resolve, WAIT_TIME));
      }
      await this.axiosInstance.post<PostBatchOrdersResponse>(path, batches[i]);
    }

  }

  public async deleteAllOrders(request: CancelOrdersRequest): Promise<void> {
    const params: GetOpenOrdersRequest = {
      accountId: `${this.accountId}`,
      symbol: this.exchangeSymbol,
    };
    const buyOrders = await this.getActiveOrders({ ...params, side: 'buy' });
    const sellOrders = await this.getActiveOrders({ ...params, side: 'sell' });
    const orderIds = [...buyOrders, ...sellOrders].map(order => order.id);
    const batches = splitIntoBatches<number>(orderIds, MAX_DELETE_BATCH_SIZE);

    for (let i = 0; i < batches.length; i++) {
      if (i > 0 && i % RATE_LIMIT === 0) {
        console.log('Pausing for rate limit...');
        await new Promise(resolve => setTimeout(resolve, WAIT_TIME));
      }
      await this.cancelBatchOrders(batches[i]);
    }
  }

  private setupHttpClient() {
    this.axiosInstance.interceptors.request.use(
      (config) => {
        config.params = transformKeysToKebabCase(config.params);
        config.data = transformKeysToKebabCase(config.data);

        const signature = this.generateSignature(
          config.method?.toUpperCase() || 'GET',
          config.url || '',
          {
            ...config.params,
            ...getDefaultQueryParams(this.accessKey)
          }
        );

        config.params = {
          ...config.params,
          Signature: signature,
        };

        return config;
      },
      error => {
        return Promise.reject(error);
      }
    )
    this.axiosInstance.interceptors.response.use(
      (response) => {
        return {
          ...response,
          data: transformKeysToCamelCase(response.data),
        };
      },
      error => {
        return Promise.reject(error);
      }
    );
  }

  private async initializeWebsocket(socket?: WebSocket): Promise<void> {
    return new Promise((resolve, reject) => {
      logger.info(`Attempting to connect to ${this.config.exchange} public websocket feed`);
      this.privateWsFeed = socket || new WebSocket(this.url);

      this.privateWsFeed.on('open', () => {
        logger.info(`WebSocket connection established with HTX`);
        this.authenticateWebsocket();
        this.subscribeToTopics();
        resolve();
      });

      this.privateWsFeed.on('error', (err: any) => {
        logger.error(`WebSocket error: ${err.toString()}`);
        reject(new WebSocketConnectionError(err));
      });
    });
  }

  private authenticateWebsocket() {
    if (!this.credential) {
      throw new Error('No credential provided for authentication');
    }
    const defaultParams = getDefaultQueryParams(this.accessKey);
    const signature = this.generateSignature('GET', this.config.wsPath, defaultParams);

    const authMessage = {
      action: 'req',
      ch: 'auth',
      params: {
        authType: 'api',
        accessKey: defaultParams.AccessKeyId,
        signatureMethod: defaultParams.SignatureMethod,
        signatureVersion: defaultParams.SignatureVersion,
        timestamp: defaultParams.Timestamp,
        signature: signature,
      }
    };

    if (!this.privateWsFeed) {
      throw new WebsocketFeedError;
    }

    this.privateWsFeed.send(JSON.stringify(authMessage));
  }

  private subscribeToTopics(): void {
    this.topics.forEach(topic => {
      const subscriptionMessage = {
        action: 'sub',
        ch: topic,
      };
      if (!this.privateWsFeed) {
        throw new WebsocketFeedError;
      }
      if (this.privateWsFeed.readyState !== WebSocket.OPEN) {
        throw new WebsocketFeedError;
      }
      logger.info(`Subscribing to ${topic}`);
      this.privateWsFeed.send(JSON.stringify(subscriptionMessage));
    });
  }

  private unsubscribeFromTopics(): void {
    this.topics.forEach(topic => {
      const subscriptionMessage = {
        action: 'unsub',
        ch: topic,
      };
      if (!this.privateWsFeed) {
        throw new WebsocketFeedError;
      }
      if (this.privateWsFeed.readyState !== WebSocket.OPEN) {
        throw new WebsocketFeedError;
      }
      logger.info(`Unsubscribing from ${topic}`);
      this.privateWsFeed.send(JSON.stringify(subscriptionMessage));
    });
  }

  private setupWsHandlers(onMessage: (m: Serializable[]) => void): void {
    if (!this.privateWsFeed) {
      throw new WebsocketFeedError;
    }
    this.privateWsFeed.on('message', async (message) => this.handleMessages(message, onMessage));
    this.privateWsFeed.on('close', (code, reason: string) => this.handleClosed(code, reason, onMessage));
  }

  private handleMessages(message: any, onMessage: (m: Serializable[]) => void): void {
    const data = JSON.parse(message);
    const eventType = this.getEventType(data);
    if (!eventType) {
      logger.warn(`No handler for message: ${JSON.stringify(data)}`);
      return;
    }

    if (eventType === HtxEvent.Ping) {
      this.replyToPing(data.data.ts);
      return;
    }
    if (eventType === HtxEvent.Subbed) {
      logger.info(`Subscribed to ${data.ch}`);
      return;
    }
    if (eventType === HtxEvent.Unsub) {
      logger.info(`Unsubscribed from ${data.ch}`);
      return;
    }
    if (Object.values(SklEvent).includes(eventType as SklEvent)) {
      const serializableMessages = this.createSklEvent(eventType, data.data);
      onMessage(serializableMessages);
    }
  }

  private createSklEvent(eventType: SklEvent, data: any): Serializable[] {
    if (eventType === SklEvent.Account) {
      const accountUpdate = data as WsAccountUpdate;
      return [this.createAccountUpdateEvent(accountUpdate)];
    }
    if (eventType === SklEvent.Order) {
      const orderUpdate = data as WsOrderUpdateEvent;
      return [this.createOrderUpdateEvent(orderUpdate)];
    }
    return [];
  }
  private createOrderUpdateEvent(orderUpdate: WsOrderUpdateEvent): OrderStatusUpdate {
    let orderStatusUpdate: OrderStatusUpdate = {
      event: orderUpdate.eventType,
      connectorType: 'HTX',
      symbol: orderUpdate.symbol,
      orderId: 0,
      sklOrderId: orderUpdate.clientOrderId || '',
      state: 'unknown',
      side: Side.BUY,
      price: 0,
      size: 0,
      notional: 0,
      filled_price: 0,
      filled_size: 0,
      timestamp: Date.now(),
    };
    switch (orderUpdate.eventType) {
      case 'trigger':
      case 'deletion':
        if ('orderSide' in orderUpdate) {
          orderStatusUpdate.side = orderUpdate.orderSide === 'buy' ? Side.BUY : Side.SELL;
        }
        if ('orderStatus' in orderUpdate) {
          orderStatusUpdate.state = orderUpdate.orderStatus;
        }
        orderStatusUpdate.timestamp = orderUpdate.lastActTime || Date.now();
        break;

      case 'creation':
        if ('orderId' in orderUpdate) {
          orderStatusUpdate.orderId = orderUpdate.orderId!;
        }
        if ('orderStatus' in orderUpdate) {
          orderStatusUpdate.state = orderUpdate.orderStatus;
        }
        if ('type' in orderUpdate && orderUpdate.type.includes('buy')) {
          orderStatusUpdate.side = Side.BUY;
        } else {
          orderStatusUpdate.side = Side.SELL;
        }
        orderStatusUpdate.price = parseFloat(orderUpdate.orderPrice || '0');
        orderStatusUpdate.size = parseFloat(orderUpdate.orderSize || '0');
        orderStatusUpdate.notional = orderStatusUpdate.price * orderStatusUpdate.size;
        orderStatusUpdate.timestamp = orderUpdate.orderCreateTime || Date.now();
        break;

      case 'trade':
        if ('orderId' in orderUpdate) {
          orderStatusUpdate.orderId = orderUpdate.orderId!;
        }
        if ('orderStatus' in orderUpdate) {
          orderStatusUpdate.state = orderUpdate.orderStatus;
        }
        if ('type' in orderUpdate && orderUpdate.type.includes('buy')) {
          orderStatusUpdate.side = Side.BUY;
        } else {
          orderStatusUpdate.side = Side.SELL;
        }
        orderStatusUpdate.price = parseFloat(orderUpdate.tradePrice || '0');
        orderStatusUpdate.size = parseFloat(orderUpdate.tradeVolume || '0');
        orderStatusUpdate.filled_price = orderStatusUpdate.price;
        orderStatusUpdate.filled_size = orderStatusUpdate.size;
        orderStatusUpdate.notional = orderStatusUpdate.price * orderStatusUpdate.size;
        orderStatusUpdate.timestamp = orderUpdate.tradeTime || Date.now();
        break;

      case 'cancellation':
        if ('orderId' in orderUpdate) {
          orderStatusUpdate.orderId = orderUpdate.orderId!;
        }
        if ('orderStatus' in orderUpdate) {
          orderStatusUpdate.state = orderUpdate.orderStatus;
        }
        if ('type' in orderUpdate && orderUpdate.type.includes('buy')) {
          orderStatusUpdate.side = Side.BUY;
        } else {
          orderStatusUpdate.side = Side.SELL;
        }
        orderStatusUpdate.price = parseFloat(orderUpdate.orderPrice || '0');
        orderStatusUpdate.size = parseFloat(orderUpdate.orderSize || '0');
        orderStatusUpdate.notional = orderStatusUpdate.price * orderStatusUpdate.size;
        orderStatusUpdate.timestamp = orderUpdate.lastActTime || Date.now();
        break;

      default:
        console.warn("Unknown event type");
    }

    return orderStatusUpdate;
  }

  createAccountUpdateEvent(accountUpdate: WsAccountUpdate): AccountStatusUpdate {
    return accountUpdate
  }

  private handleClosed(code: number, reason: string, onMessage: (m: Serializable[]) => void): void {
    if (code === 1000) {
      logger.info(`WebSocket closed normally`);
      return;
    }
    logger.error(`WebSocket closed with code ${code} and reason ${reason}`);
    setTimeout(() => {
      this.connect(onMessage);
    }, 5000);
  }

  private getEventType(data: any): HtxEvent | SklEvent | null {
    if (!data.action) {
      return null;
    }
    if (data.action === 'ping') {
      return HtxEvent.Ping;
    }
    if (data.action === 'sub') {
      return HtxEvent.Subbed;
    }
    if (data.action === 'unsub') {
      return HtxEvent.Unsub;
    }
    if (data.action === 'push') {
      if (!data.ch) {
        return null;
      }
      if (data.ch === 'accounts.update#0') {
        return SklEvent.Account;
      }
      if (data.ch === `orders#${this.exchangeSymbol}`) {
        return SklEvent.Order;
      }
      return null;
    }
    return null;
  }

  private generateSignature(method: string, path: string, parameters: Record<string, any>): string {
    const orderedParams = toAsciiOrderedQueryString(parameters);
    const preSigned = `${method}\n${this.config.wsAddress}\n${path}\n${orderedParams}`;
    const signature = sign(null, Buffer.from(preSigned), this.privateKey);
    return signature.toString('base64url');
  }

  private replyToPing(ts: number): void {
    if (!this.privateWsFeed) {
      throw new WebsocketFeedError;
    }
    const pong = {
      action: 'pong',
      data: {
        ts: ts,
      }
    };
    this.privateWsFeed.send(JSON.stringify(pong));
  }

  private async getAccountId(): Promise<number> {
    const response: AxiosResponse<GetAccountsResponse> = await this.axiosInstance.get<GetAccountsResponse>('/v1/account/accounts');
    const spotAccount = response.data.data.find(account => account.type === 'spot');
    return spotAccount?.id || 0;
  }

  private async getActiveOrders(params: GetOpenOrdersRequest & { side: string }): Promise<OpenOrder[]> {
    const response: AxiosResponse<GetOpenOrdersResponse> = await this.axiosInstance.get<GetOpenOrdersResponse>(
      '/v1/order/openOrders',
      { params }
    );

    return response.data.data;
  }

  private async cancelBatchOrders(orderIds: number[]): Promise<BatchCancelOrderResponse> {
    const path = '/v1/order/orders/batchcancel';
    const params: BatchCancelOrderRequest = {
      orderIds,
    };

    const response: AxiosResponse<BatchCancelOrderResponse> = await this.axiosInstance.post<BatchCancelOrderResponse>(
      path,
      params,
    );
    return response.data;
  }

}
