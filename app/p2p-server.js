const Websocket = require("ws");
const P2P_PORT = process.env.P2P_PORT || 5001;
const peers = process.env.PEERS ? process.env.PEERS.split(",") : [];
//set HTTP_PORT=3002 && set P2P_PORT=5002 && set PEERS=ws://localhost:5001 && npm run dev
const MESSAGE_TYPES = {
  chain: "CHAIN",
  transaction: "TRANSACTION",
  clear_transactions: "CLEAR_TRANSACTIONS",
};
class P2pServer {
  constructor(blockchain, transactionPool) {
    this.blockchain = blockchain;
    this.transactionPool = transactionPool;
    this.sockets = [];
  }

  listen() {
    const server = new Websocket.Server({ port: P2P_PORT });
    server.on("connection", (socket) => {
      console.log("here..");
      return this.connectSocket(socket);
    });
    this.connectToPeers();
  }
  connectToPeers() {
    peers.forEach((peer) => {
      const socket = new Websocket(peer);
      console.log("there...");
      socket.on("open", () => this.connectSocket(socket));
    });
  }
  connectSocket(socket) {
    this.sockets.push(socket);
    console.log("Socket connected");

    this.messageHandler(socket);
    this.sendChain(socket);
  }
  sendChain(socket) {
    socket.send(JSON.stringify(this.blockchain.chain));
  }
  messageHandler(socket) {
    socket.on("message", (message) => {
      const data = JSON.parse(message);
      switch (data.type) {
        case MESSAGE_TYPES.chain:
          this.blockchain.replaceChain(data.chain);
          break;
        case MESSAGE_TYPES.transaction:
          this.transactionPool.updateOrAddTransaction(data.transaction);
          break;
        case MESSAGE_TYPES.clear_transactions:
          this.transactionPool.clear();
          break;
      }
    });
  }
  syncChains() {
    this.sockets.forEach((socket) => {
      this.sockets.forEach((socket) => this.sendChain(socket));
    });
  }
  sendTransaction(socket, transaction) {
    socket.send(
      JSON.stringify({ type: MESSAGE_TYPES.transaction, transaction })
    );
  }

  broadcastTransaction(transaction) {
    this.sockets.forEach((socket) => this.sendTransaction(socket, transaction));
  }

  broadcastClearTransactions() {
    this.sockets.forEach((socket) =>
      socket.send(
        JSON.stringify({
          type: MESSAGE_TYPES.clear_transactions,
        })
      )
    );
  }
}

module.exports = P2pServer;
