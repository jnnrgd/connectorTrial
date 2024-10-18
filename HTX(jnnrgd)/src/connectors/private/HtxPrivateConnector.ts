import {
    ConnectorConfiguration,
    ConnectorGroup,
    Credential,
    PrivateExchangeConnector,
    Serializable,
} from "../types";
import { getHtxSymbol, getSklSymbol } from "../utils/utils";
import { v4 as uuidv4 } from 'uuid';
import { BalanceRequest, BalanceResponse, OpenOrdersRequest, OrderStatusUpdate, BatchOrdersRequest, CancelOrdersRequest } from "./types";

export class HtxPrivateConnector implements PrivateExchangeConnector {
    public connectorId: string;
    private exchangeSymbol: string;
    private sklSymbol: string;
    constructor(
        private group: ConnectorGroup,
        private config: ConnectorConfiguration,
        private credential: Credential,
    ) {
        this.connectorId = uuidv4();
        this.exchangeSymbol = getHtxSymbol(this.group, this.config);
        this.sklSymbol = getSklSymbol(this.group, this.config);
    }

    connect(onMessage: (m: Serializable[]) => void): Promise<void> {
        throw new Error("Method not implemented.");
    }
    stop(): void {
        throw new Error("Method not implemented.");
    }
    getBalancePercentage(request: BalanceRequest): Promise<BalanceResponse> {
        throw new Error("Method not implemented.");
    }
    getCurrentActiveOrders(request: OpenOrdersRequest): Promise<OrderStatusUpdate[]> {
        throw new Error("Method not implemented.");
    }
    placeOrders(request: BatchOrdersRequest): Promise<any> {
        throw new Error("Method not implemented.");
    }
    deleteAllOrders(request: CancelOrdersRequest): Promise<void> {
        throw new Error("Method not implemented.");
    }
}
