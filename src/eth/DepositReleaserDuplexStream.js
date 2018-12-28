const { Duplex } = require("stream")

class DepositReleaserDuplexStream extends Duplex {
  constructor({ contract, from }) {
    super({ objectMode: true })

    this.contract = contract
    this.from = from
  }

  async _write(repayment, encoding, callback) {
    const { address, amount, hash } = repayment

    try {
      const releaseTransaction = await this.contract.release(address, amount, { from: this.from, gas: 300000 })
      console.log(`${hash} released at ${releaseTransaction}`)

      this.push({
        address, amount, hash,
        status: 2
      })
    } catch (err) {
      console.error(err)
    }

    callback()
  }

  _read() {}
}

module.exports = DepositReleaserDuplexStream
