const chai = require("chai")
chai.use(require("sinon-chai"))
const sinon = require("sinon")
const expect = chai.expect
const _ = require("highland")
const redis = require("fakeredis")

const CacheReadableStream = require('../src/redis/CacheReadableStream')
const CoinsReleaserWritableStream = require('../src/btc/CoinsReleaserWritableStream')
const TokensBurnerWritableStream = require('../src/eos/TokensBurnerDuplexStream')
const UpdateStatusWritableStream = require('../src/redis/UpdateStatusWritableStream')

describe('EosExecutor', function() {
  this.timeout(40000)

  const repayment = {
    address: "14xdPidvcTWhNEF4uNpYtdQFALALNdDVWD",
    amount: "10000",
    status: "1",
    hash: 'txid'
  }
  const repaymentExecuted = {
    address: "15xdPidvcTWhNEF4uNpYtdQFALALNdDVWD",
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

  describe('CacheReadableStream', () => {
    it('should fetch non executed repayments from database', (done) => {
      const stream = _(new CacheReadableStream({ redisClient, updateInterval:5000, collectionName: 'repayments' }))

      stream.pull((err, result) => {
        expect(result).to.be.deep.equal(repayment)
        done()
      })
    })
  })

  describe('CoinsReleaserWritableStream', () => {
    it('should release bitcoins to user', () => {
      const { address, amount } = repayment
      const sendPayment = sinon.spy(() => Promise.resolve(true))
      const stream = _([repayment]).pipe(new CoinsReleaserWritableStream({ sendPayment }))
      expect(sendPayment).to.have.been.calledWith({ address, amount })
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
      const config = { tokenAccount: 'pegtoken', tokenSymbol: 'TOK', tokenDecimals: 8, issuerAccount: 'userA' }
      const expectedActions = {
        actions: [{
          account: 'pegtoken',
          name: 'burn',
          authorization: [{
            actor: config.issuerAccount,
            permission: 'active'
          }],
          data: {
            userID: 0,
            quantity: '0.00010000 TOK',
            memo: ''
          }
        }]
      }
      const stream = new TokensBurnerWritableStream({ api, rpc, ...config })
      stream.write(repayment, 'utf8', () => {
        expect(api.transact).to.have.been.calledWith(expectedActions)
        expect(rpc.get_table_rows).to.have.been.calledWith({ code: 'pegtoken', scope: 'TOK', table: 'users', limit: 100 })
        const result = stream.read()
        expect(result).to.be.deep.equal({ hash: repayment.hash, status: 2 })
        done()
      })
    })
  })

  describe('UpdateStatusWritableStream', () => {
    it('should update status of processed transaction', () => {
      const collectionName = 'repayments'
      const stream = new UpdateStatusWritableStream({ redisClient, collectionName })
      stream.write({ hash: repayment.hash, status: 2 }, 'utf8', () => {
        redisClient.hmget(`repayments:${repayment.hash}`, 'status', (err, status) => {
          expect(status).to.be.equal(2)
        })
      })
    })
  })
})
