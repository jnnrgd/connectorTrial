import {
    ConnectorConfiguration,
    ConnectorGroup,
} from "../types";


export function getSklSymbol(group: ConnectorGroup, config: ConnectorConfiguration): string {
    return `${config.exchange}-${group.name}-${config.quoteAsset}`;
}


export const getHtxSymbol = (symbolGroup: ConnectorGroup, connectorConfig: ConnectorConfiguration): string => {
    return `${symbolGroup.name}${connectorConfig.quoteAsset}`
}
  