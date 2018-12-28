const fetch = require("node-fetch")
const WebSocket = require("ws")
const redis = require("redis")
const { JsonRpc } = require("eosjs")
const { EoswsClient, createEoswsSocket } = require("@dfuse/eosws-js")

const RepaymentsWatcherReadableStream = require("../../eos/RepaymentsWatcherReadableStream")
const CacheWritableStream = require("../../redis/CacheWritableStream")

const config = require("../../config")

const {
  redis: redisConfig,
  ethereum: { tokenSymbol, eosStartBlock: startBlock },
  eosSettings: { httpEndpoint },
  dfuseEndpoint, dfuseToken, tokenAccount
} = config

const rpc = new JsonRpc(httpEndpoint, { fetch })

const redisClient = redis.createClient(redisConfig)

const dfuseClient = new EoswsClient(
  createEoswsSocket(() => new WebSocket(`wss://${dfuseEndpoint}/v1/stream?token=${dfuseToken}`, { origin: "https://kylin.eos.dfuse.io" }))
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
