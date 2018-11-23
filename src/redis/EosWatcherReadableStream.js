const { Readable } = require("stream")
const { promisify } = require("util")

const { sleep } = require("../helpers")

class EosWatcherReadableStream extends Readable {
  constructor({ redisClient, updateInterval }) {
    super({ objectMode: true })

    this.redisClient = redisClient
    this.updateInterval = updateInterval
    this.lastRepaymentIndex = 0

    this.lindex = promisify(this.redisClient.lindex).bind(this.redisClient)
    this.hgetall = promisify(this.redisClient.hgetall).bind(this.redisClient)

    this.startWatching()
  }

  async startWatching() {
    while (true) {
      const nextRepayment = await this.fetchNextRepayment()
      if (nextRepayment) {
        this.lastRepaymentIndex++
        if (nextRepayment.status !== "2") {
          this.push(nextRepayment)
        }
      } else {
        await sleep(this.updateInterval)
      }
    }
  }

  async fetchNextRepayment() {
    const repaymentHash = await this.lindex(`repayments`, this.lastRepaymentIndex)
    if (repaymentHash) {
      const repaymentData = await this.hgetall(`repayments:${repaymentHash}`)
      return repaymentData
    } else {
      return null
    }
  }

  _read() {}
}

module.exports = EosWatcherReadableStream
