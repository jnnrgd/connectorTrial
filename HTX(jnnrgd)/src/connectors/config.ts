import * as dotenv from 'dotenv';

dotenv.config();

export const config = {
    Exchange: 'htx',
    SignatureMethod: 'Ed25519',
    SignatureVersion: 2.1,
    MaxCreateBatchSize: 10,
    MaxDeleteBatchSize: 50,
    RateLimit: 50,
    WaitTime: 2000,
    WsAddress: process.env.HtxWsAddress || 'api.huobi.pro',
    WsPublicPath: process.env.HtxPublicPath || '/ws',
    WsPrivatePath: process.env.HtxPrivatePath || '/ws/v2',
    RestAddress: process.env.HtxRestAddress || 'api.huobi.pro',
    AccessKey: process.env.HtxAccessKey || '',
    PrivateKey: process.env.HtxPrivateKey || '',
};