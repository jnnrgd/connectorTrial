export enum SignatureMethod {
    Ed25519 = 'Ed25519',
}
export const SIGNATURE_VERSION = 2.1;

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
    Account = 'Account',
    Order = 'Order',
};

export interface ConnectorGroup {
    name: string
}

export interface ConnectorConfiguration {
    exchange: string;
    wsAddress: string;
    wsPath: string;
    restAddress: string;
    quoteAsset: string;
}

export interface Credential {
    privateKey: string;
    accessKey: string;
}

export enum Side {
    BUY = 'Buy',
    SELL = 'Sell',
}

export enum SklOrderType {
    MARKET = 'Market',
    LIMIT = 'Limit',
    LIMIT_MAKER = 'LimitMaker',
    IMMEDIATE_OR_CANCEL = 'ImmediateOrCancel',
}
