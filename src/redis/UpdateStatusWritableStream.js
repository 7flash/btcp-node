const { Writable } = require("stream")
const { promisify } = require("util")

class UpdateStatusWritableStream extends Writable {
  constructor({ redisClient }) {
    super({ objectMode: true })

    this.redisClient = redisClient
    this.hmset = promisify(this.redisClient.hmset).bind(this.redisClient)
  }

  async _write(data, encoding, callback) {
    await this.hmset(`payments:${data.hash}`, 'status', data.status)
    callback()
  }
}

module.exports = UpdateStatusWritableStream
