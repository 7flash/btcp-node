const status = {
  CREATED: 1,
  PROCESSED: 2,
  FAILED: 3
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const btc = require('./btc')
const transactions = require('./transactions')

module.exports = {
  ...transactions,
  ...btc,
  status,
  sleep
}
