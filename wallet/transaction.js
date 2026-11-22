const ChainUtil = require("../chain-util");
const {MINING_REWARD}= require("../config")
class Transaction {
  constructor() {
    this.id = ChainUtil.id();
    this.input = null;
    this.outputs = [];
  }
  update(senderWallet, recipient, amount) {
    Transaction.validateTransfer(recipient, amount);
    const senderOutput = this.outputs.find(
      (output) => output.address === senderWallet.publicKey
    );

    if (!senderOutput || amount > senderOutput.amount) {
      throw new RangeError("Amount exceeds available balance.");
    }

    senderOutput.amount = senderOutput.amount - amount;
    this.outputs.push({ amount, address: recipient });
    Transaction.signTransaction(this, senderWallet);

    return this;
  }
  static transactionWithOutputs(senderWallet, outputs) {
    const transaction = new this();
    transaction.outputs.push(...outputs);
    Transaction.signTransaction(transaction, senderWallet);
    return transaction;
  }

  static newTransaction(senderWallet, recipient, amount) {
    Transaction.validateTransfer(recipient, amount);
    if (amount > senderWallet.balance) {
      throw new RangeError("Amount exceeds available balance.");
    }

    return Transaction.transactionWithOutputs(senderWallet, [
      {
        amount: senderWallet.balance - amount,
        address: senderWallet.publicKey,
      },
      { amount, address: recipient },
    ]);
  }

  static rewardTransaction(minerWallet, blockchainWallet) {
    return Transaction.transactionWithOutputs(blockchainWallet, [
      {
        amount: MINING_REWARD,
        address: minerWallet.publicKey,
      },
    ]);
  }
  static signTransaction(transaction, senderWallet) {
    transaction.input = {
      timestamp: Date.now(),
      amount: senderWallet.balance,
      address: senderWallet.publicKey,
      signature: senderWallet.sign(ChainUtil.hash(transaction.outputs)),
    };
  }
  static verifyTransaction(transaction) {
    if (!transaction || !transaction.input || !Array.isArray(transaction.outputs)) return false;
    return ChainUtil.verifySignature(
      transaction.input.address,
      transaction.input.signature,
      ChainUtil.hash(transaction.outputs)
    );
  }

  static validateTransfer(recipient, amount) {
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw new RangeError("Amount must be a positive safe integer.");
    }
    if (!ChainUtil.isValidPublicKey(recipient)) {
      throw new TypeError("Recipient must be a valid wallet public key.");
    }
  }

  static isValid(transaction) {
    if (!transaction || typeof transaction.id !== "string" || !transaction.id ||
        !transaction.input || !Number.isSafeInteger(transaction.input.amount) ||
        transaction.input.amount <= 0 || !Number.isSafeInteger(transaction.input.timestamp) ||
        !Transaction.hasValidOutputs(transaction) || transaction.outputs.length < 2) return false;
    let total = 0;
    for (const output of transaction.outputs) {
      if (!output || !Number.isSafeInteger(output.amount) || output.amount < 0 ||
          !ChainUtil.isValidPublicKey(output.address)) return false;
      total += output.amount;
      if (!Number.isSafeInteger(total)) return false;
    }
    return total === transaction.input.amount && Transaction.verifyTransaction(transaction);
  }

  static hasValidOutputs(transaction) {
    return Array.isArray(transaction.outputs) && transaction.outputs.length > 0 &&
      transaction.outputs.every((output) => output && Number.isSafeInteger(output.amount) &&
        output.amount >= 0 && ChainUtil.isValidPublicKey(output.address));
  }
}

module.exports = Transaction;
