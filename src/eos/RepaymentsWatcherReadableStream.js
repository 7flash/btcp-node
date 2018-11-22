const { Readable } = require("stream")

class RepaymentsWatcherReadableStream extends Readable {
  constructor({ dfuseClient }) {
    super({ objectMode: true })

    this.dfuseClient = dfuseClient

    this.users = []

    this.listenSignups()
    this.listenPayments()
  }

  listenSignups() {
    this.dfuseClient
      .getActionTraces({ account: "pegtoken", action_name: "signup" })
      .onMessage((message) => {
        if (message.type === "action_trace") {
          const { internalAddress, externalAddress } = message.data.trace.act.data

          this.users[internalAddress] = externalAddress
        }
      })

    /*
    this.dfuseClient
      .getTableRows({ code: 'pegtoken', scope: 'BTC', table: 'users' })
      .onMessage((message) => {
        if (message.type === "table_delta" || message.type === "table_snapshot") {
        }
      })
    */
  }

  findExternalAddress(internalAddress) {
    return this.users[internalAddress]
  }

  listenPayments() {
    this.dfuseClient
      .getActionTraces({ account: "pegtoken", action_name: "transfer" })
      .onMessage((message) => {
        if (message.type === "action_trace") {
          const { from, to, quantity, memo } = message.data.trace.act.data
          const hash = message.data.trace.trx_id

          if (to == 'pegtoken') {
            const btcAddress = this.findExternalAddress(from)
            const quantityBits = Number.parseInt(quantity.replace('.', ''))
            const repayment = {
              btcAddress: btcAddress,
              amount: quantityBits,
              status: 1,
              hash: hash
            }

            this.push(repayment)
          }
        }
      })
  }

  _read() {}
}


module.exports = RepaymentsWatcherReadableStream
