const { BigNumber } = require("bignumber.js")
const bitcoin = require("bitcoinjs-lib")
const { paymentAddress: from } = require("../config")
const bitpay = 'https://test-insight.bitpay.com/api/addr'

const fetchUnspents = (address) =>
  request.get(`${bitpay}/${address}/utxo`)

const broadcastTx = (txRaw) =>
  request.post(`${bitpay}/tx/send`, {
    body: {
      rawtx: txRaw,
    },
  })

const sendPayment = async ({ btcAddress, amount }) => {
  const tx = new bitcoin.TransactionBuilder()
  const unspents = await fetchUnspents(from)

  const fundValue     = new BigNumber(String(amount)).multipliedBy(1e8).integerValue().toNumber()
  const totalUnspent  = unspents.reduce((summ, { satoshis }) => summ + satoshis, 0)
  const skipValue     = totalUnspent - fundValue - feeValue

  unspents.forEach(({ txid, vout }) => tx.addInput(txid, vout, 0xfffffffe))
  tx.addOutput(to, fundValue)

  tx.inputs.forEach((input, index) => {
    tx.sign(index, keyPair)
  })

  const txRaw = tx.buildIncomplete()

  await broadcastTx(txRaw.toHex())
}

module.exports = { sendPayment }
