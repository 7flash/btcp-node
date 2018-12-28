const _ = require("highland")
const redis = require("redis")
const Web3Wallet = require("web3-wallet")

const { TextDecoder, TextEncoder } = require("text-encoding")
const {
  Api,
  JsonRpc,
  JsSignatureProvider
} = require("eosjs")
const fetch = require("node-fetch")

const ethContractABI = require("../../eth/abi")
const config = require("../../config")


const {
  redis: redisConfig,
  ethereum: {
    tokenSymbol,
    tokenDecimals,
    blockInterval,
    relayerPrivateKey,
    relayerAddress: from,
    repaymentsCollection: collectionName,
    rpcProvider: ethRpcProvider,
    pegAddress: ethContractAddress
  },
  eosSettings: { httpEndpoint, activePrivateKey },
  issuerAccount, tokenAccount
} = config

const redisClient = redis.createClient(redisConfig)

const signatureProvider = new JsSignatureProvider([activePrivateKey])
const eosRpcProvider = new JsonRpc(httpEndpoint, { fetch })
const eosApiProvider = new Api({
  signatureProvider,
  rpc: eosRpcProvider,
  textDecoder: new TextDecoder(),
  textEncoder: new TextEncoder()
})

const wallet = Web3Wallet.wallet.fromPrivateKey(relayerPrivateKey)
const web3 = Web3Wallet.create(wallet, ethRpcProvider)
const contract = web3.eth.loadContract(ethContractABI, ethContractAddress)

const CacheReadableStream = require("../../redis/CacheReadableStream")
const DepositReleaserDuplexStream = require("../../eth/DepositReleaserDuplexStream")
const TokensBurnerDuplexStream = require("../../eos/TokensBurnerDuplexStream")
const UpdateStatusWritableStream = require("../../redis/UpdateStatusWritableStream")

const start = () => {
  const repayments = _(new CacheReadableStream({
    redisClient, blockInterval, collectionName
  }))

  const release = repayments
    .pipe(new DepositReleaserDuplexStream({ contract, from }))

  const burn = _(release).fork()
    .pipe(new TokensBurnerDuplexStream({
      api: eosApiProvider,
      rpc: eosRpcProvider,
      issuerAccount, tokenAccount, tokenSymbol, tokenDecimals
    }))

  const update = _(release).fork()
    .pipe(new UpdateStatusWritableStream({ redisClient, collectionName }))
}
start()
