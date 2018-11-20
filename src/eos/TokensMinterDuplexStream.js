const { Duplex } = require("stream")

class TokensMinterDuplexStream extends Duplex {
  constructor({ eosNode }) {
    super({ objectMode: true })

    this.eosNode = eosNode
  }

  async _write(payment, encoding, callback) {
    const actions = {
      actions: [{
        account: 'eosio.pegtoken',
        name: 'transferToBtcAccount',
        authorization: [{
          actor: 'userA',
          permission: 'active'
        }],
        data: {
          from: 'userA',
          to: payment.btcAddress,
          quantity: `${payment.amount} TOK`,
          memo: ''
        }
      }]
    }
    await this.eosNode.transact(actions)
    this.push({ hash: payment.hash, status: 2 })
    callback()
  }

  _read() {}
}

module.exports = TokensMinterDuplexStream
