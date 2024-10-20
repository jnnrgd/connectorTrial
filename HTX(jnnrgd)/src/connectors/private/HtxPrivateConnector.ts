import {
  ConnectorConfiguration,
  ConnectorGroup,
  Credential,
  PrivateExchangeConnector,
  Serializable,
  SIGNATURE_VERSION,
  SignatureMethod,
} from "../types";
import { getHtxSymbol, getSklSymbol } from "../utils/utils";
import { v4 as uuidv4 } from 'uuid';
import {
  BalanceRequest,
  BalanceResponse,
  OpenOrdersRequest,
  OrderStatusUpdate,
  BatchOrdersRequest,
  CancelOrdersRequest,
} from "./types";
import logger from "../utils/logger";
import WebSocket from 'ws';
import { WebSocketConnectionError, WebsocketFeedError } from "../errors";
import { createPrivateKey, KeyObject, sign } from 'crypto';

export class HtxPrivateConnector implements PrivateExchangeConnector {
  public connectorId: string;
  private exchangeSymbol: string;
  private sklSymbol: string;
  private url: string;
  public privateWsFeed?: WebSocket;
  private accessKey: string;
  private privateKey: KeyObject;
  private topics: string[] = [];

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
  }

  public async connect(onMessage: (m: Serializable[]) => void, socket?: WebSocket): Promise<void> {
    try {
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
  placeOrders(request: BatchOrdersRequest): Promise<any> {
    throw new Error("Method not implemented.");
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
    const timestamp = this.getDateTime();
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

  private generateSignature(method: string, path: string, timestamp: string): string {
    const query = `AccessKeyId=${this.accessKey}&SignatureMethod=${SignatureMethod.Ed25519}&SignatureVersion=${SIGNATURE_VERSION}&Timestamp=${timestamp}`;
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
    // Handle messages
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

  private getDateTime() {
    const date = new Date().toISOString();
    const [fullDate, fullTime] = date.split('T');
    const time = fullTime.split('.')[0];
    return `${fullDate}T${time}`;
  }

}
