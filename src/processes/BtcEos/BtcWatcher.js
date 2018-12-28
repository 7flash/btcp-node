/*
  find all payments to specified address in bitcoin blocks that have specified number of confirmations
  ensure that every broadcasted payment have been saved to redis database
  can be launched multiple times from the genesis block to push non-existing transactions to database
  should ignore already existing transactions in database
 */

const _ = require("highland")
const redis = require("redis")
const config = require("../../config")
const blockExplorer = require('blockchain.info/blockexplorer').usingNetwork(3)
const PaymentsWatcherReadableStream = require("../../btc/PaymentsWatcherReadableStream")
const PaymentsThroughStream = require("../../btc/PaymentsThroughStream")
const CacheWritableStream = require("../../redis/BtcCacheWritableStream")

const redisClient = redis.createClient(config.redis)
const { bitcoin: { startBlock, blockInterval, blockElapseInterval, paymentAddress } } = config

const collectionName = 'payments'

const start = () => {
  _(new PaymentsWatcherReadableStream({ startBlock, blockExplorer, blockInterval, blockElapseInterval })) // fetch all transactions from blocks using block explorer
    .through(PaymentsThroughStream(paymentAddress)) // filter transactions related to our address
    .pipe(new CacheWritableStream({ redisClient, collectionName })) // save to redis database
}
start()
