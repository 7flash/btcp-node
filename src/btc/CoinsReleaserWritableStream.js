const { Writable } = require("stream")

class CoinsReleaserWritableStream extends Writable {
  constructor({ sendPayment }) {
    super({ objectMode: true })

    this.sendPayment = sendPayment
  }

  async _write(repayment, encoding, callback) {
    const { btcAddress, amount } = repayment

    await this.sendPayment({ btcAddress, amount })

    callback()
  }

  _read() {}
}

module.exports = CoinsReleaserWritableStream
