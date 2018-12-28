const { Duplex } = require("stream")

class DepositReleaserDuplexStream extends Duplex {
  constructor({ contract, from }) {
    super({ objectMode: true })

    this.contract = contract
    this.from = from
  }

  async _write(repayment, encoding, callback) {
    const { address, amount } = repayment

    try {
      const releaseTransaction = await this.contract.release(address, amount, { from: this.from, gas: 300000 })
      console.log(`${repayment.hash} released at ${releaseTransaction}`)

      this.push(repayment)
    } catch (err) {
      console.error(err)
    }

    callback()
  }

  _read() {}
}

module.exports = DepositReleaserDuplexStream
