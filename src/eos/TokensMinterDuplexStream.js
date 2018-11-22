const { Duplex } = require("stream")

class TokensMinterDuplexStream extends Duplex {
  constructor({ api, rpc }) {
    super({ objectMode: true })

    this.api = api
    this.rpc = rpc
  }

  async _write(payment, encoding, callback) {
    const users = await this.rpc.get_table_rows({ code: 'pegtoken', scope: 'TOK', table: 'users' })
    const actions = {
      actions: [{
        account: 'pegtoken',
        name: 'issue',
        authorization: [{
          actor: 'userA',
          permission: 'active'
        }],
        data: {
          userID: '0',
          quantity: `${payment.amount} TOK`,
          memo: ''
        }
      }]
    }
    await this.api.transact(actions)
    this.push({ hash: payment.hash, status: 2 })
    callback()
  }

  _read() {}
}

module.exports = TokensMinterDuplexStream
