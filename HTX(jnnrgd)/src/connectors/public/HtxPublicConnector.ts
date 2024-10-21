import {
  ConnectorConfiguration,
  ConnectorGroup,
  Credential,
  Serializable,
  SklEvent,
  HtxEvent,
  Side,
} from "../types";
import {
  getHtxSymbol,
  getSklSymbol,
} from "../utils/utils";
import * as zlib from 'zlib';
import logger from "../utils/logger";
import {
  WebSocketConnectionError,
  WebsocketFeedError,
  WebsocketNotReadyError,
} from "../errors";
import {
  HtxBestBidOffer,
  HtxTicker,
  HtxTrade,
  HtxTradeData,
} from "./dtos";
import {
  TopOfBook,
  Ticker,
  Trade,
  PublicExchangeConnector,
} from "./types";

import { v4 as uuidv4 } from 'uuid';
import WebSocket from 'ws';


export class HtxPublicConnector implements PublicExchangeConnector {
  public topics: string[];
  public connectorId: string;
  public publicWsFeed?: WebSocket;
  private exchangeSymbol: string;
  private sklSymbol: string;
  private url: string;

  constructor(
    private group: ConnectorGroup,
    private config: ConnectorConfiguration,
    private credential?: Credential,
  ) {
    this.connectorId = uuidv4();
    this.url = `${this.config.wsAddress}${this.config.wsPath}`;
    this.exchangeSymbol = getHtxSymbol(this.group, this.config);
    this.sklSymbol = getSklSymbol(this.group, this.config);
    this.topics = [
      `market.${this.exchangeSymbol}.ticker`,
      `market.${this.exchangeSymbol}.trade.detail`,
      `market.${this.exchangeSymbol}.bbo`
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

  public async stop() {
    this.unsubscribeFromTopics();
    if (!this.publicWsFeed) {
      throw new WebsocketFeedError;
    }
    this.publicWsFeed.close(1000);
  }

  private async initializeWebsocket(socket?: WebSocket): Promise<void> {
    return new Promise((resolve, reject) => {
      logger.info(`Attempting to connect to ${this.config.exchange} public websocket feed`);
      this.publicWsFeed = socket || new WebSocket(this.config.wsAddress);
      
      this.publicWsFeed.on('open', () => {
        logger.info(`WebSocket connection established with HTX`);
        this.subscribeToTopics();
        resolve();
      });

      this.publicWsFeed.on('error', (err: any) => {
        logger.error(`WebSocket error: ${err.toString()}`);
        reject(new WebSocketConnectionError(err));
      });
    });
  }

  private subscribeToTopics(): void {
    this.topics.forEach(topic => {
      const subscriptionMessage = {
        sub: topic,
        id: this.connectorId,
      };
      if (!this.publicWsFeed) {
        throw new WebsocketFeedError();
      }
      if (this.publicWsFeed.readyState !== WebSocket.OPEN) {
        throw new WebsocketNotReadyError(this.publicWsFeed.readyState);
      }
      logger.info(`Subscribing to ${topic}`);
      this.publicWsFeed.send(JSON.stringify(subscriptionMessage));
    });
  }

  private unsubscribeFromTopics(): void {
    this.topics.forEach(topic => {
      const subscriptionMessage = {
        unsub: topic,
        id: this.connectorId,
      };
      if (!this.publicWsFeed) {
        throw new WebsocketFeedError;
      }
      if (this.publicWsFeed.readyState !== WebSocket.OPEN) {
        throw new WebsocketNotReadyError(this.publicWsFeed.readyState);
      }
      logger.info(`Unsubscribing from ${topic}`);
      this.publicWsFeed.send(JSON.stringify(subscriptionMessage));
    });
  }

  private setupWsHandlers(onMessage: (m: Serializable[]) => void): void {
    if (!this.publicWsFeed) {
      throw new WebsocketFeedError;
    }
    this.publicWsFeed.on('message', async (message) => this.handleMessages(message, onMessage));
    this.publicWsFeed.on('close', (code, reason: string) => this.handleClosed(code, reason, onMessage));
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

  private handleMessages(message: any, onMessage: (m: Serializable[]) => void): void {
    let data: any;
    try {
      const decompressed = zlib.gunzipSync(message).toString('utf-8');
      data = JSON.parse(decompressed);
    logger.debug(`Received message: ${JSON.stringify(data)}`);
    } catch (error) {
        if (error instanceof Error) {
          logger.error(`Error processing message: ${error.message}`);
        }
        return;
    }

    const eventType = this.getEventType(data);

    if (!eventType) {
      logger.warn(`No handler for message: ${JSON.stringify(data)}`);
      return;
    }

    // Htx sends pings to keep the connection alive
    if (eventType === HtxEvent.Ping) {
      this.replyToPing(parseInt(data.ping));
      return;
    }
    if (eventType === HtxEvent.Subbed) {
      logger.info(`Subscribed to ${data.subbed}`);
      return;
    }
    if (eventType === HtxEvent.Unsub) {
      logger.info(`Unsubscribed from ${data.unsub}`);
      return;
    }

    // Handle sklevent types of messages
    if (Object.values(SklEvent).includes(eventType as SklEvent)) {
      const serializableMessages = this.createSklEvent(eventType, data);
      onMessage(serializableMessages);
    }
  }

  private getEventType(message: any): SklEvent | HtxEvent | null {
    if (!message) {
      return null;
    }
    if (message.ping) {
      logger.debug(`Received ping, ${message.ping}`);
      return HtxEvent.Ping;
    }
    if (message.subbed) {
      logger.debug(`Received subscription confirmation for ${message.subbed}`);
      return HtxEvent.Subbed;
    }
    if (message.unsub) {
      logger.debug(`Received unsubscription confirmation for ${message.subbed}`);
      return HtxEvent.Unsub;
    }
    if (!message.ch) {
      return null;
    }
    if (message.ch.includes('ticker')) {
      logger.debug(`Received ticker message`);
      return SklEvent.Ticker;
    }
    if (message.ch.includes('trade')) {
      logger.debug(`Received trade message`);
      return SklEvent.Trade;
    }
    if (message.ch.includes('bbo')) {
      logger.debug(`Received top of book message`);
      return SklEvent.TopOfBook;
    }
    logger.debug(`No handler for message: ${message}`);
    return null;
  }

  private replyToPing(ping: number): void {
    const pong = {
      pong: ping
    };

    if (!this.publicWsFeed) {
      throw new WebsocketFeedError;
    }
    if (this.publicWsFeed.readyState !== WebSocket.OPEN) {
      throw new WebsocketNotReadyError(this.publicWsFeed.readyState);
    }
    this.publicWsFeed.send(JSON.stringify(pong));
  }

  private createSklEvent(event: SklEvent, message: any): Serializable[] {
    if (event === SklEvent.TopOfBook) {
      const marketDepth = message as HtxBestBidOffer;
      return [this.createTopOfBook(marketDepth)];
    }
    if (event === SklEvent.Ticker) {
      const ticker = message as HtxTicker;
      return [this.createTicker(ticker)];
    }
    if (event === SklEvent.Trade) {
      const trades = message as HtxTrade;
      return this.createTrades(trades);
    }
    return [];
  }

  private createTopOfBook(marketDepth: HtxBestBidOffer): TopOfBook {
    return {
      symbol: this.sklSymbol,
      connectorType: 'HTX',
      event: SklEvent.TopOfBook,
      timestamp: marketDepth.ts,
      askPrice: marketDepth.tick.ask,
      askSize: marketDepth.tick.askSize,
      bidPrice: marketDepth.tick.bid,
      bidSize: marketDepth.tick.bidSize,
    }
  }

  private createTicker(message: HtxTicker): Ticker {
    return {
      symbol: this.sklSymbol,
      connectorType: 'HTX',
      event: SklEvent.Ticker,
      lastPrice: message.tick.lastPrice,
      timestamp: message.ts,
    }
  }

  private createTrades(trade: HtxTrade): Trade[] {
    const tradeData = trade.tick.data;
    return tradeData.map((trade: HtxTradeData) => {
      return {
        symbol: this.sklSymbol,
        connectorType: 'HTX',
        event: SklEvent.Trade,
        price: trade.price,
        size: trade.amount,
        side: trade.direction === "buy" ? Side.BUY : Side.SELL,
        timestamp: trade.ts
      }
    });
  }
}
