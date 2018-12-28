const expect = require("chai").expect
const _ = require("highland")
const redis = require("fakeredis")
const Web3Wallet = require("web3-wallet")

const PaymentsWatcherReadableStream = require("../src/eth/PaymentsWatcherReadableStream")
const CacheWritableStream = require("../src/redis/CacheWritableStream")
const EventsThroughStream = require("../src/eth/EventsThroughStream")

const rpcProvider = 'http://127.0.0.1:9545/'
const pegABI = require("../src/eth/abi.json")
const pegAddress = '0x6187e7d5E4D9FE6c120F1Cf24981d655DAFd19c7'

describe('EthWatcher', function() {
  this.timeout(300000)

  const user = '0xd2b8a69af63b582530a37341f4f8e547a1c00040'
  const userPrivateKey = 'a289ae9d1b8bf1b5ce0a0c931726442fab187bfd46920b0a80021f7ac4fc5c00'

  before(async () => {
    const wallet = Web3Wallet.wallet.fromPrivateKey(userPrivateKey)

    this.web3 = Web3Wallet.create(wallet, rpcProvider)

    this.peg = this.web3.eth.loadContract(pegABI, pegAddress)
  })

  describe('PaymentsWatcherReadableStream', () => {
    it('[e2e] should stream all deposits from ethereum contract', async () => {
      const amount = 1000

      const stream = _(new PaymentsWatcherReadableStream({
        web3: this.web3,
        event: this.peg.Deposit,
        fromBlock: 0
      }))

      await this.web3.eth.sendTransaction({ from: user, to: pegAddress, value: amount })

      await new Promise(resolve => {
        stream.pull((err, paymentEvent) => {
          expect(paymentEvent.args.user).to.be.equal(user)
          expect(paymentEvent.args.amount.toNumber()).to.be.equal(amount)
          resolve()
        })
      })
    })
  })

  describe('CacheWritableStream', () => {
    it('should save payment to database', async () => {
      const paymentEvent = {
        "logIndex": 0,
        "transactionIndex": 0,
        "transactionHash": "0xc5c565af38f8c8f3decb24d390d96f31d28206926f80523abb0598da1e93cbf9",
        "blockHash": "0x88c9ea183f0a49c192e0edf00d6da35dc5d9d2f9c51a961efac7b57cae89ec10",
        "blockNumber": 5,
        "address": "0x6187e7d5e4d9fe6c120f1cf24981d655dafd19c7",
        "type": "mined",
        "event": "Deposit",
        "args": {
          "user": "0x7f123f1b8ab851d6cd0b0a46cd25122fbf6c16d0",
          "amount": "1000"
        }
      }

      const redisClient = redis.createClient("ethereum")

      const stream = _([paymentEvent])
        .through(EventsThroughStream)
        .pipe(new CacheWritableStream({ redisClient, collectionName: 'ethPayments' }))

      await new Promise(resolve => {
        setTimeout(() => {
          redisClient.lrange('ethPayments', 0, 0, (err, result) => {
            const expectedHash = paymentEvent.transactionHash.slice(2)
            expect(result[0]).to.be.equal(expectedHash)
            redisClient.hgetall(`ethPayments:${expectedHash}`, (err, result) => {
              expect(result).to.be.deep.equal({
                address: paymentEvent.args.user,
                amount: paymentEvent.args.amount,
                hash: expectedHash,
                status: '1'
              })
              resolve()
            })
          })
        }, 100)
      })
    })
  })
})
