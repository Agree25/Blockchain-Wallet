const Blockchain = require("../blockchain");
const Wallet = require("../wallet");
const Transaction = require("../wallet/transaction");
const TransactionPool = require("../wallet/transaction-pool");
const { INITIAL_BALANCE } = require("../config");

let sender, recipient, chain, pool;
beforeEach(() => {
  sender = new Wallet();
  recipient = new Wallet();
  chain = new Blockchain();
  pool = new TransactionPool();
});

test.each([-10, 0, 0.5, NaN, Infinity, "10", null, undefined, Number.MAX_SAFE_INTEGER + 1])(
  "rejects invalid amount %p without changing the pool", (amount) => {
    expect(() => sender.createTransaction(recipient.publicKey, amount, chain, pool)).toThrow(RangeError);
    expect(pool.transactions).toEqual([]);
  }
);

test("rejects invalid recipients and overspending", () => {
  expect(() => sender.createTransaction("not-a-key", 10, chain, pool)).toThrow(TypeError);
  expect(() => sender.createTransaction(recipient.publicKey, INITIAL_BALANCE + 1, chain, pool)).toThrow(RangeError);
  expect(pool.transactions).toEqual([]);
});

test("creates a signed transfer conserving the sender balance", () => {
  const tx = sender.createTransaction(recipient.publicKey, 10, chain, pool);
  expect(tx.outputs).toEqual([
    { address: sender.publicKey, amount: INITIAL_BALANCE - 10 },
    { address: recipient.publicKey, amount: 10 },
  ]);
  expect(Transaction.isValid(tx)).toBe(true);
  expect(pool.validTransactions()).toEqual([tx]);
});

test("can spend the full balance and retain a zero change output", () => {
  const tx = sender.createTransaction(recipient.publicKey, INITIAL_BALANCE, chain, pool);
  expect(tx.outputs[0].amount).toBe(0);
  expect(Transaction.isValid(tx)).toBe(true);
});

test("invalid updates leave an existing pending transaction unchanged", () => {
  const tx = sender.createTransaction(recipient.publicKey, 10, chain, pool);
  const snapshot = JSON.stringify(tx);
  for (const amount of [-10, 0, INITIAL_BALANCE]) {
    expect(() => sender.createTransaction(recipient.publicKey, amount, chain, pool)).toThrow(RangeError);
    expect(JSON.stringify(tx)).toBe(snapshot);
  }
});

test("combines pending transfers without overspending", () => {
  const tx = sender.createTransaction(recipient.publicKey, 10, chain, pool);
  expect(sender.createTransaction(recipient.publicKey, 20, chain, pool)).toBe(tx);
  expect(tx.outputs[0].amount).toBe(INITIAL_BALANCE - 30);
  expect(pool.transactions).toHaveLength(1);
  expect(Transaction.isValid(tx)).toBe(true);
});

test("rejects correctly signed negative outputs even when their sum matches the input", () => {
  const tx = Transaction.transactionWithOutputs(sender, [
    { address: sender.publicKey, amount: INITIAL_BALANCE + 10 },
    { address: recipient.publicKey, amount: -10 },
  ]);
  expect(Transaction.verifyTransaction(tx)).toBe(true);
  expect(pool.updateOrAddTransaction(tx)).toBe(false);
  pool.transactions = [tx];
  expect(pool.validTransactions()).toEqual([]);
});

test("rejects tampered and malformed transactions without throwing", () => {
  const tx = sender.createTransaction(recipient.publicKey, 10, chain, pool);
  tx.outputs[1].amount = 11;
  expect(pool.validTransactions()).toEqual([]);
  for (const invalid of [null, {}, { id: "x", input: {}, outputs: [null, {}] }]) {
    expect(pool.updateOrAddTransaction(invalid)).toBe(false);
  }
});

test("balance calculations are repeatable and handle transfers sharing a timestamp", () => {
  const first = Transaction.newTransaction(sender, recipient.publicKey, 10);
  const second = Transaction.newTransaction(new Wallet(), recipient.publicKey, 20);
  second.input.timestamp = first.input.timestamp;
  // Balance calculation is independent of mining, which has separate consensus tests.
  chain.chain.push({ data: [first, second, "arbitrary mined data"] });
  expect(recipient.calculateBalance(chain)).toBe(INITIAL_BALANCE + 30);
  recipient.balance = recipient.calculateBalance(chain);
  expect(recipient.calculateBalance(chain)).toBe(INITIAL_BALANCE + 30);
  expect(sender.calculateBalance(chain)).toBe(INITIAL_BALANCE - 10);
});

test("balance calculation ignores malformed signed outputs", () => {
  const malformed = Transaction.transactionWithOutputs(sender, [null]);
  chain.chain.push({ data: [malformed] });
  expect(() => recipient.calculateBalance(chain)).not.toThrow();
  expect(recipient.calculateBalance(chain)).toBe(INITIAL_BALANCE);
});

test("mining rewards are counted once across repeated balance calculations", () => {
  const { MINING_REWARD } = require("../config");
  const reward = Transaction.rewardTransaction(recipient, Wallet.blockchainWallet());
  chain.chain.push({ data: [reward] });
  recipient.balance = recipient.calculateBalance(chain);
  expect(recipient.balance).toBe(INITIAL_BALANCE + MINING_REWARD);
  expect(recipient.calculateBalance(chain)).toBe(INITIAL_BALANCE + MINING_REWARD);
});
