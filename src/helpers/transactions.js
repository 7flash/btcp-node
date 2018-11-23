const senderFromTransaction = (transaction) =>
  transaction.inputs[0].prev_out.addr

const amountFromTransaction = (transaction, paymentAddress) =>
  transaction.out.find((output) => output.addr === paymentAddress).value

const hashFromTransaction = (transaction) => transaction.hash

const paymentFromTransaction = (transaction, paymentAddress) => ({
  btcAddress: senderFromTransaction(transaction),
  amount: amountFromTransaction(transaction, paymentAddress),
  hash: hashFromTransaction(transaction),
  status: 1
})

const isValidPaymentTransaction = (transaction, paymentAddress) =>
  transaction.out.map((output) => output.addr).indexOf(paymentAddress) > -1

module.exports = {
  senderFromTransaction,
  amountFromTransaction,
  hashFromTransaction,
  paymentFromTransaction,
  isValidPaymentTransaction,
}
