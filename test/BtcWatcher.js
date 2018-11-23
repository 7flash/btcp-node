const expect = require("chai").expect
const sinon = require("sinon")
const _ = require('highland')
const redis = require("fakeredis")
const { paymentFromTransaction } = require("../src/helpers")

const PaymentsWatcherReadableStream = require("../src/btc/PaymentsWatcherReadableStream")
const BtcCacheWritableStream = require("../src/redis/BtcCacheWritableStream")

const paymentTransaction = require('./mocks/paymentTransaction.json')
const anotherPaymentTransaction = { ...paymentTransaction }
const paymentAddress = paymentTransaction.out[0].addr

const paymentFromTransactionFormatted = (paymentTransaction, paymentAddress) => {
  const payment = paymentFromTransaction(paymentTransaction, paymentAddress)
  payment.amount = payment.amount.toString()
  payment.status = payment.status.toString()

  return payment
}

const blockExplorer = (() => {
  const getLatestBlockStub = sinon.stub()
  getLatestBlockStub.returns({ height: 2 })

  const getBlockHeightStub = sinon.stub()
  getBlockHeightStub.withArgs(1).resolves({ blocks: [{ tx: [paymentTransaction] }]})
  getBlockHeightStub.withArgs(2).resolves({ blocks: [{ tx: [anotherPaymentTransaction] }]})

  const blockExplorer = {
    getBlockHeight: getBlockHeightStub,
    getLatestBlock: getLatestBlockStub
  }

  return blockExplorer
})()

describe('BtcWatcher', function() {
  this.timeout(60000)
  // todo: check btcwatcher flow calls

  describe('PaymentsWatcherReadableStream', () => {
    it('should stream all transactions from bitcoin blocks', (done) => {
      const stream = _(new PaymentsWatcherReadableStream({
        startBlock: 1,
        blockExplorer,
        blockIntervalInSeconds: 1,
        blockElapseInterval: 0
      }))

      stream.pull((err, payment) => {
        expect(payment).to.be.deep.equal(paymentTransaction)
        stream.pull((err, payment) => {
          expect(payment).to.be.deep.equal(anotherPaymentTransaction)
          done()
        })
      })
    })
  })

  describe('BtcCacheWritableStream', () => {
    it('should save payment transaction to database', (done) => {
      const expectedPayment = paymentFromTransactionFormatted(paymentTransaction, paymentAddress)
      const redisClient = redis.createClient("bitcoin")
      const stream = _([paymentTransaction]).pipe(new BtcCacheWritableStream({
        redisClient, paymentAddress
      }))

      setTimeout(() => {
        redisClient.lrange('payments', 0, 0, (err, result) => {
          expect(result[0]).to.be.equal(paymentTransaction.hash)
          redisClient.hgetall(`payments:${paymentTransaction.hash}`, (err, result) => {
            expect(result).to.be.deep.equal(expectedPayment)
            done()
          })
        })
      }, 1000)
    })
  })

  after(() => {
    process.exit()
  })
})
