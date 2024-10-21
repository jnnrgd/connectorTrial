import { HtxTradeDirection } from "./types";

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

