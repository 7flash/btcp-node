const chai = require("chai")
chai.use(require("sinon-chai"))
const sinon = require("sinon")
const expect = chai.expect
const _ = require("highland")
const redis = require("fakeredis")

const EosWatcherReadableStream = require('../src/redis/EosWatcherReadableStream')
const CoinsReleaserWritableStream = require('../src/btc/CoinsReleaserWritableStream')
const TokensBurnerWritableStream = require('../src/eos/TokensBurnerDuplexStream')
const EosUpdateStatusWritableStream = require('../src/redis/EosUpdateStatusWritableStream')

describe('EosExecutor', function() {
  this.timeout(40000)

  const repayment = {
    btcAddress: "14xdPidvcTWhNEF4uNpYtdQFALALNdDVWD",
    amount: "10000",
    status: "1",
    hash: 'txid'
  }
  const repaymentExecuted = {
    btcAddress: "15xdPidvcTWhNEF4uNpYtdQFALALNdDVWD",
    amount: "10000",
    status: "1",
    hash: 'txid2'
  }

  let redisClient

  before((done) => {
    redisClient = redis.createClient("bitcoin")
    const pushRepayment = (repayment) => {
      return new Promise((resolve) => {
        redisClient.rpush('repayments', repayment.hash, (err, result) => {
          redisClient.hmset(`repayments:${repayment.hash}`, repayment, (err, result) => {
            resolve()
          })
        })
      })
    }
    pushRepayment(repayment).then(() => {
    }).then(() => {
      done()
    })
  })

  describe('EosWatcherReadableStream', () => {
    it('should fetch non executed repayments from database', (done) => {
      const stream = _(new EosWatcherReadableStream({ redisClient, updateInterval:5000 }))

      stream.pull((err, result) => {
        expect(result).to.be.deep.equal(repayment)
        done()
      })
    })
  })

  describe('CoinsReleaserWritableStream', () => {
    it('should release bitcoins to user', () => {
      const { btcAddress, amount } = repayment
      const sendPayment = sinon.spy(() => Promise.resolve(true))
      const stream = _([repayment]).pipe(new CoinsReleaserWritableStream({ sendPayment }))
      expect(sendPayment).to.have.been.calledWith({ btcAddress, amount })
    })
  })

  describe('TokensBurnerDuplexStream', () => {
    it('should burn token from user', (done) => {
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
      const issuerAccountName = 'userA'
      const expectedActions = {
        actions: [{
          account: 'pegtoken',
          name: 'burn',
          authorization: [{
            actor: issuerAccountName,
            permission: 'active'
          }],
          data: {
            userID: 0,
            quantity: '1.0000 TOK',
            memo: ''
          }
        }]
      }
      const stream = new TokensBurnerWritableStream({ api, rpc, issuerAccountName })
      stream.write(repayment, 'utf8', () => {
        expect(api.transact).to.have.been.calledWith(expectedActions)
        expect(rpc.get_table_rows).to.have.been.calledWith({ code: 'pegtoken', scope: 'TOK', table: 'users' })
        const result = stream.read()
        expect(result).to.be.deep.equal({ hash: repayment.hash, status: 2 })
        done()
      })
    })
  })

  describe('EosUpdateStatusWritableStream', () => {
    it('should update status of processed transaction', () => {
      const stream = new EosUpdateStatusWritableStream({ redisClient })
      stream.write({ hash: repayment.hash, status: 2 }, 'utf8', () => {
        redisClient.hmget(`repayments:${repayment.hash}`, 'status', (err, status) => {
          expect(status).to.be.equal(2)
        })
      })
    })
  })
})
