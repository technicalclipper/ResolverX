# ResolverX: ETH ↔ TRON Cross-Chain Atomic Swap Marketplace

## 🌟 Overview

ResolverX enables secure, decentralized, and trustless cross-chain token swaps between Ethereum and TRON using Hashed Timelock Contracts (HTLCs). It features a unique resolver marketplace where anyone can provide liquidity and compete to fulfill swaps.

### 🔗 Deployed Contracts

- **Ethereum (Sepolia)**: `0x11442C4C44f8f0be027d13E21f969d7703Bd8400`
- **TRON (Nile)**: `TQU4VDENJFnnQcPUTXrzDn4E7SoMy98pkZ`

## 🏗 Architecture

### Core Components

1. **Smart Contracts**
   - HTLC contracts deployed on both chains
   - Timelock system for security
   - State management to prevent double-spending

2. **Backend Services**
   - Node.js + Express API
   - Relayer Bot (monitors chains for secret reveals)
   - PostgreSQL/MongoDB database
   - Swap and resolver tracking

3. **Frontend**
   - React-based UI
   - MetaMask (ETH) and TronLink (TRX) integration
   - Neo-brutalism design theme
   - Real-time swap status tracking

4. **Resolver System**
   - Plug-and-play resolver bot template
   - Competitive marketplace model
   - Customizable fees and liquidity

## 🔄 Swap Flow

### ETH → TRX Direction
1. User selects swap direction and resolver
2. Backend generates secret (s) and hashlock (H)
3. User locks ETH using H
4. Resolver locks TRX using same H
5. User claims TRX with secret s
6. Resolver claims ETH using revealed s

### TRX → ETH Direction
1. User selects TRX → ETH swap
2. Backend generates secret/hashlock
3. User locks TRX
4. Resolver locks ETH
5. User claims ETH
6. Resolver claims TRX

## 🤖 Running a Resolver Bot

1. Fork the [resolver-bot-template](https://github.com/technicalclipper/ResolverX/tree/swap2/resolver-bot-template)
2. Configure environment variables:
   ```env
   ETH_PRIVATE_KEY=
   TRON_PRIVATE_KEY=
   ETH_RPC_URL=
   TRON_RPC_URL=
   ```
3. Deploy your bot
4. Register via UI with:
   - Bot endpoint URL
   - Supported directions
   - Fee percentage
   - Liquidity amounts

## 📊 Database Schema

### Swap Model
- id: Unique identifier
- direction: 'eth→trx' or 'trx→eth'
- hashlock: Hash of secret
- secret: Revealed during claim
- user_address: User's wallet
- resolver_id: Selected resolver
- status: initiated/locked/claimed/refunded
- eth_lock_tx: Ethereum transaction hash
- tron_lock_tx: TRON transaction hash
- timestamps: created/expires/completed

### Resolver Model
- id: Unique identifier
- endpoint: Bot API URL
- supportedPairs: ['eth→trx', 'trx→eth']
- liquidity: ETH/TRX amounts
- feePercent: Optional fee
- status: active/paused

## 🔒 Security Features

1. **Secret-Based Unlocking**
   ```solidity
   require(keccak256(abi.encodePacked(_preimage)) == s.hashlock, "Invalid secret");
   ```

2. **Timelock Protection**
   ```solidity
   require(block.timestamp < s.timelock, "Expired");
   require(block.timestamp >= s.timelock, "Too early");
   ```

3. **State Management**
   ```solidity
   enum State { INVALID, OPEN, CLAIMED, REFUNDED }
   ```

4. **Access Control**
   ```solidity
   require(msg.sender == s.recipient, "Not recipient");
   require(msg.sender == s.sender, "Not sender");
   ```

## 🛠 Development Setup

1. **Backend**
   ```bash
   cd backend
   npm install
   # Configure .env
   npm start
   ```

2. **Frontend**
   ```bash
   cd frontend
   npm install
   # Configure .env
   npm run dev
   ```

3. **Resolver Bot**
   ```bash
   cd resolver-bot-template
   npm install
   # Configure .env
   npm start
   ```

## 🧪 Testing

The project includes comprehensive test files:
- `test-complete-swap-flow.js`
- `test-trx-to-eth-flow.js`
- `test-wallet-setup.js`

Run tests with:
```bash
cd backend
npm test
```

## 📜 License

[Add License Information]

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## ⚠️ Disclaimer

This project is in beta. Use at your own risk. Always verify contract addresses and test with small amounts first.
