/*
  listen to transactions that returns tokens back to smart contract
  ensure that every transaction was indexed
  can be launched multiple times to push missing transactions to database
  should ignore already existing transactions
 */
const { JsonRpc } = require("eosjs")
const fetch = require("node-fetch")
const WebSocket = require("ws")
const redis = require("redis")
const config = require("../../config")
const RepaymentsWatcherReadableStream = require("../../eos/RepaymentsWatcherReadableStream")
const CacheWritableStream = require("../../redis/EosCacheWritableStream")

const { EoswsClient, createEoswsSocket, InboundMessageType } = require("@dfuse/eosws-js")

const { dfuseEndpoint, dfuseToken, tokenAccount, bitcoin: { tokenSymbol }, eosSettings: { startBlock, httpEndpoint } } = config

const rpc = new JsonRpc(httpEndpoint, { fetch })

const redisClient = redis.createClient(config.redis)

const dfuseClient = new EoswsClient(
  createEoswsSocket(() => new WebSocket(`wss://${dfuseEndpoint}/v1/stream?token=${dfuseToken}`, { origin: "https://kylin.eos.dfuse.io" }))
)

const collectionName = 'repayments'

const start = () => {
  dfuseClient.connect().then(() => {
    (new RepaymentsWatcherReadableStream({ dfuseClient, tokenAccount, tokenSymbol, startBlock, rpc })) // listen to transactions to smart contract with third-party service
      .pipe(new CacheWritableStream({ redisClient, collectionName })) // save transactions to redis database
  }).catch((err) => {
    console.error(err)
  })
}
start()

