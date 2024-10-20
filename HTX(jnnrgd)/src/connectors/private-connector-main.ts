import { ConnectorFactory } from "./ConnectorFactory";
import { ConnectorGroup, Credential, ConnectorConfiguration, Serializable, PrivateExchangeConnector } from "./types";
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
    wsPath: process.env.HtxPrivatePath || '/ws/v2',
};

const creds: Credential = {
    accessKey: process.env.HtxAccessKey || '',
    privateKey: process.env.HtxPrivateKey || '',
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
