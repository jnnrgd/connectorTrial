import { config } from "./config";
import { ConnectorFactory } from "./ConnectorFactory";
import { PublicExchangeConnector } from "./public/types";
import { ConnectorGroup, ConnectorConfiguration, Serializable } from "./types";
import logger from "./utils/logger";

const connectorGroup: ConnectorGroup = {
    name: 'btc',
};

const connectorConfig: ConnectorConfiguration = {
    quoteAsset: 'usdt',
    exchange: config.Exchange,
    wsAddress: config.WsAddress,
    wsPath: config.WsPublicPath,
    restAddress: config.RestAddress,
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
