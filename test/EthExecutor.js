const chai = require("chai")
chai.use(require("sinon-chai"))
const sinon = require("sinon")
const expect = chai.expect
const _ = require("highland")
const redis = require("fakeredis")

const EthWatcherReadableStream = require("../src/redis/EthWatcherReadableStream")
const TokensMinterDuplexStream = require("../src/eos/TokensMinterDuplexStream")
const UpdateStatusWritableStream = require("../src/redis/UpdateStatusWritableStream")

describe('EthExecutor', function() {
  this.timeout(300000)

  describe('EthWatcherReadableStream', () => {
    it('should retrieve payments from redis', async () => {
      const payment = {
        address: '0x7f123f1b8ab851d6cd0b0a46cd25122fbf6c16d0',
        amount: '1000',
        hash: "c5c565af38f8c8f3decb24d390d96f31d28206926f80523abb0598da1e93cbf9",
        status: '1'
      }

      const redisClient = redis.createClient("ethereum")

      await new Promise(resolve => {
        redisClient.rpush('ethPayments', payment.hash, (err, result) => {
          redisClient.hmset(`ethPayments:${payment.hash}`, payment, (err, result) => {
            resolve()
          })
        })
      })

      const stream = _(new EthWatcherReadableStream({ redisClient, blockInterval: 100 }))

      await new Promise(resolve => {
        stream.pull((err, result) => {
          expect(result).to.be.deep.equal(payment)
          resolve()
        })
      })
    })
  })

  describe('TokensMinterDuplexStream', async () => {
    it('should mint peg tokens for new payments', async () => {
      const payment = {
        address: '0x7f123f1b8ab851d6cd0b0a46cd25122fbf6c16d0',
        amount: '1000',
        hash: "c5c565af38f8c8f3decb24d390d96f31d28206926f80523abb0598da1e93cbf9",
        status: '1'
      }

      const apiMock = {
        transact: sinon.spy()
      }

      const rpcMock = {
        get_table_rows: sinon.spy(() => ({
          rows: [{
            userID: 0,
            internalAccount: 'userAccount',
            externalAccount: '0x7f123f1b8ab851d6cd0b0a46cd25122fbf6c16d0'
          }]
        }))
      }

      const config = {
        tokenAccount: 'pegtoken',
        tokenSymbol: 'ETH',
        tokenDecimals: 18,
        issuerAccount: 'issuerAccount'
      }

      const stream = _([payment]).pipe(new TokensMinterDuplexStream({ api: apiMock, rpc: rpcMock, ...config }))

      await new Promise(resolve => {
        setTimeout(() => {
          const result = stream.read()
          expect(result).to.be.deep.equal({ hash: payment.hash, status: 2 })
          expect(apiMock.transact).to.have.been.calledWith({
            actions: [{
              account: config.tokenAccount,
              name: 'issue',
              authorization: [{
                actor: config.issuerAccount,
                permission: 'active'
              }],
              data: {
                userID: 0,
                quantity: '0.000000000000001000 ETH',
                memo: ''
              }
            }]
          })
          resolve()
        }, 100)
      })
    })
  })

  describe('UpdateStatusWritableStream', () => {
    it('should set status of executed requests', async () => {
      const redisClient = redis.createClient("ethereum")
      const collectionName = 'payments'
      const stream = _([{ hash: '0x123', status: 2 }]).pipe(new UpdateStatusWritableStream({ redisClient, collectionName }))

      await new Promise(resolve => {
        setTimeout(() => {
          redisClient.hgetall(`payments:0x123`, (err, result) => {
            expect(result.status).to.be.equal("2")
          })
          resolve()
        }, 100)
      })
    })
  })
})
