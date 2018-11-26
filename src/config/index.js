const secrets = require("./secrets.js")

module.exports = {
  startBlock: 1444871,
  blockInterval: 200000,
  blockElapseInterval: 0,
  paymentAddress: 'mqtaf5jVoHDQ8zhhJ7bvQimBJh5Ty5J75Q',
  eosSettings: {
    activePrivateKey: secrets.eosPrivateKey,
    httpEndpoint: 'https://api.kylin-testnet.eospacex.com',
    startBlock: -3600
  },
  dfuseEndpoint: 'kylin.eos.dfuse.io',
  dfuseToken: secrets.dfuseToken,
  issuerAccount: 'sevenflash44',
  tokenAccount: 'sevenflash22',
  tokenSymbol: 'BTC',
  tokenDecimals: 8,
  redis: 'http://127.0.0.1:6379'
}
