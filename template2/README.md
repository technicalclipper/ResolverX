# ResolverX Resolver Bot Template

A forkable Node.js bot template for becoming a resolver in the ResolverX cross-chain swap marketplace.

## 🚀 Quick Start

### 1. Fork this repository
```bash
git clone <your-forked-repo>
cd resolver-bot-template
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
```bash
cp env.example .env
# Edit .env with your private keys and settings
```

### 4. Start the bot
```bash
npm start
```

## 📋 Prerequisites

- **Node.js 18+**
- **Ethereum Sepolia testnet ETH** (for testing)
- **TRON Nile testnet TRX** (for testing)
- **Private keys** for both chains

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `RESOLVER_NAME` | Your resolver's name | `My Resolver Bot` |
| `FEE_PERCENT` | Your fee percentage (0.001 = 0.1%) | `0.001` |
| `SUPPORTED_DIRECTIONS` | Supported swap directions | `eth→trx,trx→eth` |
| `ETH_PRIVATE_KEY` | Your Ethereum private key | `0x1234...` |
| `TRON_PRIVATE_KEY` | Your TRON private key | `abcd...` |
| `PORT` | Bot server port | `3001` |

### Required Endpoints

Your bot must implement these endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/status` | GET | Health check |
| `/info` | GET | Resolver information |
| `/lock-tron` | POST | Lock TRX for ETH→TRX swap |
| `/claim-eth` | POST | Claim ETH with secret |
| `/lock-eth` | POST | Lock ETH for TRX→ETH swap |
| `/claim-tron` | POST | Claim TRX with secret |

## 🔄 How It Works

### ETH → TRX Swap Flow
1. User locks ETH on Ethereum
2. Backend calls your `/lock-tron` endpoint
3. Your bot locks TRX on TRON
4. User claims TRX (reveals secret)
5. Backend calls your `/claim-eth` endpoint
6. Your bot claims ETH using the secret

### TRX → ETH Swap Flow
1. User locks TRX on TRON
2. Backend calls your `/lock-eth` endpoint
3. Your bot locks ETH on Ethereum
4. User claims ETH (reveals secret)
5. Backend calls your `/claim-tron` endpoint
6. Your bot claims TRX using the secret

## 💰 Earning Fees

- Set your fee percentage in `FEE_PERCENT`
- Fees are automatically calculated and included in swap amounts
- You earn fees for providing liquidity and executing swaps

## 🔒 Security

- **Never share your private keys**
- Use environment variables for sensitive data
- Keep your bot running 24/7 for best performance
- Monitor your balances regularly

## 📡 Registration

After starting your bot:

1. Get your bot's endpoint URL (e.g., `https://your-bot.com`)
2. Register via the ResolverX frontend
3. Provide your endpoint and wallet addresses
4. Start earning fees!

## 🛠️ Customization

You can customize:
- Fee structure
- Supported directions
- Liquidity management
- Error handling
- Logging and monitoring

## 📞 Support

- Check the main ResolverX documentation
- Join the community Discord
- Report issues on GitHub

## 📄 License

MIT License - feel free to modify and distribute! 