const express = require('express');
const ethers = require('ethers');
const TronWeb = require('tronweb');
require('dotenv').config();

const app = express();
app.use(express.json());

// Configuration - Resolver needs to set these in .env
const CONFIG = {
    ETH_SEPOLIA: {
        RPC_URL: process.env.ETH_RPC_URL || 'https://1rpc.io/sepolia',
        CONTRACT_ADDRESS: process.env.ETH_CONTRACT_ADDRESS || '0x11442C4C44f8f0be027d13E21f969d7703Bd8400',
        PRIVATE_KEY: process.env.ETH_PRIVATE_KEY // Resolver's ETH private key
    },
    TRON_NILE: {
        RPC_URL: process.env.TRON_RPC_URL || 'https://nile.trongrid.io/',
        CONTRACT_ADDRESS: process.env.TRON_CONTRACT_ADDRESS || 'TQU4VDENJFnnQcPUTXrzDn4E7SoMy98pkZ',
        PRIVATE_KEY: process.env.TRON_PRIVATE_KEY // Resolver's TRON private key
    },
    PORT: process.env.PORT || 3001,
    RESOLVER_NAME: process.env.RESOLVER_NAME || 'Default Resolver',
    FEE_PERCENT: parseFloat(process.env.FEE_PERCENT) || 0.001, // 0.1% default fee
    SUPPORTED_DIRECTIONS: process.env.SUPPORTED_DIRECTIONS?.split(',') || ['eth→trx', 'trx→eth']
};

// Initialize providers and wallets
const ethProvider = new ethers.JsonRpcProvider(CONFIG.ETH_SEPOLIA.RPC_URL);
const ethWallet = new ethers.Wallet(CONFIG.ETH_SEPOLIA.PRIVATE_KEY, ethProvider);
const ethContract = new ethers.Contract(
    CONFIG.ETH_SEPOLIA.CONTRACT_ADDRESS,
    require('./abi').eth_sepolia_abi,
    ethWallet
);

const tronWeb = new TronWeb({
    fullHost: CONFIG.TRON_NILE.RPC_URL,
    privateKey: CONFIG.TRON_NILE.PRIVATE_KEY
});

console.log('🤖 Resolver Bot Starting...');
console.log('🔑 ETH Address:', ethWallet.address);
console.log('🔑 TRON Address:', tronWeb.defaultAddress.base58);
console.log('💰 Fee Percent:', CONFIG.FEE_PERCENT * 100, '%');
console.log('📡 Supported Directions:', CONFIG.SUPPORTED_DIRECTIONS);

// Contract interaction class
class ContractInteractor {
    constructor() {
        this.ethProvider = ethProvider;
        this.ethContract = ethContract;
        this.ethWallet = ethWallet;
        this.tronWeb = tronWeb;
    }

    // Lock ETH on Ethereum (for TRX→ETH swaps)
    async lockOnEthereum(hashlock, recipient, token, amount, timelock) {
        try {
            console.log('🔒 Locking ETH on Ethereum...');
            console.log('   Hashlock:', hashlock);
            console.log('   Recipient:', recipient);
            console.log('   Amount:', ethers.formatEther(amount), 'ETH');
            console.log('   Timelock:', timelock);

            const tx = await this.ethContract.lock(
                hashlock,
                recipient,
                token,
                amount,
                timelock,
                { value: amount }
            );

            const receipt = await tx.wait();
            console.log('✅ ETH lock successful:', receipt.hash);
            
            return {
                success: true,
                txHash: receipt.hash,
                amount: ethers.formatEther(amount)
            };
        } catch (error) {
            console.error('❌ ETH lock failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Claim ETH on Ethereum (with secret)
    async claimOnEthereum(preimage) {
        try {
            console.log('💰 Claiming ETH on Ethereum...');
            console.log('   Preimage:', preimage);

            const tx = await this.ethContract.claim(preimage);
            const receipt = await tx.wait();
            console.log('✅ ETH claim successful:', receipt.hash);
            
            return {
                success: true,
                txHash: receipt.hash
            };
        } catch (error) {
            console.error('❌ ETH claim failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Lock TRX on TRON (for ETH→TRX swaps)
    async lockOnTron(hashlock, recipient, token, amount, timelock) {
        try {
            console.log('🔒 Locking TRX on TRON...');
            console.log('   Hashlock:', hashlock);
            console.log('   Recipient:', recipient);
            console.log('   Amount:', amount / 1000000, 'TRX');
            console.log('   Timelock:', timelock);

            const contract = await this.tronWeb.contract().at(CONFIG.TRON_NILE.CONTRACT_ADDRESS);
            const result = await contract.lock(
                hashlock,
                recipient,
                token,
                amount.toString(),
                timelock.toString()
            ).send({
                feeLimit: 1000000000,
                callValue: amount
            });

            console.log('✅ TRX lock successful:', result);
            
            return {
                success: true,
                txHash: result,
                amount: amount / 1000000
            };
        } catch (error) {
            console.error('❌ TRX lock failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Claim TRX on TRON (with secret)
    async claimOnTron(preimage) {
        try {
            console.log('💰 Claiming TRX on TRON...');
            console.log('   Preimage:', preimage);

            const contract = await this.tronWeb.contract().at(CONFIG.TRON_NILE.CONTRACT_ADDRESS);
            const result = await contract.claim(preimage).send({
                feeLimit: 1000000000
            });

            console.log('✅ TRX claim successful:', result);
            
            return {
                success: true,
                txHash: result
            };
        } catch (error) {
            console.error('❌ TRX claim failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get balances
    async getBalances() {
        try {
            const ethBalance = await this.ethProvider.getBalance(this.ethWallet.address);
            const tronBalance = await this.tronWeb.trx.getBalance(this.tronWeb.defaultAddress.base58);

            return {
                ethereum: {
                    address: this.ethWallet.address,
                    balance: ethers.formatEther(ethBalance)
                },
                tron: {
                    address: this.tronWeb.defaultAddress.base58,
                    balance: tronBalance / 1000000
                }
            };
        } catch (error) {
            console.error('❌ Error getting balances:', error);
            return null;
        }
    }
}

const contractInteractor = new ContractInteractor();

// API Endpoints

// Health check
app.get('/status', (req, res) => {
    res.json({
        status: 'healthy',
        name: CONFIG.RESOLVER_NAME,
        timestamp: new Date().toISOString(),
        addresses: {
            ethereum: ethWallet.address,
            tron: tronWeb.defaultAddress.base58
        }
    });
});

// Resolver info
app.get('/info', async (req, res) => {
    try {
        const balances = await contractInteractor.getBalances();
        
        res.json({
            name: CONFIG.RESOLVER_NAME,
            supported_directions: CONFIG.SUPPORTED_DIRECTIONS,
            fee_percent: CONFIG.FEE_PERCENT,
            liquidity: {
                ethereum: balances?.ethereum?.balance || '0',
                tron: balances?.tron?.balance || '0'
            },
            status: 'active',
            addresses: {
                ethereum: ethWallet.address,
                tron: tronWeb.defaultAddress.base58
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get resolver info' });
    }
});

// Lock TRX for ETH→TRX swap
app.post('/lock-tron', async (req, res) => {
    try {
        const { hashlock, recipient, amount, timelock } = req.body;
        
        console.log('📥 Received lock-tron request:', { hashlock, recipient, amount, timelock });

        if (!hashlock || !recipient || !amount || !timelock) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        const result = await contractInteractor.lockOnTron(
            hashlock,
            recipient,
            '0x0000000000000000000000000000000000000000', // Native TRX
            Math.floor(parseFloat(amount) * 1000000), // Convert TRX to SUN
            timelock
        );

        res.json(result);
    } catch (error) {
        console.error('❌ Error in lock-tron:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Claim ETH with secret (for ETH→TRX swap)
app.post('/claim-eth', async (req, res) => {
    try {
        const { preimage } = req.body;
        
        console.log('📥 Received claim-eth request:', { preimage });

        if (!preimage) {
            return res.status(400).json({ error: 'Missing preimage' });
        }

        const result = await contractInteractor.claimOnEthereum(preimage);
        res.json(result);
    } catch (error) {
        console.error('❌ Error in claim-eth:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Lock ETH for TRX→ETH swap
app.post('/lock-eth', async (req, res) => {
    try {
        const { hashlock, recipient, amount, timelock } = req.body;
        
        console.log('📥 Received lock-eth request:', { hashlock, recipient, amount, timelock });

        if (!hashlock || !recipient || !amount || !timelock) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        const result = await contractInteractor.lockOnEthereum(
            hashlock,
            recipient,
            '0x0000000000000000000000000000000000000000', // Native ETH
            ethers.parseEther(amount),
            timelock
        );

        res.json(result);
    } catch (error) {
        console.error('❌ Error in lock-eth:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Claim TRX with secret (for TRX→ETH swap)
app.post('/claim-tron', async (req, res) => {
    try {
        const { preimage } = req.body;
        
        console.log('📥 Received claim-tron request:', { preimage });

        if (!preimage) {
            return res.status(400).json({ error: 'Missing preimage' });
        }

        const result = await contractInteractor.claimOnTron(preimage);
        res.json(result);
    } catch (error) {
        console.error('❌ Error in claim-tron:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start server
app.listen(CONFIG.PORT, () => {
    console.log(`🤖 Resolver Bot running on port ${CONFIG.PORT}`);
    console.log(`📡 Endpoints:`);
    console.log(`   GET  /status - Health check`);
    console.log(`   GET  /info - Resolver information`);
    console.log(`   POST /lock-tron - Lock TRX for ETH→TRX`);
    console.log(`   POST /claim-eth - Claim ETH with secret`);
    console.log(`   POST /lock-eth - Lock ETH for TRX→ETH`);
    console.log(`   POST /claim-tron - Claim TRX with secret`);
});

module.exports = app; 