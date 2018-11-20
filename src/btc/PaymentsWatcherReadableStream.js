const { Readable } = require("stream")

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

class TransactionsStream extends Readable {
  constructor({ startBlock, blockExplorer, blockIntervalInSeconds, blockElapseInterval }) {
    super({ objectMode: true })

    this.startBlock = startBlock
    this.blockExplorer = blockExplorer
    this.blockIntervalInSeconds = blockIntervalInSeconds
    this.blockElapseInterval = blockElapseInterval

    this.start()
  }

  async start() {
    let currentBlock = this.startBlock
    let latestBlock = await this.blockExplorer.getLatestBlock() - this.blockElapseInterval

    while (true) {
      try {
        await this.loadTransactions(currentBlock)

        currentBlock++
        if (currentBlock > latestBlock) {
          await this.waitForBlock(currentBlock)
        }
      } catch (e) {
        console.log('service is unavailable, wait for 60 seconds')
        await sleep(60000)
      }
    }
  }

  async loadTransactions (blockNumber) {
    const result = await this.blockExplorer.getBlockHeight(blockNumber)
    const transactions = result.blocks[0].tx

    for (const transaction of transactions) {
      this.push(transaction)
    }

    console.log(`block ${blockNumber} done\r\n`)
  }

  async waitForBlock(blockNumber) {
    await sleep(this.blockIntervalInSeconds * 1000)

    const latestBlock = await this.blockExplorer.getLatestBlock()
    if (blockNumber > latestBlock) {
      await this.waitForBlock(blockNumber)
    }
  }

  _read() {}

  _destroy() {}
}


module.exports = TransactionsStream
