const { Duplex } = require("stream")

class TokensMinterDuplexStream extends Duplex {
  constructor({ api, rpc, tokenAccount, tokenSymbol, tokenDecimals, issuerAccount }) {
    super({ objectMode: true })

    this.api = api
    this.rpc = rpc
    this.tokenAccount = tokenAccount
    this.tokenSymbol = tokenSymbol
    this.tokenDecimals = tokenDecimals
    this.issuerAccount = issuerAccount
    this.options = {
      blocksBehind: 3,
      expireSeconds: 30,
    }
  }

  async _write(payment, encoding, callback) {
    try {
      const users = await this.rpc.get_table_rows({code: this.tokenAccount, scope: this.tokenSymbol, table: 'users', limit: 100})
      const user = users.rows.find((user) => user.externalAccount == payment.btcAddress)
      if (!user) {
        throw new Error(`${payment.btcAddress} not registered`)
      }
      const quantity = Number.parseFloat(payment.amount / 10**this.tokenDecimals).toFixed(this.tokenDecimals)
      const actions = {
        actions: [{
          account: this.tokenAccount,
          name: 'issue',
          authorization: [{
            actor: this.issuerAccount,
            permission: 'active'
          }],
          data: {
            userID: user.userID,
            quantity: `${quantity} ${this.tokenSymbol}`,
            memo: ''
          }
        }]
      }
      await this.api.transact(actions, this.options)
      this.push({hash: payment.hash, status: 2})
      console.log(`minted ${quantity} ${this.tokenSymbol} for user #${user.userID}`)
    } catch (err) {
      console.error(err)
    }

    callback()
  }

  _read() {}
}

module.exports = TokensMinterDuplexStream
