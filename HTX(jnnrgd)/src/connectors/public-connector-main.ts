import { ConnectorFactory } from "./ConnectorFactory";
import { ConnectorGroup, PublicExchangeConnector, Credential, ConnectorConfiguration, Serializable } from "./types";
import logger from "./utils/logger";

const connectorGroup: ConnectorGroup = {
    name: 'btc',
};

const connectorConfig: ConnectorConfiguration = {
    quoteAsset: 'usdt',
    exchange: 'htx',
    wsAddress: 'wss://api.huobi.pro/ws',
};


const connectorInstance: PublicExchangeConnector = ConnectorFactory.getPublicConnector(
    connectorGroup,
    connectorConfig,
);

const onMessage = (m: Serializable[]) => {
    logger.info(m);
};

connectorInstance.connect(onMessage);
setTimeout(() => connectorInstance.stop(), 30 * 1000);
