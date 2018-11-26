module.exports = {
  apps: [{
    name: 'BtcWatcher',
    script: './src/processes/BtcEos/BtcWatcher.js'
  }, {
    name: 'BtcExecutor',
    script: './src/processes/BtcEos/BtcExecutor.js'
  }, {
    name: 'EosWatcher',
    script: './src/processes/BtcEos/EosWatcher.js'
  }, {
    name: 'EosExecutor',
    script: './src/processes/BtcEos/EosExecutor.js'
  }]
}
