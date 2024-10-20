import type WebSocket from "ws";


export enum SignatureMethod {
    Ed25519 = 'Ed25519',
}
export const SIGNATURE_VERSION = 2.1;

export interface PublicExchangeConnector {
    connect(onMessage: (m: Serializable[]) => void, socket?: WebSocket): Promise<void>;
    stop(): void;
}

export interface PrivateExchangeConnector {
    connect(onMessage: (m: Serializable[]) => void, socket?: WebSocket): Promise<void>;
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
    wsPath: string;
    quoteAsset: string;
}

export interface Credential {
    privateKey: string;
    accessKey: string;
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

export enum Side {
    BUY = 'Buy',
    SELL = 'Sell',
}

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


export interface BalanceRequest {

}
export interface BalanceResponse {
    event: string,
    symbol: string,
    baseBalance: number,
    quoteBalance: number,
    inventory: number,
    timestamp: number
}
export interface OpenOrdersRequest {

}
export interface OrderStatusUpdate {
    event: string,
    connectorType: string,
    symbol:  string,
    orderId: number,
    sklOrderId: string,
    state: string,
    side: string,
    price: number,
    size: number,
    notional: number,
    filled_price: number,
    filled_size: number,
    timestamp: number,

}

interface Order {
    side: Side,
    price: number,
    size: number,
    type: SklOrderType,
}

export interface BatchOrdersRequest {
    orders: Order[]

}
export interface CancelOrdersRequest {

}

export enum SklOrderType {
    MARKET = 'Market',
    LIMIT = 'Limit',
    LIMIT_MAKER = 'LimitMaker',
    IMMEDIATE_OR_CANCEL = 'ImmediateOrCancel',
}

export enum HtxOrderType {
    BUY_MARKET = 'buy-market',
    SELL_MARKET = 'sell-market',
    BUY_LIMIT = 'buy-limit',
    SELL_LIMIT = 'sell-limit',
    BUY_IOC = 'buy-ioc',
    SELL_IOC = 'sell-ioc',
    BUY_LIMIT_MAKER = 'buy-limit-maker',
    SELL_LIMIT_MAKER = 'sell-limit-maker',
}

export const htxOrderTypeMap: Record<SklOrderType, Record<Side, HtxOrderType>> = {
    [SklOrderType.MARKET]: {
        [Side.BUY]: HtxOrderType.BUY_MARKET,
        [Side.SELL]: HtxOrderType.SELL_MARKET,
    },
    [SklOrderType.LIMIT]: {
        [Side.BUY]: HtxOrderType.BUY_LIMIT,
        [Side.SELL]: HtxOrderType.SELL_LIMIT,
    },
    [SklOrderType.LIMIT_MAKER]: {
        [Side.BUY]: HtxOrderType.BUY_LIMIT_MAKER,
        [Side.SELL]: HtxOrderType.SELL_LIMIT_MAKER,
    },
    [SklOrderType.IMMEDIATE_OR_CANCEL]: {
        [Side.BUY]: HtxOrderType.BUY_IOC,
        [Side.SELL]: HtxOrderType.SELL_IOC,
    },
};

export enum HtxOrderSource {
    SPOT = 'spot-api',
    MARGIN = 'margin-api',
    C2C = 'c2c-marging-api',
}


export interface HtxOrderRequestParams {
    "account-id": string,
    symbol: string,
    type: HtxOrderType,
    amount: string,
    price: string,
    "client-order-id": string,
    source?: HtxOrderSource,
    "self-match-prevent"?: number,
    "stop-price"?: string,
    operator?: 'gte' | 'lte',
}

export interface Account{
    id: number,
    type: string,
    subtype: string,
    state: string,
}

export interface GetAccountsResponse {
    status: number,
    data: Account[],
}

export interface PostOrderResponse {
    "client-order-id": string,
    "order-id"?: number,
    "err-code"?: string,
    "err-msg"?: string,
}

export interface PostBatchOrdersResponse {
    status: number,
    data: number[],
}