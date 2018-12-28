const _ = require("highland")
const Web3Wallet = require("web3-wallet");
const redis = require("redis")
const config = require("../../config")

const PaymentsWatcherReadableStream = require("../../eth/PaymentsWatcherReadableStream")
const EventsThroughStream = require("../../eth/EventsThroughStream")
const CacheWritableStream = require("../../redis/CacheWritableStream")
const pegABI = require("../../eth/abi.json")

const { rpcProvider, pegAddress, startBlock: fromBlock } = config.ethereum

const web3 = Web3Wallet.create(null, rpcProvider)

const ethereumContract = web3.eth.loadContract(pegABI, pegAddress)

const event = ethereumContract.Deposit

const redisClient = redis.createClient(config.redis)

const collectionName = 'ethPayments'

const start = () => {
  _(new PaymentsWatcherReadableStream({ web3, event, fromBlock }))
    .through(EventsThroughStream)
    .pipe(new CacheWritableStream({ redisClient, collectionName }))
}

start()
