const blockExplorer = require("blockchain.info/blockexplorer").usingNetwork(0)

blockExplorer.getTx('3d0d36176372eef77cee8cce8ffc60c8318e0d4376a26c9098f1a174aca6a2a8').then((tx) => {
  console.log(JSON.stringify(tx))
}).catch((err) => {
  console.error(err)
})
