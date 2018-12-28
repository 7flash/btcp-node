const fetch = require("node-fetch")
const WebSocket = require("ws")
const redis = require("redis")
const { JsonRpc } = require("eosjs")
const { EoswsClient, createEoswsSocket, InboundMessageType } = require("@dfuse/eosws-js")

const RepaymentsWatcherReadableStream = require("../../eos/RepaymentsWatcherReadableStream")
const CacheWritableStream = require("../../redis/CacheWritableStream")

const config = require("../../config")

const {
  redis: redisConfig,
  bitcoin: { tokenSymbol },
  eosSettings: { startBlock, httpEndpoint },
  dfuseEndpoint, dfuseToken, tokenAccount
} = config

const rpc = new JsonRpc(httpEndpoint, { fetch })

const redisClient = redis.createClient(redisConfig)

const dfuseClient = new EoswsClient(
  createEoswsSocket(() => new WebSocket(`wss://${dfuseEndpoint}/v1/stream?token=${dfuseToken}`))
)

const collectionName = 'ethRepayments'

const start = async () => {
  await dfuseClient.connect()

  await new Promise(resolve => {
    (new RepaymentsWatcherReadableStream({ dfuseClient, tokenAccount, tokenSymbol, startBlock, rpc }))
      .pipe(new CacheWritableStream({ redisClient, collectionName }))

    resolve()
  })
}
start()
