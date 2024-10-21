import { config } from "./config";
import { ConnectorFactory } from "./ConnectorFactory";
import { PrivateExchangeConnector } from "./private/types";
import { ConnectorGroup, Credential, ConnectorConfiguration, Serializable } from "./types";
import logger from "./utils/logger";

const connectorGroup: ConnectorGroup = {
    name: 'btc',
};

const connectorConfig: ConnectorConfiguration = {
    quoteAsset: 'usdt',
    exchange: 'htx',
    wsAddress: config.WsAddress,
    wsPath: config.WsPrivatePath,
    restAddress: config.RestAddress,
};

const creds: Credential = {
    accessKey: config.AccessKey,
    privateKey: config.PrivateKey,
};

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
