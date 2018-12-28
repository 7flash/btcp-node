const secrets = require("./secrets.js")

module.exports = {
  issuerAccount: 'sevenflash44', // Account that allowed to mint and burn EOS tokens
  tokenAccount: 'sevenflash22', // Account of EOS smart contract
  dfuseEndpoint: 'kylin.eos.dfuse.io',
  redis: 'http://127.0.0.1:6379',
  dfuseToken: secrets.dfuseToken,
  bitcoin: {
    privateKey: secrets.btcPrivateKey, // Private key from wallet that holds funds
    tokenSymbol: 'BTC', // Token symbol equals scope of contract that contains balances and accounts
    tokenDecimals: 8, // 1 BTC = 10^8 satoshi
    startBlock: 1445375, // BtcWatcher will start to process transactions from this block
    blockInterval: 200000, // Time in milliseconds between bitcoin blocks
    blockElapseInterval: 0, // How many confirmations watcher will wait before add transaction to execution queue
    paymentAddress: 'mqtaf5jVoHDQ8zhhJ7bvQimBJh5Ty5J75Q', // Bitcoin wallet that holds frozen funds
  },
  ethereum: {
    rpcProvider: 'https://ropsten.infura.io/v3/${secrets.infuraKey}',
    pegAddress: '0x05F4505CfA43Af9A1E0894356cF7c89a791aC138',
    startBlock: 0,
    blockInterval: 10000, // Time in milliseconds between bitcoin blocks
    tokenSymbol: 'ETH', // EOS token
    tokenDecimals: 18,
    relayerAddress: '0xE7b757Fec7189768F0ff1dAFa0eA75a94bd0Dc22',
    relayerPrivateKey: secrets.ethPrivateKey,
    paymentsCollection: 'ethPayments',
    repaymentsCollection: 'ethRepayments'
  },
  eosSettings: {
    activePrivateKey: secrets.eosPrivateKey,
    httpEndpoint: 'http://kylin.fn.eosbixin.com',
    startBlock: 21958561
  },
}
