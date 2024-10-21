import { OpenOrder } from "../private/dtos";
import { HtxOrderType, OrderStatusUpdate } from "../private/types";
import {
    ConnectorConfiguration,
    ConnectorGroup,
    Side,
    SIGNATURE_VERSION,
    SignatureMethod,
    SklOrderType,
} from "../types";


export function getSklSymbol(group: ConnectorGroup, config: ConnectorConfiguration): string {
    return `${config.exchange}-${group.name}-${config.quoteAsset}`;
}

export const getHtxSymbol = (symbolGroup: ConnectorGroup, connectorConfig: ConnectorConfiguration): string => {
    return `${symbolGroup.name}${connectorConfig.quoteAsset}`
}

export const getHtxOrderType = (sklType: SklOrderType, side: Side): HtxOrderType => {
    return htxOrderTypeMap[sklType][side];
}

export const getDefaultQueryParams = (accessKey: string) => {
    return {
        AccessKeyId: accessKey,
        SignatureMethod: SignatureMethod.Ed25519,
        SignatureVersion: SIGNATURE_VERSION,
        Timestamp: getDateTime(),
    }
};

export function getDateTime() {
    const date = new Date().toISOString();
    const [fullDate, fullTime] = date.split('T');
    const time = fullTime.split('.')[0].replace(/:/g, '%3A');
    return `${fullDate}T${time}`;
}
const rt = { ls: 2 }

export function toAsciiOrderedQueryString(params: Record<string, any>): string {
    const sortedKeys = Object.keys(params).sort();

    const queryString = sortedKeys
        .map(key => `${key}=${encodeURIComponent(params[key])}`)
        .join('&');

    return `${queryString}&`;
}

function toCamelCase(key: string): string {
    return key.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

export function transformKeysToCamelCase(obj: Record<string, any> | Array<any>): Record<string, any> | Array<any> {
    if (Array.isArray(obj)) {
        return obj.map(item => transformKeysToCamelCase(item));
    } else if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((result, key) => {
            const newKey = toCamelCase(key);
            (result as any)[newKey] = transformKeysToCamelCase(obj[key]);
            return result;
        }, {});
    }
    return obj;
}

function toKebabCase(key: string): string {
    return key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

export function transformKeysToKebabCase(obj: Record<string, any> | Array<any>): Record<string, any> | Array<any> {
    if (Array.isArray(obj)) {
        return obj.map(item => transformKeysToKebabCase(item));
    } else if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((result, key) => {
            const newKey = toKebabCase(key);
            result[newKey] = transformKeysToKebabCase(obj[key]);
            return result;
        }, {} as Record<string, any>);
    }
    return obj;
}

export function mapOrderToStatusUpdate(order: OpenOrder, side: Side): OrderStatusUpdate {
    return {
        symbol: order.symbol,
        connectorType: 'HTX',
        event: 'OrderStatusUpdate',
        state: order.state,
        orderId: order.id,
        sklOrderId: order.clientOrderId,
        side: side,
        price: parseFloat(order.price),
        size: parseFloat(order.amount),
        notional: parseFloat(order.price) * parseFloat(order.amount),
        filled_price: parseFloat(order.price),
        filled_size: parseFloat(order.filledAmount),
        timestamp: Date.now(),
    };
}

export function splitIntoBatches<T>(items: T[], batchSize: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
        result.push(items.slice(i, i + batchSize));
    }
    return result;
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