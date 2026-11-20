const { EventEmitter } = require("events");
const Blockchain = require("../blockchain");
const P2pServer = require("../app/p2p-server");

function socketPair() {
  const first = new EventEmitter();
  const second = new EventEmitter();
  first.send = jest.fn((message) => second.emit("message", Buffer.from(message)));
  second.send = jest.fn((message) => first.emit("message", Buffer.from(message)));
  return [first, second];
}

function createPeer() {
  const blockchain = new Blockchain();
  const pool = { updateOrAddTransaction: jest.fn(), clear: jest.fn() };
  return { blockchain, pool, server: new P2pServer(blockchain, pool) };
}

test("a newly connected peer receives and adopts a longer valid chain", () => {
  const source = createPeer();
  const destination = createPeer();
  source.blockchain.addBlock(["peer update"]);
  const [outgoing, incoming] = socketPair();
  destination.server.messageHandler(incoming);

  source.server.connectSocket(outgoing);

  expect(destination.blockchain.chain).toEqual(source.blockchain.chain);
  expect(destination.blockchain.chain).toHaveLength(2);
});

test("receiving a longer invalid chain preserves the local chain", () => {
  const source = createPeer();
  const destination = createPeer();
  source.blockchain.addBlock(["peer update"]);
  source.blockchain.chain[1].hash = "tampered";
  const [outgoing, incoming] = socketPair();
  destination.server.messageHandler(incoming);

  source.server.connectSocket(outgoing);

  expect(destination.blockchain.chain).toHaveLength(1);
});

test("a chain update reaches each of three peers exactly once", () => {
  const source = createPeer();
  const peers = Array.from({ length: 3 }, () => ({ send: jest.fn() }));
  source.server.sockets = peers;

  source.server.syncChains();

  peers.forEach((peer) => {
    expect(peer.send).toHaveBeenCalledTimes(1);
    expect(JSON.parse(peer.send.mock.calls[0][0])).toEqual({
      type: "CHAIN",
      chain: source.blockchain.chain,
    });
  });
});

test("transaction and clear messages reach the destination pool", () => {
  const source = createPeer();
  const destination = createPeer();
  const [outgoing, incoming] = socketPair();
  destination.server.messageHandler(incoming);
  source.server.sockets = [outgoing];
  const transaction = { id: "example-transaction", outputs: [] };

  source.server.broadcastTransaction(transaction);
  source.server.broadcastClearTransactions();

  expect(destination.pool.updateOrAddTransaction).toHaveBeenCalledWith(transaction);
  expect(destination.pool.clear).toHaveBeenCalledTimes(1);
});
