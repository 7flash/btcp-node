const { BigNumber } = require("bignumber.js")
const bitcoin = require("bitcoinjs-lib")
const { paymentAddress: from, btcPrivateKey, paymentAddress } = require("../config")
const request = require("request")

const bitpay = 'https://test-insight.bitpay.com/api'

const fetchUnspents = (address) => {
  return new Promise((resolve, reject) => {
    request.get({ url: `${bitpay}/addr/${address}/utxo`, json: true }, (error, response, body) => {
      if (error)
        return reject(error)

      return resolve(body)
    })
  })
}

const broadcastTx = (rawtx) => {
  return new Promise((resolve, reject) => {
    request.post({ url: `${bitpay}/tx/send`, form: { rawtx }}, (error, response, body) => {
      if (error)
        return reject(error)

      return resolve(body)
    })
  })
}

const sendPayment = async ({ btcAddress, amount }) => {
  const keyPair = bitcoin.ECPair.fromWIF(btcPrivateKey, bitcoin.networks.testnet)
  const tx = new bitcoin.TransactionBuilder(bitcoin.networks.testnet)
  const unspents = await fetchUnspents(from)

  const feeValue = 15000
  const fundValue     = Number.parseInt(amount)
  const totalUnspent  = unspents.reduce((summ, { satoshis }) => summ + satoshis, 0)
  const skipValue     = totalUnspent - fundValue - feeValue

  if (skipValue < 546) {
    throw new Error(`cannot send ${amount} to ${btcAddress}, not enough balance`)
  }

  unspents.forEach(({ txid, vout }) => tx.addInput(txid, vout, 0xfffffffe))
  tx.addOutput(paymentAddress, skipValue)
  tx.addOutput(btcAddress, fundValue)

  tx.inputs.forEach((input, index) => {
    tx.sign(index, keyPair)
  })

  const txRaw = tx.buildIncomplete()

  const result = await broadcastTx(txRaw.toHex())

  return result
}

module.exports = { sendPayment }
