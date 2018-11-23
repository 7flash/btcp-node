const { Duplex } = require("stream")

class TokensBurnerDuplexStream extends Duplex {
  constructor({ api, rpc, issuerAccountName }) {
    super({ objectMode: true })

    this.api = api
    this.rpc = rpc
    this.issuerAccountName = issuerAccountName
    this.decimals = 4
  }

  async _write(repayment, encoding, callback) {
    const users = await this.rpc.get_table_rows({ code: 'pegtoken', scope: 'TOK', table: 'users' })
    const userID = users.rows.find((user) => user.externalAccount == repayment.btcAddress).userID
    const quantity = Number.parseFloat(repayment.amount / 10**this.decimals).toPrecision(this.decimals + 1)
    const actions = {
      actions: [{
        account: 'pegtoken',
        name: 'burn',
        authorization: [{
          actor: this.issuerAccountName,
          permission: 'active'
        }],
        data: {
          userID: userID,
          quantity: `${quantity} TOK`,
          memo: ''
        }
      }]
    }
    await this.api.transact(actions)
    this.push({ hash: repayment.hash, status: 2 })
    callback()
  }

  _read() {}
}

module.exports = TokensBurnerDuplexStream
