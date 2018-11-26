const { Readable } = require("stream")

class RepaymentsWatcherReadableStream extends Readable {
  constructor({ dfuseClient, tokenAccount, tokenSymbol, startBlock, rpc }) {
    super({ objectMode: true })

    this.rpc = rpc
    this.dfuseClient = dfuseClient
    this.tokenAccount = tokenAccount
    this.tokenSymbol = tokenSymbol

    this.startBlock = startBlock
    this.users = []

    this.listen()
  }

  findExternalAddress(internalAddress) {
    return this.users[internalAddress]
  }

  async listen() {
    await this.fetchUsers()
    this.listenSignups()
    this.listenRepayments()
  }

  async fetchUsers() {
    const users = await this.rpc.get_table_rows({code: this.tokenAccount, scope: this.tokenSymbol, table: 'users', limit: 100})
    users.rows.forEach(({ internalAccount, externalAccount }) => {
      this.users[internalAccount] = externalAccount
    })
  }

  listenSignups() {
    this.dfuseClient
      .getActionTraces({ account: this.tokenAccount, action_name: "signup" }, { listen: true, start_block: this.startBlock })
      .onMessage((message) => {
        if (message.type === "error") {
          console.error(message)
        } else if (message.type === "listening") {
          console.log('signup start listening...')
        } else if (message.type === "action_trace") {
          const { internalAccount, externalAccount } = message.data.trace.act.data

          this.users[internalAccount] = externalAccount
        }
      })
  }

  listenRepayments() {
    this.dfuseClient
      .getActionTraces({ account: this.tokenAccount, action_name: "transfer" }, { listen: true, start_block: this.startBlock })
      .onMessage((message) => {
        if (message.type === "error") {
          console.error(message)
        } else if (message.type === "listening") {
          console.log('transfer start listening...')
        } else if (message.type === "action_trace") {
          const { from, to, quantity, memo } = message.data.trace.act.data
          const hash = message.data.trace.trx_id

          if (to == this.tokenAccount) {
            const btcAddress = this.findExternalAddress(from)

            if (btcAddress) {
              const quantityBits = Number.parseInt(quantity.replace('.', ''))
              const repayment = {
                btcAddress: btcAddress,
                amount: quantityBits,
                status: 1,
                hash: hash
              }

              this.push(repayment)
            } else {
              console.log(`${from} send a repayment, but not registered`)
            }
          }
        }
      })
  }

  _read() {}
}


module.exports = RepaymentsWatcherReadableStream
