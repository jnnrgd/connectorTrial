import {
    ConnectorConfiguration,
    ConnectorGroup,
    HtxOrderType,
    htxOrderTypeMap,
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
    const time = fullTime.split('.')[0];
    return `${fullDate}T${time}`;
}