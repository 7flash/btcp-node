const expect = require("chai").expect

const paymentTx = require("./mocks/paymentTransaction")
const { paymentFromTransaction, isValidPaymentTransaction } = require("../src/helpers")

describe('Helpers', () => {
  it('paymentFromTransaction', () => {
    const expectedPayment = {
      address: "14xdPidvcTWhNEF4uNpYtdQFALALNdDVWD",
      amount: 8000000,
      hash: "3d0d36176372eef77cee8cce8ffc60c8318e0d4376a26c9098f1a174aca6a2a8",
      status: 1
    }
    const payment = paymentFromTransaction(paymentTx, "3Cyq57u7NfJDPas13789om7emCwKtFa81q")

    expect(payment).to.be.deep.equal(expectedPayment)
  })

  it('isValidPaymentTransaction', () => {
    const valid = isValidPaymentTransaction(paymentTx, "3Cyq57u7NfJDPas13789om7emCwKtFa81q")
    const invalid = isValidPaymentTransaction(paymentTx, "xxx")

    expect(valid).to.be.equal(true)
    expect(invalid).to.be.equal(false)
  })
})
