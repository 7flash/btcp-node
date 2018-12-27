const { Writable } = require("stream")
const { promisify } = require("util")

class EthCacheWritableStream extends Writable {
  constructor(redisClient) {
    super({ objectMode: true })

    this.redisClient = redisClient

    this.rpush = promisify(this.redisClient.rpush)
      .bind(this.redisClient)

    this.hmset = promisify(this.redisClient.hmset)
      .bind(this.redisClient)
  }

  async _write(paymentEvent, encoding, callback) {
    const hash = paymentEvent.transactionHash

    const payment = {
      ethAddress: paymentEvent.args.user,
      amount: paymentEvent.args.amount,
      hash: hash,
      status: 1
    }

    await this.rpush(`ethPayments`, hash)
    await this.hmset(`ethPayments:${hash}`, payment)

    console.log(`saved ETH payment`, payment)

    callback()
  }
}

module.exports = EthCacheWritableStream
