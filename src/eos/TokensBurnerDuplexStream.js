const { Duplex } = require("stream")

class TokensBurnerDuplexStream extends Duplex {
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

  async _write(repayment, encoding, callback) {
    try {
      const users = await this.rpc.get_table_rows({code: this.tokenAccount, scope: this.tokenSymbol, table: 'users', limit: 100})
      const userID = users.rows.find((user) => user.externalAccount == repayment.btcAddress).userID
      const quantity = Number.parseFloat(repayment.amount / 10 ** this.tokenDecimals).toFixed(this.decimals)
      const actions = {
        actions: [{
          account: this.tokenAccount,
          name: 'burn',
          authorization: [{
            actor: this.issuerAccount,
            permission: 'active'
          }],
          data: {
            userID: userID,
            quantity: `${quantity} ${this.tokenSymbol}`,
            memo: ''
          }
        }]
      }
      await this.api.transact(actions, this.options)
      this.push({hash: repayment.hash, status: 2})
      console.log(`burned ${quantity} ${this.tokenSymbol} from user #${userID}`)
    } catch (e) {
      console.error(e)
    }

    callback()
  }

  _read() {}
}

module.exports = TokensBurnerDuplexStream
