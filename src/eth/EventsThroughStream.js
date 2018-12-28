const _ = require("highland")

const EventsThroughStream = _.map((event) => {
  const hash = event.transactionHash.startsWith('0x') ?
    event.transactionHash.slice(2) :
    event.transactionHash

  return {
    hash: hash,
    address: event.args.user,
    amount: event.args.amount,
    status: 1
  }
})

module.exports = EventsThroughStream
