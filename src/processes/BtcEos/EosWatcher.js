/*
  listen to transactions that returns tokens back to smart contract
  ensure that every transaction was indexed
  can be launched multiple times to push missing transactions to database
  should ignore already existing transactions
 */

const redis = require("redis")
const config = require("../../config")
const RepaymentsWatcherReadableStream = require("../../eos/RepaymentsWatcherReadableStream")
const EosCacheWritableStream = require("../../redis/EosCacheWritableStream")
const { EoswsClient, createEoswsSocket, InboundMessageType } = require("@dfuse/eosws-js")

const { dfuseEndpoint, dfuseToken } = config

const redisClient = redis.createClient(config.redis)

const dfuseClient = new EoswsClient(
  createEoswsSocket(() => new WebSocket(`wss://${dfuseEndpoint}/v1/stream?token=${dfuseToken}`))
)

const start = () => {
  (new RepaymentsWatcherReadableStream({ dfuseClient })) // listen to transactions to smart contract with third-party service
    .pipe(new EosCacheWritableStream({ redisClient })) // save transactions to redis database
}
start()
