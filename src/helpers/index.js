const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const btc = require('./btc')
const transactions = require('./transactions')

module.exports = {
  ...transactions,
  ...btc,
  sleep
}
