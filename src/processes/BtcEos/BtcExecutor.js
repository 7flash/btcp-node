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
const BtcWatcherReadableStream = require("../../redis/BtcWatcherReadableStream")
const TokensMinterDuplexStream = require("../../eos/TokensMinterDuplexStream")
const UpdateStatusWritableStream = require("../../redis/UpdateStatusWritableStream")

const redisClient = redis.createClient(config.redis)

const { blockInterval, eosSettings } = config

const signatureProvider = new JsSignatureProvider([eosSettings.activePrivateKey])
const rpc = new JsonRpc(eosSettings.httpEndpoint, { fetch })
const api = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() })

const start = () => {
  (new BtcWatcherReadableStream({ redisClient, blockInterval }))
    .pipe(new TokensMinterDuplexStream({ api, rpc }))
    .pipe(new UpdateStatusWritableStream({ redisClient }))
}
start()
