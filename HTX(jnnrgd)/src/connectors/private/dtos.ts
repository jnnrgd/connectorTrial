import { HtxOrderType, Side } from "../types";

export interface GetOpenOrdersRequest {
    accountId: string,
    symbol: string,
}

export interface OpenOrder {
    symbol: string,
    source: string,
    price: string,
    createdAt: number,
    amount: string,
    accountId: number,
    filledCashAmount: string,
    clientOrderId: string,
    filledAmount: string,
    filledFees: string,
    id: number,
    state: string,
    type: string,
    operator?: string,
    stopPrice?: string,
}

export interface GetOpenOrdersResponse {
    status: string,
    data: OpenOrder[]
}

export enum HtxOrderSource {
    SPOT = 'spot-api',
    MARGIN = 'margin-api',
    C2C = 'c2c-marging-api',
}

export interface PostBatchOrdersRequest {
    accountId: string,
    symbol: string,
    type: HtxOrderType,
    amount: string,
    price: string,
    clientOrderId: string,
    source?: HtxOrderSource,
    selfMatchPrevent?: number,
    stopPrice?: string,
    operator?: 'gte' | 'lte',
}

export interface PostBatchOrdersResponse {
    status: string,
    data: {
        clientOrderId: string,
        orderId?: number,
        errCode?: string,
        errMsg?: string,
    }
}

export interface BatchCancelOrderRequest {
    orderIds: number[],
}

export interface BatchCancelOrderResponse {
    status: number,
    data: {
        success: number[],
        failed: {
            orderId: number,
            clientOrderId: string,
            orderState: number,
            errCode: string,
            errMsg: string,
        }[],
    }
}

export interface GetAccountsResponse {
    status: number,
    data: {
        id: number,
        type: string,
        subtype: string,
        state: string,
    }[],
}

export interface GetAccountBalanceResponse {
    status: string,
    data: {
        id: number,
        type: string,
        state: string,
        list: {
            currency: string,
            type: string,
            balance: string,
            debt: string,
            available: string,
            seqNum: string,
        }[]
    }
}

export interface WsAccountUpdate {
    currency: string,
    accountId: number,
    balance: string,
    changeType: string,
    accountType: string,
    seqNum: string,
    changeTime: number,
}

export interface WsBaseOrderUpdate {
    eventType: string;
    symbol: string;
    clientOrderId?: string;
}

interface ConditionalOrderTriggerFailure extends WsBaseOrderUpdate {
    eventType: 'trigger';
    orderSide: 'buy' | 'sell';
    orderStatus: 'rejected';
    errCode?: number;
    errMessage?: string;
    lastActTime?: number;
}

interface ConditionalOrderCancelledBeforeTrigger extends WsBaseOrderUpdate {
    eventType: 'deletion';
    orderSide: 'buy' | 'sell';
    orderStatus: 'canceled';
    lastActTime?: number;
}

interface OrderSubmission extends WsBaseOrderUpdate {
    eventType: 'creation';
    accountId?: number;
    orderId?: number;
    orderSource?: string;
    orderPrice?: string;
    orderSize?: string;
    orderValue?: string;
    type: 'buy-market' | 'sell-market' | 'buy-limit' | 'sell-limit' | 'buy-limit-maker' | 'sell-limit-maker' | 'buy-ioc' | 'sell-ioc' | 'buy-limit-fok' | 'sell-limit-fok';
    orderStatus: 'submitted';
    orderCreateTime?: number;
}

interface OrderMatching extends WsBaseOrderUpdate {
    eventType: 'trade';
    tradePrice?: string;
    tradeVolume?: string;
    orderId?: number;
    type: 'buy-market' | 'sell-market' | 'buy-limit' | 'sell-limit' | 'buy-limit-maker' | 'sell-limit-maker' | 'buy-ioc' | 'sell-ioc' | 'buy-limit-fok' | 'sell-limit-fok';
    orderSource?: string;
    orderPrice?: string;
    orderSize?: string;
    orderValue?: string;
    tradeId?: number;
    tradeTime?: number;
    aggressor?: boolean;
    orderStatus: 'partial-filled' | 'filled';
    remainAmt?: string;
    execAmt?: string;
}

interface OrderCancellation extends WsBaseOrderUpdate {
    eventType: 'cancellation';
    orderId?: number;
    type: 'buy-market' | 'sell-market' | 'buy-limit' | 'sell-limit' | 'buy-limit-maker' | 'sell-limit-maker' | 'buy-ioc' | 'sell-ioc' | 'buy-limit-fok' | 'sell-limit-fok';
    orderSource?: string;
    orderPrice?: string;
    orderSize?: string;
    orderValue?: string;
    orderStatus: 'partial-canceled' | 'canceled';
    remainAmt?: string;
    execAmt?: string;
    lastActTime?: number;
}

export type WsOrderUpdateEvent =
| ConditionalOrderTriggerFailure
| ConditionalOrderCancelledBeforeTrigger
| OrderSubmission
| OrderMatching
| OrderCancellation;

