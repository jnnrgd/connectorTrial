import {
    BalanceRequest,
    BalanceResponse,
    BatchOrdersRequest,
    CancelOrdersRequest,
    OpenOrdersRequest,
    OrderStatusUpdate,
} from "./private/types";

export interface PublicExchangeConnector {
    connect(onMessage: (m: Serializable[]) => void): Promise<void>;
    stop(): void;
}

export interface PrivateExchangeConnector {
    connect(onMessage: (m: Serializable[]) => void): Promise<void>;
    stop(): void;
    getBalancePercentage(request: BalanceRequest): Promise<BalanceResponse>;
    getCurrentActiveOrders(request: OpenOrdersRequest): Promise<OrderStatusUpdate[]>
    placeOrders(request: BatchOrdersRequest): Promise<any> 
    deleteAllOrders(request: CancelOrdersRequest): Promise<void> 
}

export interface Serializable {
}

export enum HtxEvent {
    Subbed = 'Subbed',
    Unsub = 'Unsubbed',
    Ping = 'Ping',
}

export enum SklEvent {
    TopOfBook = 'TopOfBook',
    Trade = 'Trade',
    Ticker = 'Ticker',
};

export interface ConnectorGroup {
    name: string
}

export interface ConnectorConfiguration {
    exchange: string;
    wsAddress: string;
    quoteAsset: string;
}

export interface Credential {
    [key: string]: any;
}

export interface TopOfBook extends Serializable {
    symbol: string;
    connectorType: string;
    event: 'TopOfBook';
    timestamp: number;
    askPrice: number;
    askSize: number;
    bidPrice: number;
    bidSize: number;
}

export interface Ticker extends Serializable {
    symbol: string;
    connectorType: string;
    event: 'Ticker';
    lastPrice: number;
    timestamp: number;
}

type Side = 'Buy' | 'Sell';

export interface Trade extends Serializable {
    symbol: string;
    connectorType: string;
    event: 'Trade';
    price: number;
    size: number;
    side: Side;
    timestamp: number;
}

interface HtxHtxBestBidOfferTick {
    seqId: number;
    ask: number;
    askSize: number;
    bid: number;
    bidSize: number;
    quoteTime: number;
    symbol: string;
}

export interface HtxBestBidOffer {
    ch: string;
    ts: number;
    tick: HtxHtxBestBidOfferTick;
}

interface HtxTickerTick {
    open: number;
    high: number;
    low: number;
    close: number;
    amount: number;
    vol: number;
    count: number;
    bid: number;
    bidSize: number;
    ask: number;
    askSize: number;
    lastPrice: number;
    lastSize: number;
}

export interface HtxTicker {
    ch: string;
    ts: number;
    tick: HtxTickerTick;
}

type HtxTradeDirection = 'buy' | 'sell';

export interface HtxTradeData {
    id: number;
    ts: number;
    tradeId: number;
    amount: number;
    price: number;
    direction: HtxTradeDirection;
}

interface HtxTradeTick {
    id: number;
    ts: number;
    data: HtxTradeData[];
}

export interface HtxTrade {
    ch: string;
    ts: number;
    tick: HtxTradeTick;
}