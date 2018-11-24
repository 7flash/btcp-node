const { Readable } = require("stream")

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

class TransactionsStream extends Readable {
  constructor({ startBlock, blockExplorer, blockInterval, blockElapseInterval }) {
    super({ objectMode: true })

    this.startBlock = startBlock
    this.blockExplorer = blockExplorer
    this.blockInterval = blockInterval
    this.blockElapseInterval = blockElapseInterval

    this.start()
  }

  async start() {
    let currentBlock = this.startBlock

    while (true) {
      try {
        await this.loadTransactions(currentBlock)
        currentBlock = currentBlock + 1
      } catch (e) {
        console.log(`block #${currentBlock} not found, waiting...`)
        await this.waitForBlock(currentBlock)
      }
    }
  }

  async loadTransactions (blockNumber) {
    const result = await this.blockExplorer.getBlockHeight(blockNumber)
    const transactions = result.blocks[0].tx

    for (const transaction of transactions) {
      this.push(transaction)
    }

    console.log(`block #${blockNumber} found, ${transactions.length} transactions consumed`)
  }

  async waitForBlock(blockNumber) {
    await sleep(this.blockInterval)

    const latestBlock = (await this.blockExplorer.getLatestBlock()).height
    if (blockNumber > latestBlock) {
      await this.waitForBlock(blockNumber)
    }
  }

  _read() {}
}


module.exports = TransactionsStream
