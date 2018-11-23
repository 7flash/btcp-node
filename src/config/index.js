const secrets = require("./secrets.js")

module.exports = {
  startBlock: 1444868,
  blockIntervalInSeconds: 200,
  blockElapseInterval: 0,
  paymentAddress: 'mqtaf5jVoHDQ8zhhJ7bvQimBJh5Ty5J75Q',
  eosSettings: {
    activePrivateKey: secrets.eosPrivateKey,
    httpEndpoint: 'http://127.0.0.1:8888'
  },
  dfuseEndpoint: 'kylin.eos.dfuse.io',
  dfuseToken: secrets.dfuseToken,
  issueAccountName: "sevenflash44",
  redis: 'http://127.0.0.1:6379'
}
