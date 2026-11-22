const Transaction = require("../wallet/transaction");

class TransactionPool {
  constructor() {
    this.transactions = [];
  }

  updateOrAddTransaction(transaction) {
    if (!Transaction.isValid(transaction)) return false;
    let transactionWithId = this.transactions.find(
      (t) => t.id === transaction.id
    );

    if (transactionWithId) {
      this.transactions[this.transactions.indexOf(transactionWithId)] =
        transaction;
    } else {
      this.transactions.push(transaction);
    }
    return true;
  }

  existingTransaction(address) {
    return this.transactions.find((t) => t.input.address === address);
  }

  validTransactions() {
    return this.transactions.filter(Transaction.isValid);
  }

  clear() {
    this.transactions = [];
  }
}

module.exports = TransactionPool;
