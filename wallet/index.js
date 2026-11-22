const ChainUtil = require("../chain-util");
const Transaction = require("./transaction");
const { INITIAL_BALANCE } = require("../config");

class Wallet {
  constructor() {
    this.balance = INITIAL_BALANCE;
    this.keyPair = ChainUtil.genKeyPair();
    this.publicKey = this.keyPair.getPublic().encode("hex");
  }

  toString() {
    return `Wallet -
      publicKey: ${this.publicKey.toString()}
      balance  : ${this.balance}`;
  }

  sign(dataHash) {
    return this.keyPair.sign(dataHash);
  }

  createTransaction(recipient, amount, blockchain, transactionPool) {
    Transaction.validateTransfer(recipient, amount);
    this.balance = this.calculateBalance(blockchain);

    if (amount > this.balance) {
      throw new RangeError("Amount exceeds available balance.");
    }

    let transaction = transactionPool.existingTransaction(this.publicKey);

    if (transaction) {
      transaction = transaction.update(this, recipient, amount);
    } else {
      transaction = Transaction.newTransaction(this, recipient, amount);
      transactionPool.updateOrAddTransaction(transaction);
    }

    return transaction;
  }

  calculateBalance(blockchain) {
    // Derive from chain order on every call, including transactions with equal timestamps.
    let balance = INITIAL_BALANCE;
    for (const block of blockchain.chain) {
      for (const transaction of block.data) {
        if (!Transaction.verifyTransaction(transaction) || !Transaction.hasValidOutputs(transaction)) continue;
        const received = transaction.outputs
          .filter((output) => output.address === this.publicKey)
          .reduce((sum, output) => sum + output.amount, 0);
        balance = transaction.input.address === this.publicKey ? received : balance + received;
      }
    }
    return balance;
  }

  static blockchainWallet() {
    const blockchainWallet = new this();
    blockchainWallet.address = "blockchain-wallet";
    return blockchainWallet;
  }
}

module.exports = Wallet;
