const Blockchain = require("../blockchain");
const Block = require("../blockchain/block");
const { MINE_RATE } = require("../config");

function solve(block) {
  do {
    block.hash = Block.blockHash(block);
    if (block.hash.startsWith("0".repeat(block.difficulty))) return block;
    block.nonce++;
  } while (true);
}

function nextBlock(previous, data = []) {
  const timestamp = previous.timestamp + MINE_RATE + 1;
  return solve(new Block(timestamp, previous.hash, "", data, 0,
    Block.adjustDifficulty(previous, timestamp)));
}

test("accepts a valid mined chain and adopts it on a peer", () => {
  const source = new Blockchain();
  source.addBlock([{ id: "transfer", amount: 10 }]);
  const destination = new Blockchain();
  expect(destination.replaceChain(source.chain)).toBe(true);
  expect(destination.chain).toEqual(source.chain);
});

test("rejects a self-consistent hash that does not meet proof of work", () => {
  const chain = new Blockchain();
  const block = nextBlock(chain.chain[0]);
  do {
    block.nonce++;
    block.hash = Block.blockHash(block);
  } while (block.hash.startsWith("0".repeat(block.difficulty)));
  expect(chain.isValidChain([...chain.chain, block])).toBe(false);
  expect(chain.replaceChain([...chain.chain, block])).toBe(false);
  expect(chain.chain).toHaveLength(1);
});

test("rejects a peer that lowers the required mining difficulty", () => {
  const chain = new Blockchain();
  const block = nextBlock(chain.chain[0]);
  block.difficulty = 1;
  solve(block);
  expect(chain.isValidChain([...chain.chain, block])).toBe(false);
});

test("detects changes inside object transaction data", () => {
  const chain = new Blockchain();
  const block = nextBlock(chain.chain[0], [{ outputs: [{ amount: 10 }] }]);
  expect(chain.isValidChain([...chain.chain, block])).toBe(true);
  block.data[0].outputs[0].amount = 1000;
  expect(chain.isValidChain([...chain.chain, block])).toBe(false);
});

test.each([null, {}, [], [null], [Block.genesis(), null]])("rejects malformed chains %p", (value) => {
  expect(new Blockchain().isValidChain(value)).toBe(false);
});

test.each([0, -1, 1.5, 65, NaN])("rejects invalid difficulty %p", (difficulty) => {
  const chain = new Blockchain();
  const block = nextBlock(chain.chain[0]);
  block.difficulty = difficulty;
  expect(chain.isValidChain([...chain.chain, block])).toBe(false);
});

test("difficulty never falls below one and timestamps must increase", () => {
  expect(Block.adjustDifficulty({ difficulty: 1, timestamp: 1 }, MINE_RATE + 2)).toBe(1);
  const chain = new Blockchain();
  const block = nextBlock(chain.chain[0]);
  block.timestamp = chain.chain[0].timestamp;
  solve(block);
  expect(chain.isValidChain([...chain.chain, block])).toBe(false);
});
