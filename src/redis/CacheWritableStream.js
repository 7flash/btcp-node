const { Writable } = require("stream")
const { promisify } = require("util")

class CacheWritableStream extends Writable {
  constructor({ redisClient, collectionName }) {
    super({ objectMode: true })

    this.redisClient = redisClient
    this.collectionName = collectionName

    this.hmget = promisify(this.redisClient.hmget).bind(this.redisClient)
    this.rpush = promisify(this.redisClient.rpush).bind(this.redisClient)
    this.hmset = promisify(this.redisClient.hmset).bind(this.redisClient)
  }

  async _write(transaction, encoding, callback) {
    const { address, amount, hash } = transaction

    const existingHash = await this.hmget(`${this.collectionName}:${hash}`, 'hash')

    if (existingHash[0] == null) {
      await this.rpush(this.collectionName, hash)

      await this.hmset(`${this.collectionName}:${hash}`, {
        hash,
        address,
        amount,
        status: 1,
      })

      console.log(`${hash} saved to redis`)
    } else {
      console.log(`${hash} already exists in redis, skip`)
    }

    callback()
  }
}

module.exports = CacheWritableStream
