const { Readable } = require("stream")

class RepaymentsWatcherReadableStream extends Readable {
  constructor({ dfuseClient, tokenAccount, tokenSymbol, startBlock, rpc }) {
    super({ objectMode: true })

    this.rpc = rpc
    this.dfuseClient = dfuseClient
    this.tokenAccount = tokenAccount
    this.tokenSymbol = tokenSymbol

    this.startBlock = startBlock
    this.users = {}

    this.listenRepayments()
  }

  async findExternalAccount(internalAccount) {
    const users = await this.rpc.get_table_rows({code: this.tokenAccount, scope: this.tokenSymbol, table: 'users', limit: 100})
    const foundUser = users.rows.find(user => user.internalAccount == internalAccount)

    if (foundUser && foundUser.externalAccount) {
      return foundUser.externalAccount
    } else {
      return null
    }
  }

  listenRepayments() {
    this.dfuseClient
      .getActionTraces({ account: this.tokenAccount, action_name: "transfer" }, { listen: true, start_block: this.startBlock })
      .onMessage(async (message) => {
        if (message.type === "error") {
          console.error(message)
        } else if (message.type === "listening") {
          console.log('transfer start listening...')
        } else if (message.type === "action_trace") {
          const { from, to, quantity, memo } = message.data.trace.act.data
          const hash = message.data.trace.trx_id

          console.log(`new action => ${hash}`)

          if (to !== this.tokenAccount)
            return

          if (quantity.indexOf(` ${this.tokenSymbol}`) < 0)
            return

          const address = await this.findExternalAccount(from)

          if (!address) {
            console.error(`${from} send a repayment, but has no account`)
            return
          }

          const quantityBits = Number.parseInt(quantity.replace('.', ''))

          const repayment = {
            address: address,
            amount: quantityBits,
            status: 1,
            hash: hash
          }

          this.push(repayment)
        }
      })
  }

  _read() {}
}


module.exports = RepaymentsWatcherReadableStream
