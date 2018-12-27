const Web3Wallet = require("web3-wallet");
const redis = require("redis")
const config = require("../../config")

const PaymentsWatcherReadableStream = require("../../eth/PaymentsWatcherReadableStream")
const EthCacheWritableStream = require("../../redis/EthCacheWritableStream")
const pegABI = require("../../eth/abi.json")

const { rpcProvider, pegAddress, startBlock: fromBlock } = config.ethereum

const web3 = Web3Wallet.create(null, rpcProvider)

const ethereumContract = web3.eth.loadContract(pegABI, pegAddress)

const event = ethereumContract.Deposit

const redisClient = redis.createClient(config.redis)

const start = () => {
  (new PaymentsWatcherReadableStream({ web3, event, fromBlock }))
    .pipe(new EthCacheWritableStream(redisClient))
}

start()
