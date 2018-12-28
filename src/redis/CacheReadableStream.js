const { Readable } = require("stream")
const { promisify } = require("util")

const { sleep, status } = require("../helpers")

class CacheReadableStream extends Readable {
  constructor({ redisClient, blockInterval, collectionName }) {
    super({ objectMode: true })

    this.redisClient = redisClient
    this.blockInterval = blockInterval
    this.collectionName = collectionName
    this.paymentIndex = 0

    this.lindex = promisify(this.redisClient.lindex).bind(this.redisClient)
    this.hgetall = promisify(this.redisClient.hgetall).bind(this.redisClient)

    this.watch()
  }

  increasePaymentIndex() {
    this.paymentIndex++
  }

  async sleepUntilNextBlock() {
    await sleep(this.blockInterval)
  }

  async fetchCurrentPayment() {
    const transactionHash = await this.lindex(this.collectionName, this.paymentIndex)

    return transactionHash ?
      this.hgetall(`${this.collectionName}:${transactionHash}`) :
      null
  }

  async watch() {
    while (true) {
      const payment = await this.fetchCurrentPayment()

      if (payment) {
        this.increasePaymentIndex()
        if (parseInt(payment.status) == status.CREATED) {
          this.push(payment)
        }
      } else {
        await sleepUntilNextBlock()
      }
    }
  }

  _read() {}
}

module.exports = CacheReadableStream
