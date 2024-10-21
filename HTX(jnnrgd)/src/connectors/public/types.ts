import { Serializable, Side } from "../types";



export type HtxTradeDirection = 'buy' | 'sell';

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


export interface Trade extends Serializable {
    symbol: string;
    connectorType: string;
    event: 'Trade';
    price: number;
    size: number;
    side: Side;
    timestamp: number;
}