const redis = require("redis")
const fetch = require("node-fetch")
const { Api, JsonRpc, RpcError, JsSignatureProvider } = require("eosjs")
const { TextDecoder, TextEncoder } = require("text-encoding")

const EthWatcherReadableStream = require("../../redis/EthWatcherReadableStream")
const UpdateStatusWritableStream = require("../../redis/UpdateStatusWritableStream")
const TokensMinterDuplexStream = require("../../eos/TokensMinterDuplexStream")

const config = require("../../config")

const {
  redis: redisConfig,
  ethereum: { blockInterval, tokenSymbol, tokenDecimals },
  eosSettings, issuerAccount, tokenAccount,
} = config

const signatureProvider = new JsSignatureProvider([ eosSettings.activePrivateKey ])
const rpcProvider = new JsonRpc(eosSettings.httpEndpoint, { fetch })
const eosAPI = new Api({
  signatureProvider,
  rpc: rpcProvider,
  textDecoder: new TextDecoder(),
  textEncoder: new TextEncoder()
})

const redisClient = redis.createClient(redisConfig)

const collectionName = 'ethPayments'

const start = () => {
  (new EthWatcherReadableStream({ redisClient, blockInterval }))
    .pipe(new TokensMinterDuplexStream({
      api: eosAPI,
      rpc: rpcProvider,
      issuerAccount, tokenAccount, tokenSymbol, tokenDecimals
    }))
    .pipe(new UpdateStatusWritableStream({ redisClient, collectionName }))
}
start()
