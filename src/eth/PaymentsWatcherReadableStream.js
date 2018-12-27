const { Web3EventStream } = require('web3-stream')

class EventsStream extends Web3EventStream {
  constructor({ web3, event, fromBlock }) {
    super(web3, event, {}, { fromBlock })
  }
}

module.exports = EventsStream
