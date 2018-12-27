const senderFromTransaction = (transaction) =>
  transaction.inputs[0].prev_out.addr

const amountFromTransaction = (transaction, paymentAddress) =>
  transaction.out.find((output) => output.addr === paymentAddress).value

const hashFromTransaction = (transaction) => transaction.hash

const paymentFromTransaction = (transaction, paymentAddress) => ({
  address: senderFromTransaction(transaction),
  amount: amountFromTransaction(transaction, paymentAddress),
  hash: hashFromTransaction(transaction),
  status: 1
})

const isValidPaymentTransaction = (transaction, paymentAddress) =>
  transaction.out.map((output) => output.addr).indexOf(paymentAddress) > -1 &&
    transaction.inputs[0].prev_out.addr !== paymentAddress

module.exports = {
  senderFromTransaction,
  amountFromTransaction,
  hashFromTransaction,
  paymentFromTransaction,
  isValidPaymentTransaction,
}
