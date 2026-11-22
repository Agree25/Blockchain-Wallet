# Blockchain Wallet

An educational blockchain backend built with **Node.js, Express, and WebSockets**. It combines proof-of-work blocks, signed wallet transactions, a pending-transaction pool, and communication between local peers.

## Features

- HTTP APIs for reading the chain, submitting transactions, and mining.
- Wallet key pairs and transaction signatures using elliptic-curve cryptography.
- A transaction pool and mining rewards.
- WebSocket messages for chains, transactions, and clearing mined transactions.

## Run locally

Use Node.js 22 and npm. From the repository root:

```sh
npm ci
npm start
```

The HTTP API listens on `http://localhost:3001`; the peer server uses port `5001`. Start a second peer in another terminal:

```sh
HTTP_PORT=3002 P2P_PORT=5002 PEERS=ws://localhost:5001 npm start
```

`PEERS` accepts comma-separated WebSocket URLs. The environment-variable example uses a POSIX shell.

## API

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/blocks` | Return the current chain. |
| POST | `/mine` | Mine a block with the request's `data` field. |
| GET | `/public-key` | Return this node's wallet public key. |
| POST | `/transact` | Submit `recipient` and `amount` to the pool. |
| GET | `/transactions` | Return pending transactions. |
| GET | `/mine-transactions` | Mine pending transactions and clear the pool. This changes state. |

```sh
curl http://localhost:3001/blocks
curl http://localhost:3002/public-key
```

Use the second node's public key as the recipient:

```sh
curl -L http://localhost:3001/transact -H 'Content-Type: application/json' -d '{"recipient":"REPLACE_WITH_SECOND_NODE_PUBLIC_KEY","amount":25}'
curl -L http://localhost:3001/mine-transactions
```

For wallet transactions, mine through `/mine-transactions`; arbitrary data accepted by `/mine` is not validated as a wallet transaction.

## Structure and tests

| Directory | Responsibility |
| --- | --- |
| `app/` | HTTP routes, peer communication, and mining coordination. |
| `blockchain/` | Block creation, proof of work, and chain validation. |
| `wallet/` | Wallets, signed transactions, and the transaction pool. |
| `tests/` | Regression checks for wallet transfers, chain validation, HTTP endpoints, and peer communication. |

Run `npm test`, or `npm run test:watch` for interactive development. GitHub Actions runs tests on pushes and pull requests. Regression tests cover positive integer amounts, invalid and signed negative transfers, insufficient funds, pending-transfer updates, balance recalculation, structured data integrity, proof of work, difficulty changes, and peer synchronization.

Transfers use positive safe integer units and valid wallet public keys. Invalid HTTP transfers return `400` without broadcasting or changing the pool. Chain validation verifies hashes, proof of work, difficulty and increasing timestamps. The structured hashing format changes the educational chain format; restart all local peers together when upgrading.

## Limitations

This learning project keeps state in memory. Keys, balances, and the chain are not persisted across restarts. Chain selection still uses length; complete ledger validation, mining-reward enforcement, replay/double-spend protection and network abuse controls remain incomplete. Arbitrary `/mine` payloads are not validated as wallet transactions. This implementation is unsuitable for handling real funds. Dependency modernization remains future work.
