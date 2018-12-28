const chai = require("chai")
chai.use(require("sinon-chai"))
const sinon = require("sinon")
const expect = chai.expect
const _ = require("highland")
const redis = require("fakeredis")
const Web3Wallet = require("web3-wallet")

const CacheReadableStream = require('../src/redis/CacheReadableStream')
const CoinsReleaserWritableStream = require('../src/btc/CoinsReleaserWritableStream')
const TokensBurnerWritableStream = require('../src/eos/TokensBurnerDuplexStream')
const UpdateStatusWritableStream = require('../src/redis/UpdateStatusWritableStream')
const DepositReleaserDuplexStream = require('../src/eth/DepositReleaserDuplexStream')

const ethRpcProvider = 'http://127.0.0.1:9545/'
const ethContractABI = require("../src/eth/abi.json")
const ethContractAddress = '0x6187e7d5E4D9FE6c120F1Cf24981d655DAFd19c7'

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
          expect(parseInt(status[0])).to.be.equal(2)
        })
      })
    })
  })

  describe('DepositReleaserDuplexStream', () => {
    it('[e2e] should release funds to user', async () => {
      const relayer = '0xc4d01132b087f9d3c0b2d75ff113806efd496743'
      const user = '0xd2b8a69af63b582530a37341f4f8e547a1c00040'
      const relayerPrivateKey = 'c145fb2e507b8b4607727b76de621433df6426839275d1fe19e2ed0f67e8dc30'

      const ethRepayment = {
        address: user,
        amount: '100',
        status: 1,
        hash: 'eos-transaction-hash'
      }
      const wallet = Web3Wallet.wallet.fromPrivateKey(relayerPrivateKey)
      const web3 = Web3Wallet.create(wallet, ethRpcProvider)
      const contract = web3.eth.loadContract(ethContractABI, ethContractAddress)

      const stream = _([ethRepayment]).pipe(new DepositReleaserDuplexStream({
        contract, from: relayer
      }))

      await new Promise(resolve => {
        setTimeout(async () => {
          const result = stream.read()

          expect(result).to.be.equal(ethRepayment)

          resolve()
        }, 1000)
      })
    })
  })
})
