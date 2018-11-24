const { Writable } = require("stream")
const { promisify } = require("util")

const { paymentFromTransaction, isValidPaymentTransaction } = require('../helpers')

class BtcCacheWritableStream extends Writable {
  constructor({ redisClient, paymentAddress }) {
    super({ objectMode: true })

    this.redisClient = redisClient
    this.paymentAddress = paymentAddress

    this.rpush = promisify(this.redisClient.rpush).bind(this.redisClient)
    this.hmset = promisify(this.redisClient.hmset).bind(this.redisClient)
  }

  async _write(transaction, encoding, callback) {
    if (!isValidPaymentTransaction(transaction, this.paymentAddress))
      return callback()

    const payment = paymentFromTransaction(transaction, this.paymentAddress)

    await this.rpush(`payments`, payment.hash)
    await this.hmset(`payments:${payment.hash}`, payment)

    console.log(`saved BTC payment, ${payment.btcAddress} sent ${payment.amount} at ${payment.hash}`)

    callback()
  }
}

module.exports = BtcCacheWritableStream
