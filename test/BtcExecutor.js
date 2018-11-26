const chai = require("chai")
chai.use(require("sinon-chai"))
const sinon = require("sinon")
const expect = chai.expect
const _ = require('highland')
const redis = require("fakeredis")
const { paymentFromTransaction } = require("../src/helpers")

const BtcWatcherReadableStream = require("../src/redis/BtcWatcherReadableStream")
const PaymentsValidatorTransformStream = require("../src/btc/PaymentsValidatorTransformStream")
const TokensMinterDuplexStream = require("../src/eos/TokensMinterDuplexStream")
const BtcUpdateStatusWritableStream = require("../src/redis/BtcUpdateStatusWritableStream")

describe('BtcExecutor', function() {
  this.timeout(50000)

  let redisClient;

  const payment = {
    btcAddress: "14xdPidvcTWhNEF4uNpYtdQFALALNdDVWD",
    amount: "8000000",
    hash: "3d0d36176372eef77cee8cce8ffc60c8318e0d4376a26c9098f1a174aca6a2a8",
    status: "1"
  }
  const anotherPayment = { ...payment, hash: payment.hash.replace('3', '4') }

  before((done) => {
    redisClient = redis.createClient("bitcoin")
    const pushPayment = (payment) => {
      return new Promise((resolve) => {
        redisClient.rpush('payments', payment.hash, (err, result) => {
          redisClient.hmset(`payments:${payment.hash}`, payment, (err, result) => {
            resolve()
          })
        })
      })
    }
    Promise.all([pushPayment(payment), pushPayment(anotherPayment)]).then(() => {
      done()
    })
  })

  describe('BtcWatcherReadableStream', () => {
    it('should fetch payments from database cache', (done) => {
      const stream = _(new BtcWatcherReadableStream({ redisClient, blockInterval: 1000 }))

      stream.pull((err, result) => {
        expect(result).to.be.deep.equal(payment)
        stream.pull((err, result) => {
          expect(result).to.be.deep.equal(anotherPayment)
          done()
        })
      })
    })
  })

  /*
  describe('PaymentsValidatorTransformStream', () => {
    it('should filter kyc-approved users', (done) => {
      const stream = new PaymentsValidatorTransformStream()

      stream.write(payment, 'utf8', () => {
        stream.write(anotherPayment, 'utf8', () => {
          stream.read((err, result) => {
            expect(result).to.be.deep.equal(payment)
            stream.pull((err, result) => {
              expect(result).to.be.deep.equal(anotherPayment)
              done()
            })
          })
        })
      })
    })
  })
  */

  describe('TokensMinterDuplexStream', () => {
    it('should mint eos tokens for sender of btc payment', (done) => {
      const usersTableMock = {
        rows: [{
          userID: 0,
          internalAccount: 'holder',
          externalAccount: '14xdPidvcTWhNEF4uNpYtdQFALALNdDVWD'
        }],
        more: false
      }
      const api = {
        transact: sinon.spy()
      }
      const rpc = {
        get_table_rows: sinon.spy(() => usersTableMock)
      }
      const config = { tokenAccount: 'pegtoken', tokenSymbol: 'TOK', tokenDecimals: 8, issuerAccount: 'userA' }
      const expectedActions = {
        actions: [{
          account: config.tokenAccount,
          name: 'issue',
          authorization: [{
            actor: config.issuerAccount,
            permission: 'active'
          }],
          data: {
            userID: 0,
            quantity: `0.08000000 ${config.tokenSymbol}`,
            memo: ''
          }
        }]
      }
      const stream = new TokensMinterDuplexStream({ api, rpc, ...config })
      stream.write(payment, 'utf8', () => {
        expect(api.transact).to.have.been.calledWith(expectedActions, { blocksBehind: 3, expireSeconds: 30 })
        expect(rpc.get_table_rows).to.have.been.calledWith({ code: 'pegtoken', scope: 'TOK', table: 'users', limit: 100 })
        const result = stream.read()
        expect(result).to.be.deep.equal({ hash: payment.hash, status: 2 })
        done()
      })
    })
  })

  describe('BtcUpdateStatusWritableStream', () => {
    it('should update status of processed transactions in database', (done) => {
      const stream = new BtcUpdateStatusWritableStream({ redisClient })
      stream.write({ hash: payment.hash, status: 2 }, 'utf8', () => {
        redisClient.hmget(`payments:${payment.hash}`, 'status', (err, status) => {
          expect(status[0]).to.be.equal('2')
          done()
        })
      })
    })
  })

  after(() => {
    process.exit()
  })
})
