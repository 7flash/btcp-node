const { Readable } = require("stream")
const { promisify } = require("util")

const { sleep } = require("../helpers")

class EthWatcherReadableStream extends Readable {
  constructor({ redisClient, blockInterval }) {
    super({ objectMode: true })

    this.redisClient = redisClient
    this.blockInterval = blockInterval
    this.fetchIndex = 0

    this.lindex = promisify(this.redisClient.lindex).bind(this.redisClient)
    this.hgetall = promisify(this.redisClient.hgetall).bind(this.redisClient)
  }

  async fetchPayment(paymentIndex) {
    const hash = await this.lindex('ethPayments', paymentIndex)

    if (hash) {
      return this.hgetall(`ethPayments:${hash}`)
    } else {
      return null
    }
  }

  async _read() {
    while(true) {
      const payment = await this.fetchPayment(this.fetchIndex)

      if (payment) {
        this.fetchIndex++

        if (parseInt(payment.status) == 1)
          this.push(payment)
      } else {
        await sleep(this.blockInterval)
      }
    }
  }
}

module.exports = EthWatcherReadableStream
