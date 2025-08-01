# ResolverX HTLC Backend

A complete Node.js backend for **atomic cross-chain HTLC swaps** between Ethereum (Sepolia) and TRON (Nile testnet) using real blockchain transactions.

## 🚀 Features

- **Complete HTLC Swap Flow**: Full ETH ↔ TRX atomic swaps
- **Real Blockchain Integration**: Uses ethers.js and TronWeb for actual transactions
- **Automatic Secret Routing**: Cross-chain secret revelation and claim execution
- **Event Monitoring**: Real-time blockchain event tracking
- **Bidirectional Swaps**: Support for both ETH→TRX and TRX→ETH directions
- **REST API**: Complete API for swap management and execution

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- **Test ETH** on Sepolia testnet
- **Test TRX** on Nile testnet
- Deployed HTLC contracts on both networks

## 🛠 Installation

1. **Install dependencies:**
```bash
cd backend
npm install
```

2. **Start the server:**
```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

## 🔧 Configuration

The backend is configured with your deployed contract addresses and private keys:

- **Ethereum Sepolia**: `0x11442C4C44f8f0be027d13E21f969d7703Bd8400`
- **TRON Nile**: `TQU4VDENJFnnQcPUTXrzDn4E7SoMy98pkZ`
- **Wallet Addresses**: Automatically derived from private keys

Configuration can be found at: `http://localhost:3000/config`

## 📡 API Endpoints

### Health Check
```
GET /health
```

### Configuration
```
GET /config
```

### Swaps
```
GET /swaps                    # Get all swaps
GET /swaps/:hashlock         # Get specific swap
POST /swaps                  # Create new swap
GET /swaps/:hashlock/lock-params  # Get lock parameters
GET /swaps/:hashlock/state   # Get contract state
```

### Complete Swap Execution
```
POST /swaps/:hashlock/execute-eth-to-trx  # Execute ETH → TRX swap
POST /swaps/:hashlock/execute-trx-to-eth  # Execute TRX → ETH swap
POST /swaps/:hashlock/claim               # Claim with secret
```

### Events
```
GET /events                  # Get all events
```

## 🔄 Complete Swap Flow

### **ETH → TRX Swap Example:**

#### **1. Create Swap**
```bash
curl -X POST http://localhost:3000/swaps \
  -H "Content-Type: application/json" \
  -d '{
    "direction": "eth→trx",
    "userAddress": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    "resolverAddress": "TLjo7ku3tgcz8aCMoeA2a3MxSxqKRyB9Ao",
    "amount": "0.01"
  }'
```

#### **2. Execute Complete Swap**
```bash
curl -X POST http://localhost:3000/swaps/{hashlock}/execute-eth-to-trx \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "0.01"
  }'
```

**This automatically:**
- ✅ Locks ETH on Ethereum (Sepolia)
- ✅ Locks TRX on TRON (Nile)
- ✅ Uses the same hashlock on both chains
- ✅ Sets up atomic swap conditions

#### **3. Claim (Optional - for testing)**
```bash
curl -X POST http://localhost:3000/swaps/{hashlock}/claim \
  -H "Content-Type: application/json" \
  -d '{
    "secret": "0x...",
    "chain": "tron"
  }'
```

## 🧪 Testing

### **Run Complete Swap Test:**
```bash
node test-complete-swap.js
```

This will:
1. Create a new swap
2. Execute ETH → TRX swap
3. Execute TRX → ETH swap
4. Test claim functionality
5. Verify contract states
6. Track all events

### **Run Basic API Test:**
```bash
node test-swap.js
```

## 📊 Monitoring

The backend automatically monitors:
- **HTLC Lock Events**: When funds are locked on both chains
- **HTLC Claim Events**: When secrets are revealed and funds claimed
- **HTLC Refund Events**: When swaps are refunded after timelock
- **Secret Revelations**: Automatic cross-chain secret routing

All events are logged and stored for tracking.

## 🔐 Security

- **Private Key Management**: Secure private key handling
- **Secret Generation**: Cryptographically secure random secrets
- **Hashlock Verification**: Ensures secret matches hashlock
- **Access Control**: Only authorized parties can claim/refund
- **Timelock Protection**: Prevents indefinite fund locking
- **Atomic Operations**: Either both parties get tokens or neither does

## 🚧 Current Implementation

### **✅ Fully Implemented:**
- Real Ethereum contract calls (ethers.js)
- Real TRON contract calls (TronWeb)
- Complete swap execution flow
- Event monitoring and tracking
- Secret revelation and claim automation
- Bidirectional swap support

### **🔧 Ready for Production:**
- Database integration (PostgreSQL/MongoDB)
- Authentication and authorization
- Rate limiting and security headers
- Error handling and retry logic
- Monitoring and logging

## 🔮 Next Steps

1. **Database Integration**: Add PostgreSQL/MongoDB for persistent storage
2. **Authentication**: Add JWT-based authentication
3. **Resolver Bot**: Automated resolver bot for liquidity provision
4. **Frontend UI**: React frontend for user interaction
5. **Marketplace**: Resolver marketplace with fee management
6. **Monitoring**: Add comprehensive monitoring and alerting

## 📞 Support

For issues or questions:
1. Check the logs for detailed error messages
2. Verify contract addresses and private keys
3. Ensure sufficient test ETH/TRX balances
4. Check network connectivity to RPC endpoints

---

**ResolverX Team** 🚀

*Complete atomic cross-chain swaps with real blockchain integration!* 