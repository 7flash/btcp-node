const expect = require("chai").expect
const sinon = require("sinon")
const _ = require("highland")
const redis = require("fakeredis")

const RepaymentsWatcherReadableStream = require("../src/eos/RepaymentsWatcherReadableStream")
const CacheWritableStream = require("../src/redis/CacheWritableStream")

describe('EosWatcher', function() {
  this.timeout(55000)

  const repayment = {
    address: "14xdPidvcTWhNEF4uNpYtdQFALALNdDVWD",
    amount: 10000,
    status: 1,
    hash: 'txid'
  }

  describe('RepaymentsWatcherReadableStream', () => {
    it('should listen to repayment transactions', (done) => {
      const trace = (data) => ({
        type: "action_trace",
        data: {
          trace: {
            act: {
              data: {...data}
            },
            trx_id: 'txid'
          }
        }
      })
      const transfer = ({ from, to }) => trace({
        from: from,
        to: to,
        quantity: "1.0000 TOK",
        memo: ""
      })
      const signup = ({ internalAddress, externalAddress }) => trace({ internalAddress, externalAddress})

      const onMessage = (fn) => {
        fn(transfer({ from: "pegtoken", to: "holder" }))
        fn(transfer({ from: "holder", to: "pegtoken" }))
      }

      const dfuseClient = {
        getActionTraces: sinon.spy(() => ({ onMessage }))
      }

      const usersTableMock = {
        rows: [{
          userID: 0,
          internalAccount: 'holder',
          externalAccount: '14xdPidvcTWhNEF4uNpYtdQFALALNdDVWD'
        }],
        more: false
      }
      const rpc = {
        get_table_rows: sinon.spy(() => usersTableMock)
      }
      const config = { tokenAccount: 'pegtoken', tokenSymbol: 'TOK', startBlock: 0 }

      const stream = _(new RepaymentsWatcherReadableStream({ dfuseClient, rpc, ...config }))

      stream.pull((err, result) => {
        expect(result).to.be.deep.equal(repayment)
        done()
      })
    })
  })

  describe('EosCacheWritableStream', () => {
    it('should save repayment transactions to database', (done) => {
      const redisClient = redis.createClient("eos")
      const stream = new CacheWritableStream({ redisClient, collectionName: 'repayments' })

      const formatted = (obj) =>
        Object.assign(...Object.keys(obj).map(k => ({ [k]: obj[k].toString() })))

      stream.write(repayment, 'utf8', (err, result) => {
        redisClient.lrange('repayments', 0, 0, (err, result) => {
          expect(result[0]).to.be.equal(repayment.hash)
          redisClient.hgetall(`repayments:${repayment.hash}`, (err, result) => {
            expect(result).to.be.deep.equal(formatted(repayment))

            // check that stream ignores already saved transactions
            redisClient.hmset(`repayments:${repayment.hash}`, 'status', 2, (err, result) => {
              stream.write(repayment, 'utf8', (err, result) => {
                redisClient.hmget(`repayments:${repayment.hash}`, 'status', (err, result) => {
                  expect(result).to.be.deep.equal(['2'])
                  done()
                })
              })
            })
          })
        })
      })
    })
  })
})
