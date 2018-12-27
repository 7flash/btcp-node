/*
  listen to new transactions eos in database, validate transactions, and then release btc, and burn eos tokens
  keep track of statuses for transactions added before, and push non-processed broadcasted transactions again
 */

const { Api, JsonRpc, RpcError, JsSignatureProvider } = require("eosjs")
const { TextDecoder, TextEncoder } = require("text-encoding")
const fetch = require("node-fetch")
const redis = require("redis")
const config = require("../../config")
const { sendPayment } = require("../../helpers")

const EosWatcherReadableStream = require("../../redis/EosWatcherReadableStream")
const CoinsReleaserWritableStream = require("../../btc/CoinsReleaserWritableStream")
const TokensBurnerDuplexStream = require("../../eos/TokensBurnerDuplexStream")
const UpdateStatusWritableStream = require("../../redis/UpdateStatusWritableStream")

const redisClient = redis.createClient(config.redis)

const { blockInterval, issuerAccount, tokenAccount, tokenSymbol, tokenDecimals, eosSettings } = config
const updateInterval = blockInterval

const signatureProvider = new JsSignatureProvider([eosSettings.activePrivateKey])
const rpc = new JsonRpc(eosSettings.httpEndpoint, { fetch })
const api = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() })

// .fork guarantees that transaction B will be processed after transaction A
// it means coins for transaction B will be released only when coins from transaction A released and tokens burned
const _ = require("highland")

const collectionName = 'repayments'

const start = () => {
  // listen to new eos transactions saved in database, and also check previously rejected transactions
  const repayments = _(new EosWatcherReadableStream({ redisClient, updateInterval }))

  // send bitcoins to address associated with sender of tokens
  const release = repayments.fork()
    .pipe(new CoinsReleaserWritableStream({ sendPayment }))

  // burns eos tokens in contract when bitcoins was released (contract holds tokens until that moment)
  const burn = repayments.fork()
    .pipe(new TokensBurnerDuplexStream({ api, rpc, issuerAccount, tokenAccount, tokenSymbol, tokenDecimals }))
    .pipe(new UpdateStatusWritableStream({ redisClient, collectionName })) // updates status of processed transaction
}
start()
