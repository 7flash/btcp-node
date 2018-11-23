const secrets = require("./secrets.js")

module.exports = {
  startBlock: 1,
  blockIntervalInSeconds: 600,
  blockElapseInterval: 1,
  paymentAddress: '',
  eosSettings: {
    activePrivateKey: secrets.eosPrivateKey,
    httpEndpoint: 'http://127.0.0.1:8888'
  },
  dfuseEndpoint: 'kylin.eos.dfuse.io',
  dfuseToken: secrets.dfuseToken,
  issueAccountName: "sevenflash44"
}
