module.exports = {
  apps: [{
    "name": "ethereum_EthWatcher",
    "script": "./src/processes/EthEos/EthWatcher.js",
    "log_date_format": "YYYY-MM-DD HH:mm Z"
  }, {
    "name": "ethereum_EthExecutor",
    "script": "./src/processes/EthEos/EthExecutor.js",
    "log_date_format" : "YYYY-MM-DD HH:mm Z"
  }, {
    "name": "ethereum_EosWatcher",
    "script": "./src/processes/EthEos/EosWatcher.js",
    "log_date_format" : "YYYY-MM-DD HH:mm Z"
  }, {
    "name": "ethereum_EosExecutor",
    "script": "./src/processes/EthEos/EosExecutor.js",
    "log_date_format" : "YYYY-MM-DD HH:mm Z"
  }]
}
