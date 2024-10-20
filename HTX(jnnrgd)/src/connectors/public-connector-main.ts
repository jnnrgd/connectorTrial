import { ConnectorFactory } from "./ConnectorFactory";
import { ConnectorGroup, PublicExchangeConnector, Credential, ConnectorConfiguration, Serializable } from "./types";
import logger from "./utils/logger";
import dotenv from 'dotenv';

dotenv.config();

const connectorGroup: ConnectorGroup = {
    name: 'btc',
};

const connectorConfig: ConnectorConfiguration = {
    quoteAsset: 'usdt',
    exchange: 'htx',
    wsAddress: process.env.HtxWsAddress || 'api.huobi.pro',
    wsPath: process.env.HtxPublicPath || '/ws',
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
