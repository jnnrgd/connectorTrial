import {
    Serializable,
    Side,
    SklOrderType,
} from "../types";
import {
    BalanceRequest,
    BalanceResponse,
    OpenOrdersRequest
} from "./dtos";

import WebSocket from "ws";

export interface PrivateExchangeConnector {
    connect(onMessage: (m: Serializable[]) => void, socket?: WebSocket): Promise<void>;
    stop(): void;
    getBalancePercentage(request: BalanceRequest): Promise<BalanceResponse>;
    getCurrentActiveOrders(request: OpenOrdersRequest): Promise<OrderStatusUpdate[]>
    placeOrders(request: BatchOrdersRequest): Promise<any> 
    deleteAllOrders(request: CancelOrdersRequest): Promise<void> 
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

export interface CancelOrdersRequest {}


export interface OrderStatusUpdate extends Serializable {
    event: string,
    connectorType: string,
    symbol:  string,
    orderId: number,
    sklOrderId: string,
    state: string,
    side: Side,
    price: number,
    size: number,
    notional: number,
    filled_price: number,
    filled_size: number,
    timestamp: number,
}

export interface AccountStatusUpdate extends Serializable {
    currency: string,
    accountId: number,
    balance: string,
    changeType: string,
    accountType: string,
    seqNum: string,
    changeTime: number
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