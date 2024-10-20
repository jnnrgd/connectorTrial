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
    side: string,
    price: number,
    size: number,
    type: string,
}

export interface BatchOrdersRequest {
    orders: Order[]

}
export interface CancelOrdersRequest {

}
