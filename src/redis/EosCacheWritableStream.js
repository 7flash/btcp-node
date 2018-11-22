const { Writable } = require("stream")
const { promisify } = require("util")

class EosCacheWritableStream extends Writable {
  constructor({ redisClient }) {
    super({ objectMode: true })

    this.redisClient = redisClient

    this.rpush = promisify(this.redisClient.rpush).bind(this.redisClient)
    this.hmset = promisify(this.redisClient.hmset).bind(this.redisClient)
    this.hmget = promisify(this.redisClient.hmget).bind(this.redisClient)
  }

  async _write(repayment, encoding, callback) {
    const exists = await this.hmget(`repayments:${repayment.hash}`, 'hash')
    if (exists[0] == null) {
      await this.rpush(`repayments`, repayment.hash)
      await this.hmset(`repayments:${repayment.hash}`, repayment)
    }

    callback()
  }
}

module.exports = EosCacheWritableStream
