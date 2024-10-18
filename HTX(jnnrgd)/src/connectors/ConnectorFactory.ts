import { HtxPublicConnector } from "./public/HtxPublicConnector";
import { HtxPrivateConnector } from "./private/HtxPrivateConnector";
import { ConnectorGroup, PublicExchangeConnector, Credential, ConnectorConfiguration, PrivateExchangeConnector } from "./types";

export class ConnectorFactory {
    public static getPublicConnector(group: ConnectorGroup, config: ConnectorConfiguration, credential?: Credential): PublicExchangeConnector {
        switch (config.exchange) {
            case 'htx':
                return new HtxPublicConnector(group, config, credential);
            default:
                throw new Error(`Unknown exchange: ${config.exchange}`);
        }
    }

    public static getPrivateConnector(group: ConnectorGroup, config: ConnectorConfiguration, credential: Credential): PrivateExchangeConnector {
        switch (config.exchange) {
            case 'htx':
                return new HtxPrivateConnector(group, config, credential);
            default:
                throw new Error(`Unknown exchange: ${config.exchange}`);
        }
    }
}