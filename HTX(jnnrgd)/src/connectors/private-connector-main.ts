import { ConnectorFactory } from "./ConnectorFactory";
import { ConnectorGroup, Credential, ConnectorConfiguration, Serializable, PrivateExchangeConnector } from "./types";
import logger from "./utils/logger";

const connectorGroup: ConnectorGroup = {
    name: 'btc',
};

const connectorConfig: ConnectorConfiguration = {
    quoteAsset: 'usdt',
    exchange: 'htx',
    wsAddress: 'wss://api.huobi.pro/ws',
};

const creds: Credential = {
    test: 'test',
}

const connectorInstance: PrivateExchangeConnector = ConnectorFactory.getPrivateConnector(
    connectorGroup,
    connectorConfig,
    creds,
);

const onMessage = (m: Serializable[]) => {
    logger.info(m);
};

connectorInstance.connect(onMessage);
setTimeout(() => connectorInstance.stop(), 30 * 1000);
