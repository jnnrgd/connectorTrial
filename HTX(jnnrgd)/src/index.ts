import * as crypto from 'crypto';


// const { publicKey, privateKey: generatedPrivateKey } = crypto.generateKeyPairSync('ed25519');

// console.log('Generated Private Key:', generatedPrivateKey.export({ format: 'der', type: 'pkcs8' }).toString('hex'));
// console.log('Generated Public Key:', publicKey.export({ format: 'der', type: 'spki' }).toString('hex'));

// // const privateKey = crypto.createPrivateKey({
// //     key: Buffer.from(privateKeyHex, 'hex'),
// //     format: 'der',
// //     type: 'pkcs8'
// // });

// const message = 'Yourmessagehere';

// const sign = crypto.createSign('SHA256');
// sign.update(message);
// sign.end();

// const signature = sign.sign(generatedPrivateKey);
// const signatureBase64 = signature.toString('base64');

// console.log('Signature:', signatureBase64);

export function isHexString(value: any, length?: number | boolean): value is `0x${ string }` {
    if (typeof(value) !== "string" || !value.match(/^0x[0-9A-Fa-f]*$/)) {
        return false
    }

    if (typeof(length) === "number" && value.length !== 2 + 2 * length) { return false; }
    if (length === true && (value.length % 2) !== 0) { return false; }

    return true;
}

// export function hexlify(data: BytesLike): string {
//     const bytes = getBytes(data);

//     let result = "0x";
//     for (let i = 0; i < bytes.length; i++) {
//         const v = bytes[i];
//         result += HexCharacters[(v & 0xf0) >> 4] + HexCharacters[v & 0x0f];
//     }
//     return result;
// }

const pkHex = '';
const pkBase64 = ''
const pkPem = '';

console.log('creating PK from hex');
const key = crypto.createPrivateKey({
    key: Buffer.from(pkHex, 'hex'),
    format: 'der',
    type: 'pkcs8'
});

console.log('creating PK from base64');
const key2 = crypto.createPrivateKey({
    key: Buffer.from(pkBase64, 'base64'),
    format: 'der',
    type: 'pkcs8'
});

console.log('creating PK from pem');
const key3 = crypto.createPrivateKey(pkPem);

console.log('exporting');

const exported = key.export({ format: 'der', type: 'pkcs8' }).toString('hex');
const exported2 = key2.export({ format: 'der', type: 'pkcs8' }).toString('hex');
const exported3 = key3.export({ format: 'der', type: 'pkcs8' }).toString('hex');

const pubKey = crypto.createPublicKey(key);

const pubExported = pubKey.export({ format: 'der', type: 'spki'}).toString('base64');

console.log('exported PK from hex:', exported);
console.log('exported PK from base64:', exported2);
console.log('exported PK from pem:', exported3);

console.log('exported public key:', pubExported);