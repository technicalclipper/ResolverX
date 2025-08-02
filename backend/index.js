const express = require('express');
const ethers = require('ethers');
const crypto = require('crypto');
const TronWeb = require('tronweb');
const { eth_sepolia_abi } = require('./abi');
require('dotenv').config();

// Database Models
const SwapModel = require('./database/models/Swap');
const ResolverModel = require('./database/models/Resolver');

// Resolver Manager for HTTP-based swap execution
const ResolverManager = require('./resolver-manager');

const app = express();

// CORS middleware to allow frontend requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

// Configuration
const CONFIG = {
    ETH_SEPOLIA: {
        RPC_URL: 'https://1rpc.io/sepolia',
        CONTRACT_ADDRESS: '0x11442C4C44f8f0be027d13E21f969d7703Bd8400',
        CHAIN_ID: 11155111,
        PRIVATE_KEY: '92ee430d9c27fb9fd6d0e97355ec18994279012dc1339648cecf1afbf3998f2c'
    },
    TRON_NILE: {
        RPC_URL: 'https://nile.trongrid.io/',
        CONTRACT_ADDRESS: 'TQU4VDENJFnnQcPUTXrzDn4E7SoMy98pkZ',
        CHAIN_ID: 201910292,
        PRIVATE_KEY: 'b779319f391485f205ea57ed3e77dc0d42af523239d9f65b36cd819e5806e40d'
    },
    TIMELOCK_DURATION: 30 * 60, // 30 minutes in seconds
    SWAP_AMOUNT: ethers.parseEther('0.001') // 0.001 ETH for testing
    // Exchange rate: 1 ETH = 11,265.12 TRX
    // So 0.001 ETH = 11.27 TRX
};

// Database storage for swaps (replaced in-memory storage)
// const swaps = new Map(); // Removed - now using database
// const swapEvents = []; // Removed - now using database

// Initialize providers
// Remove hardcoded user wallets - users will sign with their own wallets
const ethProvider = new ethers.JsonRpcProvider(CONFIG.ETH_SEPOLIA.RPC_URL);
const ethContract = new ethers.Contract(
    CONFIG.ETH_SEPOLIA.CONTRACT_ADDRESS,
    eth_sepolia_abi,
    ethProvider
);

// Initialize TronWeb with resolver's private key for locking
const tronWeb = new TronWeb({
    fullHost: CONFIG.TRON_NILE.RPC_URL,
    privateKey: CONFIG.TRON_NILE.PRIVATE_KEY
});

// Initialize wallets (Only resolver wallets - users will use their own)
const ethWallet = new ethers.Wallet(CONFIG.ETH_SEPOLIA.PRIVATE_KEY, ethProvider); // Resolver's ETH wallet
const tronWallet = tronWeb.defaultAddress.base58;

console.log('🔐 Resolver Wallet Setup for Cross-Chain Swaps:');
console.log('🔑 Resolver ETH Address (0x...):', ethWallet.address);
console.log('🔑 TRON Resolver Address (T...):', tronWallet);
console.log('');
console.log('📋 Address Usage:');
console.log('   Resolver ETH Address: Receive ETH from user, claim ETH');
console.log('   TRON Resolver Address: Lock TRX on TRON chain (resolver)');
console.log('   User wallets: Will be provided by frontend for signing');
console.log('');

// Initialize Resolver Manager for HTTP-based swap execution
const resolverManager = new ResolverManager();

// Contract interaction class
class ContractInteractor {
    constructor() {
        this.ethProvider = ethProvider;
        this.ethContract = ethContract;
        this.tronWeb = tronWeb; // Resolver's TRON wallet
        // this.userTronWeb = userTronWeb; // User's TRON wallet - REMOVED
        this.ethWallet = ethWallet; // Resolver's ETH wallet
        // this.userEthWallet = userEthWallet; // User's ETH wallet - REMOVED
        this.tronWallet = tronWallet;
    }

    // Get balances for debugging
    async getBalances() {
        try {
            // Get ETH balance
            const ethBalance = await this.ethProvider.getBalance(this.ethWallet.address);
            const ethBalanceEth = ethers.formatEther(ethBalance);

            // Get TRON balance (resolver wallet)
            const tronBalance = await this.tronWeb.trx.getBalance(this.tronWallet);
            const tronBalanceTrx = tronBalance / 1000000; // Convert SUN to TRX

            // Get user TRON balance
            // const userTronBalance = await userTronWeb.trx.getBalance(userTronWeb.defaultAddress.base58); // REMOVED
            // const userTronBalanceTrx = userTronBalance / 1000000; // REMOVED

            return {
                ethereum: {
                    address: this.ethWallet.address,
                    balance: ethBalanceEth,
                    balanceWei: ethBalance.toString()
                },
                tron: {
                    address: this.tronWallet,
                    balance: tronBalanceTrx,
                    balanceSun: tronBalance
                },
                userTron: {
                    // address: userTronWeb.defaultAddress.base58, // REMOVED
                    // balance: userTronBalanceTrx, // REMOVED
                    // balanceSun: userTronBalance // REMOVED
                }
            };
        } catch (error) {
            console.error('❌ Error getting balances:', error);
            return {
                ethereum: { error: error.message },
                tron: { error: error.message },
                userTron: { error: error.message }
            };
        }
    }

    // Ethereum Contract Calls
    async lockOnEthereum(hashlock, recipient, token, amount, timelock) {
        try {
            console.log('🔒 Locking on Ethereum:', {
                hashlock,
                recipient,
                token,
                amount: amount.toString(),
                timelock
            });

            // Create contract instance with signer
            const contractWithSigner = ethContract.connect(this.ethWallet);

            // Prepare transaction
            const tx = await contractWithSigner.lock(
                hashlock,
                recipient,
                token,
                amount,
                timelock,
                { value: amount } // Send ETH with transaction
            );

            console.log('📝 Ethereum lock transaction sent:', tx.hash);
            
            // Wait for confirmation
            const receipt = await tx.wait();
            console.log('✅ Ethereum lock confirmed:', receipt.hash);

            return {
                success: true,
                txHash: tx.hash,
                receipt
            };

        } catch (error) {
            console.error('❌ Ethereum lock failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async userLockOnEthereum(hashlock, recipient, token, amount, timelock) {
        try {
            console.log('🔒 User locking on Ethereum:', {
                hashlock,
                recipient,
                token,
                amount: amount.toString(),
                timelock
            });

            // Create contract instance with user's signer
            // const contractWithSigner = ethContract.connect(this.userEthWallet); // REMOVED

            // Prepare transaction
            const tx = await ethContract.lock( // Use ethContract directly as it's the resolver's wallet
                hashlock,
                recipient,
                token,
                amount,
                timelock,
                { value: amount } // Send ETH with transaction
            );

            console.log('📝 User Ethereum lock transaction sent:', tx.hash);
            
            // Wait for confirmation
            const receipt = await tx.wait();
            console.log('✅ User Ethereum lock confirmed:', receipt.hash);

            return {
                success: true,
                txHash: tx.hash,
                receipt
            };

        } catch (error) {
            console.error('❌ User Ethereum lock failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async claimOnEthereum(preimage) {
        try {
            console.log('💰 Claiming on Ethereum with preimage:', preimage);

            const contractWithSigner = ethContract.connect(this.ethWallet);
            
            const tx = await contractWithSigner.claim(preimage);
            console.log('📝 Ethereum claim transaction sent:', tx.hash);
            
            const receipt = await tx.wait();
            console.log('✅ Ethereum claim confirmed:', receipt.hash);

            return {
                success: true,
                txHash: tx.hash,
                receipt
            };

        } catch (error) {
            console.error('❌ Ethereum claim failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async userClaimOnEthereum(preimage) {
        try {
            console.log('💰 User claiming on Ethereum with preimage:', preimage);

            const contractWithSigner = ethContract.connect(this.ethWallet); // Use ethContract directly
            
            const tx = await contractWithSigner.claim(preimage);
            console.log('📝 User Ethereum claim transaction sent:', tx.hash);
            
            const receipt = await tx.wait();
            console.log('✅ User Ethereum claim confirmed:', receipt.hash);

            return {
                success: true,
                txHash: tx.hash,
                receipt
            };

        } catch (error) {
            console.error('❌ User Ethereum claim failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async refundOnEthereum(hashlock) {
        try {
            console.log('🔄 Refunding on Ethereum for hashlock:', hashlock);

            const contractWithSigner = ethContract.connect(this.ethWallet);
            
            const tx = await contractWithSigner.refund(hashlock);
            console.log('📝 Ethereum refund transaction sent:', tx.hash);
            
            const receipt = await tx.wait();
            console.log('✅ Ethereum refund confirmed:', receipt.hash);

            return {
                success: true,
                txHash: tx.hash,
                receipt
            };

        } catch (error) {
            console.error('❌ Ethereum refund failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // TRON Contract Calls (Real implementation)
    async lockOnTron(hashlock, recipient, token, amount, timelock) {
        try {
            console.log('🔒 Locking on TRON:', {
                hashlock,
                recipient,
                token,
                amount: amount.toString(),
                timelock
            });

            // Check TRON balance before attempting lock
            const tronBalance = await this.tronWeb.trx.getBalance(this.tronWallet);
            const tronBalanceTrx = tronBalance / 1000000; // Convert SUN to TRX
            
            // Amount is already in SUN format, just use it directly
            const amountInSun = parseInt(amount);
            const amountInTrx = amountInSun / 1000000; // Convert SUN to TRX for display

            console.log('💰 TRON Balance Check:');
            console.log('   Current Balance:', tronBalanceTrx, 'TRX');
            console.log('   Required Amount:', amountInTrx, 'TRX');
            console.log('   Required Amount (SUN):', amountInSun, 'SUN');
            console.log('   Sufficient Balance:', tronBalance >= amountInSun);

            if (tronBalance < amountInSun) {
                return {
                    success: false,
                    error: `Insufficient TRX balance. Have: ${tronBalanceTrx} TRX, Need: ${amountInTrx} TRX`
                };
            }

            // Convert parameters for TRON
            const tronAmount = amountInSun.toString(); // Use SUN amount
            const tronTimelock = timelock.toString();

            console.log('🔧 TRON parameters:', {
                tronAmount,
                tronTimelock,
                recipient
            });

            // Call TRON contract
            const result = await this.tronWeb.contract().at(CONFIG.TRON_NILE.CONTRACT_ADDRESS)
                .then(contract => {
                    console.log('📝 Calling TRON contract lock function...');
                    console.log('🔧 Final TRON parameters:', {
                        hashlock,
                        recipient,
                        token: token,
                        amount: tronAmount,
                        timelock: tronTimelock,
                        callValue: tronAmount
                    });
                    return contract.lock(
                        hashlock,
                        recipient,
                        token,
                        tronAmount,
                        tronTimelock
                    ).send({
                        feeLimit: 1000000000,
                        callValue: tronAmount // Send TRX with transaction
                    });
                });

            console.log('📝 TRON lock transaction sent:', result);
            
            return {
                success: true,
                txHash: result,
                receipt: { transactionId: result }
            };

        } catch (error) {
            console.error('❌ TRON lock failed:', error);
            console.error('❌ Error details:', {
                message: error.message,
                code: error.code,
                argument: error.argument,
                value: error.value
            });
            return {
                success: false,
                error: error.message
            };
        }
    }

    async userLockOnTron(hashlock, recipient, token, amount, timelock) {
        try {
            console.log('🔒 User locking on TRON:', {
                hashlock,
                recipient,
                token,
                amount: amount.toString(),
                timelock
            });

            // Check user TRON balance before attempting lock
            // const tronBalance = await this.userTronWeb.trx.getBalance(this.userTronWeb.defaultAddress.base58); // REMOVED
            const tronBalance = await this.tronWeb.trx.getBalance(this.tronWeb.defaultAddress.base58); // Use tronWeb directly
            const tronBalanceTrx = tronBalance / 1000000; // Convert SUN to TRX
            
            // Amount is already in SUN format, just use it directly
            const amountInSun = parseInt(amount);
            const amountInTrx = amountInSun / 1000000; // Convert SUN to TRX for display

            console.log('💰 User TRON Balance Check:');
            console.log('   Current Balance:', tronBalanceTrx, 'TRX');
            console.log('   Required Amount:', amountInTrx, 'TRX');
            console.log('   Required Amount (SUN):', amountInSun, 'SUN');
            console.log('   Sufficient Balance:', tronBalance >= amountInSun);

            if (tronBalance < amountInSun) {
                return {
                    success: false,
                    error: `Insufficient TRX balance. Have: ${tronBalanceTrx} TRX, Need: ${amountInTrx} TRX`
                };
            }

            // Convert parameters for TRON
            const tronAmount = amountInSun.toString(); // Use SUN amount
            const tronTimelock = timelock.toString();

            console.log('🔧 User TRON parameters:', {
                tronAmount,
                tronTimelock,
                recipient
            });

            // Call TRON contract with user's wallet
            const result = await this.tronWeb.contract().at(CONFIG.TRON_NILE.CONTRACT_ADDRESS)
                .then(contract => {
                    console.log('📝 Calling TRON contract lock function with user wallet...');
                    console.log('🔧 Final User TRON parameters:', {
                        hashlock,
                        recipient,
                        token: token,
                        amount: tronAmount,
                        timelock: tronTimelock,
                        callValue: tronAmount
                    });
                    return contract.lock(
                        hashlock,
                        recipient,
                        token,
                        tronAmount,
                        tronTimelock
                    ).send({
                        feeLimit: 1000000000,
                        callValue: tronAmount // Send TRX with transaction
                    });
                });

            console.log('📝 User TRON lock transaction sent:', result);
            
            return {
                success: true,
                txHash: result,
                receipt: { transactionId: result }
            };

        } catch (error) {
            console.error('❌ User TRON lock failed:', error);
            console.error('❌ Error details:', {
                message: error.message,
                code: error.code,
                argument: error.argument,
                value: error.value
            });
            return {
                success: false,
                error: error.message
            };
        }
    }

    async claimOnTron(preimage) {
        try {
            console.log('💰 Claiming on TRON with preimage:', preimage);

            const result = await this.tronWeb.contract().at(CONFIG.TRON_NILE.CONTRACT_ADDRESS)
                .then(contract => {
                    return contract.claim(preimage).send({
                        feeLimit: 1000000000
                    });
                });

            console.log('📝 TRON claim transaction sent:', result);
            
            return {
                success: true,
                txHash: result,
                receipt: { transactionId: result }
            };

        } catch (error) {
            console.error('❌ TRON claim failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async userClaimOnTron(preimage) {
        try {
            console.log('💰 User claiming on TRON with preimage:', preimage);

            const result = await this.tronWeb.contract().at(CONFIG.TRON_NILE.CONTRACT_ADDRESS)
                .then(contract => {
                    return contract.claim(preimage).send({
                        feeLimit: 1000000000
                    });
                });

            console.log('📝 User TRON claim transaction sent:', result);
            
            return {
                success: true,
                txHash: result,
                receipt: { transactionId: result }
            };

        } catch (error) {
            console.error('❌ User TRON claim failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async refundOnTron(hashlock) {
        try {
            console.log('🔄 Refunding on TRON for hashlock:', hashlock);

            const result = await this.tronWeb.contract().at(CONFIG.TRON_NILE.CONTRACT_ADDRESS)
                .then(contract => {
                    return contract.refund(hashlock).send({
                        feeLimit: 1000000000
                    });
                });

            console.log('📝 TRON refund transaction sent:', result);
            
            return {
                success: true,
                txHash: result,
                receipt: { transactionId: result }
            };

        } catch (error) {
            console.error('❌ TRON refund failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get swap state from contract
    async getSwapState(hashlock, chain = 'ethereum') {
        try {
            if (chain === 'ethereum') {
                const swapData = await this.ethContract.swaps(hashlock);
                return {
                    success: true,
                    state: Number(swapData.state),
                    sender: swapData.sender,
                    recipient: swapData.recipient,
                    token: swapData.token,
                    amount: swapData.amount ? swapData.amount.toString() : '0',
                    timelock: swapData.timelock ? swapData.timelock.toString() : '0',
                    preimage: swapData.preimage || '0x0000000000000000000000000000000000000000000000000000000000000000'
                };
            } else {
                // TRON implementation
                const result = await this.tronWeb.contract().at(CONFIG.TRON_NILE.CONTRACT_ADDRESS)
                    .then(contract => {
                        return contract.swaps(hashlock).call();
                    });
                
                // Convert all BigInt values to strings to avoid serialization issues
                return {
                    success: true,
                    state: Number(result.state),
                    sender: result.sender,
                    recipient: result.recipient,
                    token: result.token,
                    amount: result.amount ? result.amount.toString() : '0',
                    timelock: result.timelock ? result.timelock.toString() : '0',
                    preimage: result.preimage || '0x0000000000000000000000000000000000000000000000000000000000000000'
                };
            }
        } catch (error) {
            console.error(`❌ Failed to get swap state on ${chain}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Initialize contract interactor
const contractInteractor = new ContractInteractor();

// Utility functions
function generateSecret() {
    return '0x' + crypto.randomBytes(32).toString('hex');
}

function generateHashlock(secret) {
    // Simple direct hash that matches the contract's keccak256(abi.encodePacked(_preimage))
    return ethers.keccak256(secret);
}

function calculateTimelock() {
    return Math.floor(Date.now() / 1000) + CONFIG.TIMELOCK_DURATION;
}

// Function to extract secret from transaction receipt
async function extractSecretFromTransaction(txHash, chain = 'ethereum') {
    try {
        console.log(`🔍 Extracting secret from ${chain} transaction: ${txHash}`);
        
        if (chain === 'ethereum') {
            // Get transaction receipt from Ethereum
            const receipt = await ethProvider.getTransactionReceipt(txHash);
            if (!receipt) {
                throw new Error('Transaction receipt not found');
            }
            
            // Find HTLCClaimed event in logs
            const contractInterface = new ethers.Interface(eth_sepolia_abi);
            for (const log of receipt.logs) {
                try {
                    const parsedLog = contractInterface.parseLog(log);
                    if (parsedLog && parsedLog.name === 'HTLCClaimed') {
                        const preimage = parsedLog.args.preimage;
                        console.log(`✅ Secret extracted from Ethereum transaction: ${preimage}`);
                        return preimage;
                    }
                } catch (parseError) {
                    // Skip logs that can't be parsed
                    continue;
                }
            }
            throw new Error('HTLCClaimed event not found in transaction logs');
        } else {
            // For TRON, we need to get transaction info
            const txInfo = await tronWeb.trx.getTransactionInfo(txHash);
            if (!txInfo) {
                throw new Error('TRON transaction info not found');
            }
            
            // For TRON, we need to decode the transaction data
            // This is more complex and depends on the specific TRON implementation
            // For now, we'll return an error suggesting manual extraction
            throw new Error('TRON secret extraction not yet implemented. Please extract manually from transaction logs.');
        }
    } catch (error) {
        console.error(`❌ Error extracting secret from ${chain} transaction:`, error.message);
        throw error;
    }
}

// Swap management
class SwapManager {
    constructor() {
        // Disable event listeners for now since RPC provider doesn't support them
        console.log('⚠️ Event listeners disabled - RPC provider does not support eth_newFilter');
        console.log('📝 You can still execute swaps and monitor them manually via API endpoints');
    }

    setupEventListeners() {
        // Event listeners disabled due to RPC provider limitations
        // The system will still work for manual swap execution
    }

    handleHTLCLocked(chain, hashlock, sender, recipient, token, amount, timelock) {
        console.log(`${chain.toUpperCase()} HTLC Locked:`, {
            hashlock,
            sender,
            recipient,
            token,
            amount: amount.toString(),
            timelock: timelock.toString()
        });

        // Store event
        // swapEvents.push({ // REMOVED
        //     id: swapEvents.length + 1,
        //     chain,
        //     eventType: 'HTLCLocked',
        //     hashlock,
        //     sender,
        //     recipient,
        //     token,
        //     amount: amount.toString(),
        //     timelock: timelock.toString(),
        //     timestamp: new Date()
        // });

        // Update swap status if exists
        // if (swaps.has(hashlock)) { // REMOVED
        //     const swap = swaps.get(hashlock);
        //     if (chain === 'ethereum') {
        //         swap.eth_lock_tx = 'pending'; // In real implementation, get from transaction
        //         swap.status = 'locked';
        //     } else {
        //         swap.tron_lock_tx = 'pending';
        //     }
        //     swaps.set(hashlock, swap);
        // }
    }

    handleHTLCClaimed(chain, hashlock, preimage) {
        console.log(`${chain.toUpperCase()} HTLC Claimed:`, { hashlock, preimage });

        // swapEvents.push({ // REMOVED
        //     id: swapEvents.length + 1,
        //     chain,
        //     eventType: 'HTLCClaimed',
        //     hashlock,
        //     preimage,
        //     timestamp: new Date()
        // });

        // Extract secret and trigger cross-chain claim
        this.handleSecretRevealed(chain, hashlock, preimage);
    }

    handleHTLCRefunded(chain, hashlock) {
        console.log(`${chain.toUpperCase()} HTLC Refunded:`, { hashlock });

        // swapEvents.push({ // REMOVED
        //     id: swapEvents.length + 1,
        //     chain,
        //     eventType: 'HTLCRefunded',
        //     hashlock,
        //     timestamp: new Date()
        // });
    }

    handleSecretRevealed(chain, hashlock, preimage) {
        // const swap = swaps.get(hashlock); // REMOVED
        // if (!swap) return;

        // Store the revealed secret
        // swap.secret = preimage; // REMOVED
        // swaps.set(hashlock, swap);

        // Trigger claim on the other chain
        if (chain === 'ethereum') {
            // Secret revealed on Ethereum, claim on TRON
            this.triggerTronClaim(hashlock, preimage);
        } else {
            // Secret revealed on TRON, claim on Ethereum
            this.triggerEthClaim(hashlock, preimage);
        }
    }

    async triggerEthClaim(hashlock, preimage) {
        console.log('Triggering ETH claim with secret:', preimage);
        const result = await contractInteractor.userClaimOnEthereum(preimage);
        if (result.success) {
            console.log('✅ ETH claim successful:', result.txHash);
        } else {
            console.error('❌ ETH claim failed:', result.error);
        }
    }

    async triggerTronClaim(hashlock, preimage) {
        console.log('Triggering TRON claim with secret:', preimage);
        const result = await contractInteractor.userClaimOnTron(preimage);
        if (result.success) {
            console.log('✅ TRON claim successful:', result.txHash);
        } else {
            console.error('❌ TRON claim failed:', result.error);
        }
    }
}

// Initialize swap manager
const swapManager = new SwapManager();

// API Routes
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date(),
        ethereum: {
            address: ethWallet.address,
            balance: 'checking...'
        },
        tron: {
            address: tronWallet,
            balance: 'checking...'
        },
        note: 'Event listeners may not be available with current RPC provider'
    });
});

// Get all swaps
app.get('/swaps', async (req, res) => {
    try {
        const swapsArray = await SwapModel.getAll();
        res.json(swapsArray);
    } catch (error) {
        console.error('Error fetching swaps:', error);
        res.status(500).json({ error: 'Failed to fetch swaps' });
    }
});

// Get swap by hashlock
app.get('/swaps/:hashlock', async (req, res) => {
    try {
        const { hashlock } = req.params;
        const swap = await SwapModel.getByHashlock(hashlock);
        
        if (!swap) {
            return res.status(404).json({ error: 'Swap not found' });
        }
        
        res.json(swap);
    } catch (error) {
        console.error('Error fetching swap:', error);
        res.status(500).json({ error: 'Failed to fetch swap' });
    }
});

// Get all resolvers
app.get('/resolvers', async (req, res) => {
    try {
        const resolvers = await ResolverModel.getActive();
        res.json(resolvers);
    } catch (error) {
        console.error('Error fetching resolvers:', error);
        res.status(500).json({ error: 'Failed to fetch resolvers' });
    }
});

// Get resolvers by direction
app.get('/resolvers/:direction', async (req, res) => {
    try {
        const { direction } = req.params;
        // Decode URL-encoded direction parameter
        const decodedDirection = decodeURIComponent(direction);
        console.log(`🔍 Fetching resolvers for direction: ${decodedDirection}`);
        const resolvers = await ResolverModel.getByDirection(decodedDirection);
        res.json(resolvers);
    } catch (error) {
        console.error('Error fetching resolvers by direction:', error);
        res.status(500).json({ error: 'Failed to fetch resolvers' });
    }
});

// Get all resolvers with current info (online status, liquidity, etc.)
app.get('/resolvers-info', async (req, res) => {
    try {
        const resolversWithInfo = await resolverManager.getAllResolversWithInfo();
        res.json(resolversWithInfo);
    } catch (error) {
        console.error('Error fetching resolvers with info:', error);
        res.status(500).json({ error: 'Failed to fetch resolvers info' });
    }
});

// Create new swap with automatic resolver selection
app.post('/swaps', async (req, res) => {
    try {
        const { direction, userEthAddress, userTronAddress, amount } = req.body;

        // Validate input (simplified - resolver selection is now automatic)
        if (!direction || !userEthAddress || !userTronAddress) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                required: {
                    direction: 'eth→trx or trx→eth',
                    userEthAddress: 'Ethereum address (0x...)',
                    userTronAddress: 'TRON address (T...)',
                    amount: 'Swap amount (optional - will use default)'
                }
            });
        }

        // Validate address formats
        if (!userEthAddress.startsWith('0x') || userEthAddress.length !== 42) {
            return res.status(400).json({ error: 'Invalid Ethereum address format' });
        }

        if (!userTronAddress.startsWith('T') || userTronAddress.length !== 34) {
            return res.status(400).json({ error: 'Invalid TRON address format' });
        }

        // Automatic resolver selection
        console.log('🔍 Selecting best resolver for swap...');
        const resolverSelection = await resolverManager.getBestResolver(direction, amount || '0.002');
        
        if (!resolverSelection.success) {
            return res.status(400).json({ 
                error: 'No suitable resolver found', 
                details: resolverSelection.error 
            });
        }

        const selectedResolver = resolverSelection.resolver;
        console.log(`✅ Selected resolver: ${selectedResolver.name} (fee: ${selectedResolver.fee_percent * 100}%)`);

        // Generate secret and hashlock
        const secret = generateSecret();
        const hashlock = generateHashlock(secret);
        const timelock = calculateTimelock();

        // Calculate amounts for fee system using selected resolver
        const userAmount = amount || '0.002';
        const resolverFee = (parseFloat(userAmount) * selectedResolver.fee_percent).toString();
        const totalAmount = (parseFloat(userAmount) + parseFloat(resolverFee)).toString();

        // Create swap record with selected resolver
        const swapData = {
            direction,
            hashlock,
            user_eth_address: userEthAddress,
            user_tron_address: userTronAddress,
            resolver_eth_address: selectedResolver.eth_address,
            resolver_tron_address: selectedResolver.tron_address,
            amount: totalAmount,
            user_amount: userAmount,
            resolver_fee: resolverFee,
            token_address: '0x0000000000000000000000000000000000000000', // Native token
            status: 'initiated',
            timelock,
            resolver_id: selectedResolver.id // Store resolver ID for later use
        };

        // Store swap in database
        const swap = await SwapModel.create(swapData);

        res.json({
            success: true,
            swap,
            resolver: {
                id: selectedResolver.id,
                name: selectedResolver.name,
                fee_percent: selectedResolver.fee_percent,
                endpoint: selectedResolver.endpoint
            },
            lockParams: {
                hashlock,
                timelock,
                secret: secret // Only for testing - in production this should be secure
            },
            addresses: {
                user: {
                    ethereum: userEthAddress,
                    tron: userTronAddress
                },
                resolver: {
                    ethereum: selectedResolver.eth_address,
                    tron: selectedResolver.tron_address
                }
            }
        });

    } catch (error) {
        console.error('Error creating swap:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get ETH lock transaction parameters for frontend signing (ETH → TRX)
app.get('/swaps/:hashlock/eth-lock-params', async (req, res) => {
    try {
        const { hashlock } = req.params;

        console.log('🔍 Getting ETH lock parameters for hashlock:', hashlock);

        // Get swap details from database
        const swap = await SwapModel.getByHashlock(hashlock);
        if (!swap) {
            return res.status(404).json({ error: 'Swap not found' });
        }

        console.log('🔍 Swap data from database:', {
            hashlock: swap.hashlock,
            direction: swap.direction,
            resolver_id: swap.resolver_id,
            resolver_eth_address: swap.resolver_eth_address,
            user_amount: swap.user_amount
        });

        // Get resolver details
        const resolver = await ResolverModel.getById(swap.resolver_id);
        if (!resolver) {
            return res.status(404).json({ error: 'Resolver not found' });
        }

        console.log('🔍 Resolver data from database:', {
            id: resolver.id,
            name: resolver.name,
            eth_address: resolver.eth_address,
            tron_address: resolver.tron_address
        });

        const timelock = calculateTimelock();
        const ethAmount = ethers.parseEther(swap.user_amount);

        // Return transaction parameters for frontend to sign
        // Encode the function data
        const functionData = ethContract.interface.encodeFunctionData('lock', [
            hashlock,
            swap.resolver_eth_address,
            '0x0000000000000000000000000000000000000000', // Native ETH
            ethAmount,
            timelock
        ]);
        
        console.log('🔍 Function encoding details:', {
            hashlock,
            resolverEthAddress: swap.resolver_eth_address,
            ethAmount: ethAmount.toString(),
            timelock,
            functionData
        });
        
        const transactionParams = {
            to: CONFIG.ETH_SEPOLIA.CONTRACT_ADDRESS,
            data: functionData,
            value: ethAmount.toString(),
            chainId: CONFIG.ETH_SEPOLIA.CHAIN_ID
        };
        
        console.log('🔍 Backend sending ETH lock params:', {
            to: transactionParams.to,
            toType: typeof transactionParams.to,
            toLength: transactionParams.to?.length,
            contractAddress: CONFIG.ETH_SEPOLIA.CONTRACT_ADDRESS
        });
        
        res.json({
            success: true,
            transactionParams: transactionParams,
            swap: {
                hashlock,
                direction: swap.direction,
                userAmount: swap.user_amount,
                resolverAddress: swap.resolver_eth_address,
                timelock
            },
            resolver: {
                name: resolver.name,
                endpoint: resolver.endpoint
            }
        });

    } catch (error) {
        console.error('Error getting ETH lock parameters:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get TRX lock transaction parameters for frontend signing (TRX → ETH)
app.get('/swaps/:hashlock/trx-lock-params', async (req, res) => {
    try {
        const { hashlock } = req.params;

        console.log('🔍 Getting TRX lock parameters for hashlock:', hashlock);

        // Get swap details from database
        const swap = await SwapModel.getByHashlock(hashlock);
        if (!swap) {
            return res.status(404).json({ error: 'Swap not found' });
        }

        // Get resolver details
        const resolver = await ResolverModel.getById(swap.resolver_id);
        if (!resolver) {
            return res.status(404).json({ error: 'Resolver not found' });
        }

        const timelock = calculateTimelock();
        const trxAmountInTrx = parseFloat(swap.user_amount);
        const trxAmountInSun = Math.floor(trxAmountInTrx * 1000000);

        // Return transaction parameters for frontend to sign
        res.json({
            success: true,
            transactionParams: {
                contractAddress: CONFIG.TRON_NILE.CONTRACT_ADDRESS,
                functionName: 'lock',
                parameters: [
                    hashlock,
                    swap.resolver_tron_address,
                    '0x0000000000000000000000000000000000000000', // Native TRX
                    trxAmountInSun.toString(),
                    timelock.toString()
                ],
                callValue: trxAmountInSun,
                feeLimit: 1000000000
            },
            swap: {
                hashlock,
                direction: swap.direction,
                userAmount: swap.user_amount,
                resolverAddress: swap.resolver_tron_address,
                timelock
            },
            resolver: {
                name: resolver.name,
                endpoint: resolver.endpoint
            }
        });

    } catch (error) {
        console.error('Error getting TRX lock parameters:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Submit user-signed ETH lock transaction (ETH → TRX)
app.post('/swaps/:hashlock/submit-eth-lock', async (req, res) => {
    try {
        const { hashlock } = req.params;
        const { txHash } = req.body;

        if (!txHash) {
            return res.status(400).json({ error: 'Missing transaction hash' });
        }

        console.log('📝 Submitting user ETH lock transaction:', txHash);

        // Update swap status in database
        await SwapModel.updateTransaction(hashlock, 'eth_lock_tx', txHash);
        await SwapModel.updateStatus(hashlock, 'eth_locked');

        // Get swap and resolver details
        const swap = await SwapModel.getByHashlock(hashlock);
        const resolver = await ResolverModel.getById(swap.resolver_id);

        // Step 2: Trigger resolver to lock TRX on TRON
        console.log('🔒 Triggering resolver TRX lock...');
        const resolverResult = await resolverManager.executeSwapWithResolver(swap, resolver);

        if (!resolverResult.success) {
            return res.status(400).json({ 
                error: 'Resolver TRX lock failed', 
                details: resolverResult.error 
            });
        }

        // Update swap status in database
        await SwapModel.updateTransaction(hashlock, 'tron_lock_tx', resolverResult.txHash);
        await SwapModel.updateStatus(hashlock, 'both_locked');

        res.json({
            success: true,
            message: 'ETH lock submitted and resolver TRX lock triggered',
            ethLockTx: txHash,
            trxLockTx: resolverResult.txHash,
            resolver: {
                name: resolver.name,
                endpoint: resolver.endpoint
            },
            swap: swap
        });

    } catch (error) {
        console.error('Error submitting ETH lock:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Submit user-signed TRX lock transaction (TRX → ETH)
app.post('/swaps/:hashlock/submit-trx-lock', async (req, res) => {
    try {
        const { hashlock } = req.params;
        const { txHash } = req.body;

        if (!txHash) {
            return res.status(400).json({ error: 'Missing transaction hash' });
        }

        console.log('📝 Submitting user TRX lock transaction:', txHash);

        // Update swap status in database
        await SwapModel.updateTransaction(hashlock, 'tron_lock_tx', txHash);
        await SwapModel.updateStatus(hashlock, 'trx_locked');

        // Get swap and resolver details
        const swap = await SwapModel.getByHashlock(hashlock);
        const resolver = await ResolverModel.getById(swap.resolver_id);

        // Step 2: Trigger resolver to lock ETH on Ethereum
        console.log('🔒 Triggering resolver ETH lock...');
        const resolverResult = await resolverManager.executeSwapWithResolver(swap, resolver);

        if (!resolverResult.success) {
            return res.status(400).json({ 
                error: 'Resolver ETH lock failed', 
                details: resolverResult.error 
            });
        }

        // Update swap status in database
        await SwapModel.updateTransaction(hashlock, 'eth_lock_tx', resolverResult.txHash);
        await SwapModel.updateStatus(hashlock, 'both_locked');

        res.json({
            success: true,
            message: 'TRX lock submitted and resolver ETH lock triggered',
            trxLockTx: txHash,
            ethLockTx: resolverResult.txHash,
            resolver: {
                name: resolver.name,
                endpoint: resolver.endpoint
            },
            swap: swap
        });

    } catch (error) {
        console.error('Error submitting TRX lock:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Execute complete HTLC swap using resolver bot (TRX → ETH)
app.post('/swaps/:hashlock/execute-trx-to-eth', async (req, res) => {
    try {
        const { hashlock } = req.params;

        console.log('🚀 Executing TRX → ETH swap with resolver bot for hashlock:', hashlock);

        // Get swap details from database
        const swap = await SwapModel.getByHashlock(hashlock);
        if (!swap) {
            return res.status(404).json({ error: 'Swap not found' });
        }

        // Get resolver details
        const resolver = await ResolverModel.getById(swap.resolver_id);
        if (!resolver) {
            return res.status(404).json({ error: 'Resolver not found' });
        }

        const timelock = calculateTimelock();
        const trxAmountInTrx = parseFloat(swap.user_amount); // Amount is already in TRX
        const trxAmountInSun = Math.floor(trxAmountInTrx * 1000000); // Convert TRX to SUN

        // Step 1: Lock TRX on TRON (user does this)
        console.log('Step 1: User locks TRX on TRON...');
        const trxLockResult = await contractInteractor.userLockOnTron(
            hashlock,
            swap.resolver_tron_address,
            '0x0000000000000000000000000000000000000000', // Native TRX
            trxAmountInSun.toString(),
            timelock
        );

        if (!trxLockResult.success) {
            return res.status(400).json({ error: 'TRX lock failed', details: trxLockResult.error });
        }

        // Update swap status in database
        await SwapModel.updateTransaction(hashlock, 'tron_lock_tx', trxLockResult.txHash);
        await SwapModel.updateStatus(hashlock, 'trx_locked');

        // Step 2: Resolver locks ETH on Ethereum via HTTP
        console.log('Step 2: Resolver locks ETH on Ethereum via HTTP...');
        const resolverResult = await resolverManager.executeSwapWithResolver(swap, resolver);

        if (!resolverResult.success) {
            return res.status(400).json({ 
                error: 'Resolver ETH lock failed', 
                details: resolverResult.error 
            });
        }

        // Update swap status in database
        await SwapModel.updateTransaction(hashlock, 'eth_lock_tx', resolverResult.txHash);
        await SwapModel.updateStatus(hashlock, 'both_locked');

        res.json({
            success: true,
            message: 'HTLC swap executed successfully with resolver bot',
            trxLockTx: trxLockResult.txHash,
            ethLockTx: resolverResult.txHash,
            resolver: {
                name: resolver.name,
                endpoint: resolver.endpoint
            },
            swap: swap
        });

    } catch (error) {
        console.error('Error executing swap:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Claim swap (user claims on destination chain)
app.post('/swaps/:hashlock/claim', async (req, res) => {
    try {
        const { hashlock } = req.params;
        const { secret, chain = 'ethereum' } = req.body;

        if (!secret) {
            return res.status(400).json({ error: 'Missing secret' });
        }

        console.log(`💰 Claiming on ${chain} with secret:`, secret);

        // Get swap details to determine which wallet to use
        const swap = await SwapModel.getByHashlock(hashlock);
        if (!swap) {
            return res.status(404).json({ error: 'Swap not found' });
        }

        let result;
        if (chain === 'ethereum') {
            // For ETH claims, use user wallet for TRX→ETH, resolver wallet for ETH→TRX
            if (swap.direction === 'trx→eth') {
                // TRX→ETH: User claims ETH
                result = await contractInteractor.userClaimOnEthereum(secret);
            } else {
                // ETH→TRX: Resolver claims ETH (this shouldn't happen in normal flow)
                result = await contractInteractor.claimOnEthereum(secret);
            }
        } else {
            // For TRON claims, use user wallet for ETH→TRX, resolver wallet for TRX→ETH
            if (swap.direction === 'eth→trx') {
                // ETH→TRX: User claims TRX
                result = await contractInteractor.userClaimOnTron(secret);
            } else {
                // TRX→ETH: Resolver claims TRX (this shouldn't happen in normal flow)
                result = await contractInteractor.claimOnTron(secret);
            }
        }

        if (result.success) {
            console.log('✅ Claim successful, updating database...');
            console.log('   Chain:', chain);
            console.log('   Transaction Hash:', result.txHash);
            
            // Update swap status in database
            try {
                if (chain === 'ethereum') {
                    console.log('   Updating ETH claim transaction...');
                    await SwapModel.updateTransaction(hashlock, 'eth_claim_tx', result.txHash);
                } else {
                    console.log('   Updating TRON claim transaction...');
                    await SwapModel.updateTransaction(hashlock, 'tron_claim_tx', result.txHash);
                }
                console.log('   Updating status to claimed...');
                await SwapModel.updateStatus(hashlock, 'claimed');
                console.log('✅ Database updated successfully');
            } catch (dbError) {
                console.error('❌ Database update failed:', dbError);
                // Still return success since the claim worked
            }

            res.json({
                success: true,
                txHash: result.txHash,
                message: `${chain} claim successful`
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }

    } catch (error) {
        console.error('Error claiming:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Trigger resolver claim with secret (for automated claims)
app.post('/swaps/:hashlock/trigger-resolver-claim', async (req, res) => {
    try {
        const { hashlock } = req.params;
        const { secret } = req.body; // Optional - will extract from transaction if not provided

        console.log(`💰 Triggering resolver claim for hashlock:`, hashlock);

        // Get swap details from database
        const swap = await SwapModel.getByHashlock(hashlock);
        if (!swap) {
            return res.status(404).json({ error: 'Swap not found' });
        }

        // Get resolver details
        const resolver = await ResolverModel.getById(swap.resolver_id);
        if (!resolver) {
            return res.status(404).json({ error: 'Resolver not found' });
        }

        // Validate that user claim has been completed before resolver can claim
        if (swap.direction === 'trx→eth') {
            // For TRX→ETH: Check that user has claimed ETH
            if (!swap.eth_claim_tx) {
                return res.status(400).json({ 
                    error: 'User ETH claim not completed yet. Please wait for user to claim ETH on Ethereum first.' 
                });
            }
            console.log('✅ User ETH claim confirmed:', swap.eth_claim_tx);
        } else if (swap.direction === 'eth→trx') {
            // For ETH→TRX: Check that user has claimed TRX
            if (!swap.tron_claim_tx) {
                return res.status(400).json({ 
                    error: 'User TRX claim not completed yet. Please wait for user to claim TRX on TRON first.' 
                });
            }
            console.log('✅ User TRX claim confirmed:', swap.tron_claim_tx);
        }

        // Extract secret from user's claim transaction if not provided
        let secretToUse = secret;
        if (!secretToUse) {
            try {
                if (swap.direction === 'trx→eth') {
                    // For TRX→ETH: Extract from user's ETH claim
                    secretToUse = await extractSecretFromTransaction(swap.eth_claim_tx, 'ethereum');
                } else if (swap.direction === 'eth→trx') {
                    // For ETH→TRX: Extract from user's TRX claim
                    secretToUse = await extractSecretFromTransaction(swap.tron_claim_tx, 'tron');
                }
            } catch (extractError) {
                return res.status(400).json({ 
                    error: `Failed to extract secret from transaction: ${extractError.message}. Please provide secret manually.` 
                });
            }
        }

        // Log the secret being used for debugging
        console.log(`🔑 Using secret for resolver claim: ${secretToUse}`);
        console.log(`🔑 Secret length: ${secretToUse.length} characters`);
        console.log(`🔑 Secret format: ${secretToUse.startsWith('0x') ? 'Valid hex' : 'Invalid format'}`);
        
        // Trigger resolver claim via HTTP
        const result = await resolverManager.triggerResolverClaim(swap, resolver, secretToUse);

        if (result.success) {
            console.log('✅ Resolver claim successful:', result.txHash);
            
            // Update database with resolver claim transaction hash
            if (swap.direction === 'eth→trx') {
                // ETH→TRX: Resolver claims ETH
                await SwapModel.updateTransaction(hashlock, 'eth_claim_tx', result.txHash);
            } else if (swap.direction === 'trx→eth') {
                // TRX→ETH: Resolver claims TRX
                await SwapModel.updateTransaction(hashlock, 'tron_claim_tx', result.txHash);
            }
            
            // Update swap status to completed
            await SwapModel.updateStatus(hashlock, 'claimed');
            
            res.json({
                success: true,
                txHash: result.txHash,
                message: 'Resolver claim triggered successfully',
                resolver: {
                    name: resolver.name,
                    endpoint: resolver.endpoint
                }
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }

            } catch (error) {
            console.error('Error triggering resolver claim:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

// Get claim transaction parameters for frontend signing
app.post('/swaps/:hashlock/claim-params', async (req, res) => {
    try {
        const { hashlock } = req.params;
        const { secret, chain = 'ethereum' } = req.body;

        if (!secret) {
            return res.status(400).json({ error: 'Missing secret' });
        }

        console.log(`💰 Getting claim parameters for ${chain} with secret:`, secret);

        // Get swap details
        const swap = await SwapModel.getByHashlock(hashlock);
        if (!swap) {
            return res.status(404).json({ error: 'Swap not found' });
        }

        let transactionParams;
        if (chain === 'ethereum') {
            // For ETH claims, use user wallet for TRX→ETH
            if (swap.direction === 'trx→eth') {
                // TRX→ETH: User claims ETH
                const functionData = ethContract.interface.encodeFunctionData('claim', [secret]);
                transactionParams = {
                    to: CONFIG.ETH_SEPOLIA.CONTRACT_ADDRESS,
                    data: functionData,
                    value: '0x0',
                    chainId: CONFIG.ETH_SEPOLIA.CHAIN_ID
                };
            } else {
                return res.status(400).json({ error: 'Invalid claim direction for Ethereum' });
            }
        } else {
            // For TRON claims, use user wallet for ETH→TRX
            if (swap.direction === 'eth→trx') {
                // ETH→TRX: User claims TRX
                transactionParams = {
                    contractAddress: CONFIG.TRON_NILE.CONTRACT_ADDRESS,
                    functionName: 'claim',
                    parameters: [secret],
                    callValue: 0,
                    feeLimit: 1000000000
                };
            } else {
                return res.status(400).json({ error: 'Invalid claim direction for TRON' });
            }
        }

        res.json({
            success: true,
            transactionParams: transactionParams,
            swap: swap
        });

    } catch (error) {
        console.error('Error getting claim parameters:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Submit user-signed claim transaction
app.post('/swaps/:hashlock/submit-claim', async (req, res) => {
    try {
        const { hashlock } = req.params;
        const { chain, txHash } = req.body;

        if (!txHash) {
            return res.status(400).json({ error: 'Missing transaction hash' });
        }

        console.log(`💰 Submitting ${chain} claim transaction:`, txHash);

        // Get swap details
        const swap = await SwapModel.getByHashlock(hashlock);
        if (!swap) {
            return res.status(404).json({ error: 'Swap not found' });
        }

        // Update database with claim transaction hash
        try {
            if (chain === 'ethereum') {
                await SwapModel.updateTransaction(hashlock, 'eth_claim_tx', txHash);
            } else {
                await SwapModel.updateTransaction(hashlock, 'tron_claim_tx', txHash);
            }
            await SwapModel.updateStatus(hashlock, 'claimed');
            console.log('✅ Database updated successfully');
        } catch (dbError) {
            console.error('❌ Database update failed:', dbError);
        }

        res.json({
            success: true,
            message: `${chain} claim submitted successfully`
        });

    } catch (error) {
        console.error('Error submitting claim:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get lock parameters for a swap
app.get('/swaps/:hashlock/lock-params', async (req, res) => {
    try {
        const { hashlock } = req.params;
        const swap = await SwapModel.getByHashlock(hashlock);
        
        if (!swap) {
            return res.status(404).json({ error: 'Swap not found' });
        }

    // Generate fresh secret and hashlock for this request
    const secret = generateSecret();
    const newHashlock = generateHashlock(secret);
    const timelock = calculateTimelock();

        res.json({
            hashlock: newHashlock,
            timelock,
            secret, // Only for testing
            direction: swap.direction,
            amount: swap.amount
        });
    } catch (error) {
        console.error('Error getting lock params:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get swap state from contract
app.get('/swaps/:hashlock/state', async (req, res) => {
    try {
        const { hashlock } = req.params;
        const { chain = 'ethereum' } = req.query;

        const result = await contractInteractor.getSwapState(hashlock, chain);

        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }

    } catch (error) {
        console.error('Error getting swap state:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get contract addresses and configuration
app.get('/config', (req, res) => {
    res.json({
        ethereum: {
            contractAddress: CONFIG.ETH_SEPOLIA.CONTRACT_ADDRESS,
            rpcUrl: CONFIG.ETH_SEPOLIA.RPC_URL,
            chainId: CONFIG.ETH_SEPOLIA.CHAIN_ID,
            walletAddress: ethWallet.address
        },
        tron: {
            contractAddress: CONFIG.TRON_NILE.CONTRACT_ADDRESS,
            rpcUrl: CONFIG.TRON_NILE.RPC_URL,
            chainId: CONFIG.TRON_NILE.CHAIN_ID,
            walletAddress: tronWallet
        },
        timelockDuration: CONFIG.TIMELOCK_DURATION,
        defaultAmount: CONFIG.SWAP_AMOUNT.toString()
    });
});

// Get wallet balances for debugging
app.get('/balances', async (req, res) => {
    try {
        const balances = await contractInteractor.getBalances();
        
        // Calculate test amounts in different units
        const testAmountEth = 0.001;
        const testAmountTrx = testAmountEth * 11265.12; // 1 ETH = 11,265.12 TRX
        const testAmountEthWei = ethers.parseEther('0.001').toString();
        const testAmountTrxSun = Math.floor(testAmountTrx * 1000000).toString(); // Convert TRX to SUN
        
        res.json({
            success: true,
            balances,
            testAmount: {
                eth: `${testAmountEth} ETH`,
                trx: `${testAmountTrx.toFixed(2)} TRX`,
                ethWei: testAmountEthWei,
                trxSun: testAmountTrxSun
            },
            conversion: {
                ethToWei: '1 ETH = 1000000000000000000 WEI',
                trxToSun: '1 TRX = 1000000 SUN',
                exchangeRate: `1 ETH = ${11265.12} TRX`
            }
        });
    } catch (error) {
        console.error('Error getting balances:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Debug endpoint to extract secret from transaction
app.post('/debug/extract-secret', async (req, res) => {
    try {
        const { txHash, chain = 'ethereum' } = req.body;
        
        if (!txHash) {
            return res.status(400).json({ error: 'Missing transaction hash' });
        }

        console.log(`🔍 Debug: Extracting secret from ${chain} transaction: ${txHash}`);
        
        const extractedSecret = await extractSecretFromTransaction(txHash, chain);
        
        res.json({
            success: true,
            txHash,
            chain,
            extractedSecret,
            message: 'Secret extracted successfully'
        });
    } catch (error) {
        console.error('❌ Debug secret extraction failed:', error.message);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 ResolverX HTLC Backend running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔧 Config: http://localhost:${PORT}/config`);
    console.log(`📋 Swaps: http://localhost:${PORT}/swaps`);
    console.log(`🔑 ETH Wallet: ${ethWallet.address}`);
    console.log(`🔑 TRON Wallet: ${tronWallet}`);
    console.log(`⚠️ Note: Event listeners may not be available with current RPC provider`);
    console.log(`📝 You can still execute swaps and monitor them manually`);
});

module.exports = app;
