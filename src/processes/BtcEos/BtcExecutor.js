/*
  listen to new btc transactions saved in database, validate addresses for kyc, and mint eos peg tokens
  checkout whether old transactions was processed, and push old ones in prioritized order
  keeps track of transactions status
 */

const { Api, JsonRpc, RpcError, JsSignatureProvider } = require("eosjs")
const { TextDecoder, TextEncoder } = require("text-encoding")
const fetch = require("node-fetch")
const redis = require("redis")
const config = require("../../config")
const CacheReadableStream = require("../../redis/CacheReadableStream")
const TokensMinterDuplexStream = require("../../eos/TokensMinterDuplexStream")
const UpdateStatusWritableStream = require("../../redis/UpdateStatusWritableStream")

const redisClient = redis.createClient(config.redis)

const { bitcoin: { blockInterval, tokenSymbol, tokenDecimals }, eosSettings, issuerAccount, tokenAccount } = config

const signatureProvider = new JsSignatureProvider([eosSettings.activePrivateKey])
const rpc = new JsonRpc(eosSettings.httpEndpoint, { fetch })
const api = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() })

const collectionName = 'payments'

const start = () => {
  (new CacheReadableStream({ redisClient, blockInterval, collectionName }))
    .pipe(new TokensMinterDuplexStream({ api, rpc, issuerAccount, tokenAccount, tokenSymbol, tokenDecimals }))
    .pipe(new UpdateStatusWritableStream({ redisClient, collectionName }))
}
start()
