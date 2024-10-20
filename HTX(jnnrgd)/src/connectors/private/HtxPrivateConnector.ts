import {
  ConnectorConfiguration,
  ConnectorGroup,
  Credential,
  GetAccountsResponse,
  HtxEvent,
  PostBatchOrdersResponse,
  PrivateExchangeConnector,
  Serializable,
  SIGNATURE_VERSION,
  SignatureMethod,
} from "../types";
import { getDateTime, getDefaultQueryParams, getHtxOrderType, getHtxSymbol, getSklSymbol } from "../utils/utils";
import { v4 as uuidv4 } from 'uuid';
import {
  BalanceRequest,
  BalanceResponse,
  OpenOrdersRequest,
  OrderStatusUpdate,
  BatchOrdersRequest,
  CancelOrdersRequest,
  HtxOrderRequestParams,
} from "../types";
import logger from "../utils/logger";
import WebSocket from 'ws';
import { WebSocketConnectionError, WebsocketFeedError } from "../errors";
import { createPrivateKey, KeyObject, sign } from 'crypto';
import axios, { AxiosInstance, AxiosResponse } from "axios";

const MAX_BATCHH_SIZE = 10;


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
  private defaultQueryParams;

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
    })

    this.defaultQueryParams = {
      AccessKeyId: this.accessKey,
      SignatureMethod: SignatureMethod.Ed25519,
      SignatureVersion: SIGNATURE_VERSION,
    };

  }

  public async connect(onMessage: (m: Serializable[]) => void, socket?: WebSocket): Promise<void> {
    try {
      this.accountId = await this.getAccountId();

      await this.initializeWebsocket(socket);
      this.setupWsHandlers(onMessage);
    }
    catch (err) {
      logger.error(`Error connecting to HTX: ${err}`);
    }
  }
  stop(): void {
    this.unsubscribeFromTopics();
    if (!this.privateWsFeed) {
      throw new WebsocketFeedError;
    }
    this.privateWsFeed.close(1000);
  }
  getBalancePercentage(request: BalanceRequest): Promise<BalanceResponse> {
    throw new Error("Method not implemented.");
  }
  getCurrentActiveOrders(request: OpenOrdersRequest): Promise<OrderStatusUpdate[]> {
    throw new Error("Method not implemented.");
  }

  public async placeOrders(request: BatchOrdersRequest): Promise<void> {
    if (request.orders.length > MAX_BATCHH_SIZE) {
      throw new Error(`Batch size exceeds maximum of ${MAX_BATCHH_SIZE}`);
    }

    const orders: HtxOrderRequestParams[] = request.orders.map(order => {
      const orderParams: HtxOrderRequestParams = {
        symbol: this.exchangeSymbol,
        type: getHtxOrderType(order.type, order.side),
        price: order.price.toString(),
        amount: order.size.toString(),
        "account-id": this.accountId.toString(),
        "client-order-id": uuidv4(),
      };
      return orderParams;
    });

    const signature = this.generateSignature('GET', '/v1/account/accounts', getDateTime());
    await this.axiosInstance.post<PostBatchOrdersResponse>('/v1/order/batch-orders', orders, {
      params: {
        ...getDefaultQueryParams(this.accessKey),
        Signature: signature,
      }
    });
  }

  deleteAllOrders(request: CancelOrdersRequest): Promise<void> {
    throw new Error("Method not implemented.");
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
    const timestamp = getDateTime();
    const signature = this.generateSignature('GET', this.config.wsPath, timestamp);

    const authMessage = {
      action: 'req',
      ch: 'auth',
      params: {
        authType: 'api',
        accessKey: this.accessKey,
        signatureMethod: SignatureMethod.Ed25519,
        signatureVersion: SIGNATURE_VERSION,
        timestamp: timestamp,
        signature: signature,
      }
    };

    if (!this.privateWsFeed) {
      throw new WebsocketFeedError;
    }

    this.privateWsFeed.send(JSON.stringify(authMessage));
  }

  private generateSignature(method: string, path: string, parameters?: string): string {
    const query = `AccessKeyId=${this.accessKey}&SignatureMethod=${SignatureMethod.Ed25519}&SignatureVersion=${SIGNATURE_VERSION}&Timestamp=${getDateTime()}${parameters ? `&${parameters}` : ''}`
    const preSigned = `${method}\n${this.config.wsAddress}\n${path}\n${query}`;
    const signature = sign(null, Buffer.from(preSigned), this.privateKey);
    return signature.toString('base64');
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
    // @ToDo: Handle other events 
  }

  private getEventType(data: any): HtxEvent | null {
    if (data.action === 'ping') {
      return HtxEvent.Ping;
    }
    if (data.action === 'sub') {
      return HtxEvent.Subbed;
    }
    if (data.action === 'unsub') {
      return HtxEvent.Unsub;
    }
    return null;
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

  private async getAccountId(): Promise<number>{
    const signature = this.generateSignature('GET', '/v1/account/accounts');

    const response: AxiosResponse<GetAccountsResponse> = await this.axiosInstance.get<GetAccountsResponse>('/v1/account/accounts', {
      params: {
        ...getDefaultQueryParams(this.accessKey),
        Signature: signature,
      }
    });
    const spotAccount = response.data.data.find(account => account.type === 'spot');
    return spotAccount?.id || 0;
  }

}
