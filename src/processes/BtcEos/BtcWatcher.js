/*
  find all payments to specified address in bitcoin blocks that have specified number of confirmations
  ensure that every broadcasted payment have been saved to redis database
  can be launched multiple times from the genesis block to push non-existing transactions to database
  should ignore already existing transactions in database
 */

const redis = require("redis")
const config = require("../../config")
const blockExplorer = require('blockchain.info/blockexplorer').usingNetwork(3)
const PaymentsWatcherReadableStream = require("../../btc/PaymentsWatcherReadableStream")
const BtcCacheWritableStream = require("../../redis/BtcCacheWritableStream")

const redisClient = redis.createClient(config.redis)
const { startBlock, blockIntervalInSeconds, blockElapseInterval, paymentAddress } = config

const start = () => {
  (new PaymentsWatcherReadableStream({ startBlock, blockExplorer, blockIntervalInSeconds, blockElapseInterval })) // fetch all transactions from blocks using block explorer
    .pipe(new BtcCacheWritableStream({ redisClient, paymentAddress })) // filter transactions related to our address and save to redis database
}
start()
