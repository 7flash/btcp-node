const _ = require("highland")
const { isValidPaymentTransaction, paymentFromTransaction } = require("../helpers")
const config = require("../config")

const PaymentsThroughStream = (paymentAddress) => _.pipeline(
  _.filter((transaction) => {
    return isValidPaymentTransaction(transaction, paymentAddress)
  }),
  _.map((transaction) => {
    return paymentFromTransaction(transaction, paymentAddress)
  })
)

module.exports = PaymentsThroughStream
