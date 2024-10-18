import { HtxPublicConnector } from '../src/connectors/public/HtxPublicConnector';
import { ConnectorGroup, ConnectorConfiguration, Serializable, SklEvent } from '../src/connectors/types';
import { Server as WSS, WebSocket} from 'ws';
import { getHtxSymbol } from '../src/connectors/utils/utils';
import logger from '../src/connectors/utils/logger';


describe('HtxPublicConnector', () => {
    const mockGroup: ConnectorGroup = { name: 'btc' };
    const mockConfig: ConnectorConfiguration = {
        quoteAsset: 'usdt',
        exchange: 'htx',
        wsAddress: 'ws://127.0.0.1:12345',
    };
    let server: WSS;
    let connector: HtxPublicConnector
    const symbol = getHtxSymbol(mockGroup, mockConfig);

    beforeEach(async () => {
        server = new WSS({port: 12345}, );
        connector = new HtxPublicConnector(mockGroup, mockConfig);
    });

    afterEach(async () => {
        if (connector.publicWsFeed && connector.publicWsFeed.readyState === WebSocket.OPEN) {
            await connector.stop();
        }

        await new Promise<void>((resolve) => {
            server.close(() => {
                resolve();
            });
        });
    });

    it('should connect to the websocket', async () => {
        await connector.connect(() => {});
        expect(server.clients.size).toBe(1);
        expect(connector.publicWsFeed).toBeDefined();
        expect(connector.publicWsFeed?.readyState).toBe(1);
    });

    it('should stop the websocket connection', async () => {
        await connector.connect(() => {});
        await connector.stop();
        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(server.clients.size).toBe(0);
        expect(connector.publicWsFeed?.readyState).toBe(WebSocket.CLOSED);
    });

    it('should attempt to reconnect if the connection is lost', async () => {
        await connector.connect(() => {});
        server.on('connection', (ws: WebSocket) => {
            setTimeout(() => ws.close(1001, 'Server is Going away'), 1000);
        });
        await new Promise(resolve => setTimeout(resolve, 5000));
        expect(connector.publicWsFeed?.readyState).toBe(WebSocket.OPEN);
    }, 6000);

    it('should respond to ping messages with pong', async () => {
        const receivedMessages:any[] = [];
        server.on('connection', (ws: WebSocket) => {
            setTimeout(() => ws.send(JSON.stringify({ping: 12345})), 50);
            ws.on('message', (message: string) => {
                const parsedMessage = JSON.parse(message);
                receivedMessages.push(parsedMessage);
            });
        });
        await connector.connect(() => {});
        await new Promise(resolve => setTimeout(resolve, 100));

        const pongMessages = receivedMessages.filter((message) => message.pong);
        expect(pongMessages.length).toBe(1);
        expect(pongMessages[0]).toEqual({pong: 12345});
    });

    it('should subscribe to topics after connecting', async () => {
        const receivedMessages:any[] = [];
        server.on('connection', (ws: WebSocket) => {
            ws.on('message', (message: string) => {
                const parsedMessage = JSON.parse(message);
                receivedMessages.push(parsedMessage);
            });
        });
        await connector.connect(() => {});
        await new Promise(resolve => setTimeout(resolve, 100));
        expect(receivedMessages.length).toBe(3);
        expect(receivedMessages).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ sub: `market.${symbol}.bbo`, id: expect.any(String) }),
                expect.objectContaining({ sub: `market.${symbol}.trade.detail`, id: expect.any(String) }),
                expect.objectContaining({ sub: `market.${symbol}.ticker`, id: expect.any(String) }),
            ])
        );
    });

    it('should unsubscribe from topics when stopping', async () => {
        const receivedMessages:any[] = [];
        server.on('connection', (ws: WebSocket) => {
            ws.on('message', (message: string) => {
                const parsedMessage = JSON.parse(message);
                receivedMessages.push(parsedMessage);
            });
        });
        await connector.connect(() => {});
        await connector.stop();
        await new Promise(resolve => setTimeout(resolve, 100));
        const unsubMessages = receivedMessages.filter((message) => message.unsub);
        expect(unsubMessages.length).toBe(3);
        expect(unsubMessages).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ unsub: `market.${symbol}.bbo`, id: expect.any(String) }),
                expect.objectContaining({ unsub: `market.${symbol}.trade.detail`, id: expect.any(String) }),
                expect.objectContaining({ unsub: `market.${symbol}.ticker`, id: expect.any(String) }),
            ])
        );
    });

    it('should return serialized Trade messages', async () => {
        const onMessage = (m: Serializable[]) => {
            logger.info('Received messages:', m);
            expect(m).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    symbol: expect.any(String),
                    connectorType: 'HTX',
                    event: SklEvent.Trade,
                    price: expect.any(Number),
                    size: expect.any(Number),
                    side: expect.any(String),
                    timestamp: expect.any(Number),
                })
            ]));
        };
        server.on('connection', (ws: WebSocket) => {
            const tradeMessage = {
                ch: `market.${symbol}.trade.detail`,
                ts: 1630994963175,
                tick: {
                    id: 137005445109,
                    ts: 1630994963173,
                    data: [
                        {
                            id: 1.37005445109,
                            ts: 1630994963173,
                            tradeId: 102523573486,
                            amount: 0.006754,
                            price: 52648.62,
                            direction: "buy"
                        }
                    ]
                }
            };
            setTimeout(() => ws.send(JSON.stringify(tradeMessage)), 50);
        });
        await connector.connect(onMessage);

        await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    it('should return serialized Ticker messages', async () => {
        const onMessage = (m: Serializable[]) => {
            logger.info('Received messages:', m);
            expect(m).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    symbol: expect.any(String),
                    connectorType: 'HTX',
                    event: SklEvent.Ticker,
                    lastPrice: expect.any(Number),
                    timestamp: expect.any(Number),
                })
            ]));
        };
        server.on('connection', (ws: WebSocket) => {
            const tickerMessage = {
                "ch": `market.${symbol}.ticker`,
                "ts": 1630982370526,
                "tick": {
                  "open": 51732,
                  "high": 52785.64,
                  "low": 51000,
                  "close": 52735.63,
                  "amount": 13259.24137056181,
                  "vol": 687640987.4125315,
                  "count": 448737,
                  "bid": 52732.88,
                  "bidSize": 0.036,
                  "ask": 52732.89,
                  "askSize": 0.583653,
                  "lastPrice": 52735.63,
                  "lastSize": 0.03
                }
              };
            setTimeout(() => ws.send(JSON.stringify(tickerMessage)), 50);
        });
        await connector.connect(onMessage);
        await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should return serialized TopOfBook messages', async () => {
        const onMessage = (m: Serializable[]) => {
            logger.info('Received messages:', m);
            expect(m).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    symbol: expect.any(String),
                    connectorType: 'HTX',
                    event: SklEvent.TopOfBook,
                    timestamp: expect.any(Number),
                    askPrice: expect.any(Number),
                    askSize: expect.any(Number),
                    bidPrice: expect.any(Number),
                    bidSize: expect.any(Number),
                })
            ]));
        };
        server.on('connection', (ws: WebSocket) => {
            const topOfBookMessage = {
                "ch": `market.${symbol}.bbo`,
                "ts": 1630994555540,
                "tick": {
                  "seqId": 137005210233,
                  "ask": 52665.02,
                  "askSize": 1.502181,
                  "bid": 52665.01,
                  "bidSize": 0.178567,
                  "quoteTime": 1630994555539,
                  "symbol": symbol,
                }
            };
            setTimeout(() => ws.send(JSON.stringify(topOfBookMessage)), 50);
        });
        await connector.connect(onMessage);
        await new Promise(resolve => setTimeout(resolve, 100));
    });
});
