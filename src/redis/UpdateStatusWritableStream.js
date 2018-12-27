const { Writable } = require("stream")
const { promisify } = require("util")

class UpdateStatusWritableStream extends Writable {
  constructor({ redisClient, collectionName }) {
    super({ objectMode: true })

    this.collectionName = collectionName
    this.redisClient = redisClient
    this.hmset = promisify(this.redisClient.hmset).bind(this.redisClient)
  }

  async _write(data, encoding, callback) {
    const { hash, status } = data
    await this.hmset(`${this.collectionName}:${hash}`, 'status', status)
    callback()
  }
}

module.exports = UpdateStatusWritableStream
