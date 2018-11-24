const { Readable } = require("stream")
const { promisify } = require("util")

const { sleep } = require("../helpers")

class BtcWatcherReadableStream extends Readable {
  constructor({ redisClient, blockInterval }) {
    super({ objectMode: true })

    this.redisClient = redisClient
    this.blockInterval = blockInterval
    this.paymentIndex = 0

    this.lindex = promisify(this.redisClient.lindex).bind(this.redisClient)
    this.hgetall = promisify(this.redisClient.hgetall).bind(this.redisClient)
  }

  async fetchNextPayment() {
    const paymentHash = await this.lindex('payments', this.paymentIndex)
    if (paymentHash) {
      this.paymentIndex++
      const payment = await this.hgetall(`payments:${paymentHash}`)
      return payment
    } else {
      await sleep(this.blockInterval)
      return this.fetchNextPayment()
    }
  }

  async _read() {
    const payment = await this.fetchNextPayment()
    if (payment.status == "1" || payment.status == "3") {
      this.push(payment)
    } else {
      // if payment.status == "2" it means that payment was processed already, we skip it and move forward
    }
  }
}

module.exports = BtcWatcherReadableStream
