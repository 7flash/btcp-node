const { Writable } = require("stream")

class CoinsReleaserWritableStream extends Writable {
  constructor({ sendPayment }) {
    super({ objectMode: true })

    this.sendPayment = sendPayment
  }

  async _write(repayment, encoding, callback) {
    try {
      const {btcAddress, amount} = repayment

      const result = await this.sendPayment({btcAddress, amount})

      console.log(JSON.stringify(result))
    } catch (e) {
      console.error(e)
    }
    callback()
  }

  _read() {}
}

module.exports = CoinsReleaserWritableStream
