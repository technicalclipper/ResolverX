const express = require('express');
const ethers = require('ethers');
const crypto = require('crypto');
const TronWeb = require('tronweb');
const { eth_sepolia_abi } = require('./abi');

const app = express();
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
    SWAP_AMOUNT: ethers.parseEther('0.001') // 0.001 ETH/TRX for testing
};

// In-memory storage for swaps (replace with database in production)
const swaps = new Map();
const swapEvents = [];

// Initialize providers
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

// Initialize TronWeb with user's private key for claiming
const userTronWeb = new TronWeb({
    fullHost: CONFIG.TRON_NILE.RPC_URL,
    privateKey: 'fb3e5ebb71816364003ea9b300b04252d5d48ee48674dfed8a19340daad8315f' // User's TRON private key
});

// Initialize wallets (Dual Address Setup)
const ethWallet = new ethers.Wallet(CONFIG.ETH_SEPOLIA.PRIVATE_KEY, ethProvider);
const tronWallet = tronWeb.defaultAddress.base58;

console.log('🔐 Triple Address Setup for Cross-Chain Swaps:');
console.log('🔑 Ethereum Address (0x...):', ethWallet.address);
console.log('🔑 TRON Resolver Address (T...):', tronWallet);
console.log('🔑 TRON User Address (T...):', userTronWeb.defaultAddress.base58);
console.log('');
console.log('📋 Address Usage:');
console.log('   ETH Address: Lock/Receive ETH on Ethereum chain');
console.log('   TRON Resolver Address: Lock TRX on TRON chain (resolver)');
console.log('   TRON User Address: Claim TRX on TRON chain (user)');
console.log('');

// Contract interaction class
class ContractInteractor {
    constructor() {
        this.ethProvider = ethProvider;
        this.ethContract = ethContract;
        this.tronWeb = tronWeb;
        this.ethWallet = ethWallet;
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
            const userTronBalance = await userTronWeb.trx.getBalance(userTronWeb.defaultAddress.base58);
            const userTronBalanceTrx = userTronBalance / 1000000; // Convert SUN to TRX

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
                    address: userTronWeb.defaultAddress.base58,
                    balance: userTronBalanceTrx,
                    balanceSun: userTronBalance
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
            
            // Convert amount from wei to TRX, then to SUN
            const amountInEth = parseFloat(ethers.formatEther(amount)); // Convert wei to ETH
            const amountInTrx = amountInEth; // 1:1 ratio for testing
            const amountInSun = Math.floor(amountInTrx * 1000000); // Convert TRX to SUN

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

    async claimOnTron(preimage) {
        try {
            console.log('💰 Claiming on TRON with preimage:', preimage);

            const result = await userTronWeb.contract().at(CONFIG.TRON_NILE.CONTRACT_ADDRESS)
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
                const result = await tronWeb.contract().at(CONFIG.TRON_NILE.CONTRACT_ADDRESS)
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
        swapEvents.push({
            id: swapEvents.length + 1,
            chain,
            eventType: 'HTLCLocked',
            hashlock,
            sender,
            recipient,
            token,
            amount: amount.toString(),
            timelock: timelock.toString(),
            timestamp: new Date()
        });

        // Update swap status if exists
        if (swaps.has(hashlock)) {
            const swap = swaps.get(hashlock);
            if (chain === 'ethereum') {
                swap.eth_lock_tx = 'pending'; // In real implementation, get from transaction
                swap.status = 'locked';
            } else {
                swap.tron_lock_tx = 'pending';
            }
            swaps.set(hashlock, swap);
        }
    }

    handleHTLCClaimed(chain, hashlock, preimage) {
        console.log(`${chain.toUpperCase()} HTLC Claimed:`, { hashlock, preimage });

        swapEvents.push({
            id: swapEvents.length + 1,
            chain,
            eventType: 'HTLCClaimed',
            hashlock,
            preimage,
            timestamp: new Date()
        });

        // Extract secret and trigger cross-chain claim
        this.handleSecretRevealed(chain, hashlock, preimage);
    }

    handleHTLCRefunded(chain, hashlock) {
        console.log(`${chain.toUpperCase()} HTLC Refunded:`, { hashlock });

        swapEvents.push({
            id: swapEvents.length + 1,
            chain,
            eventType: 'HTLCRefunded',
            hashlock,
            timestamp: new Date()
        });
    }

    handleSecretRevealed(chain, hashlock, preimage) {
        const swap = swaps.get(hashlock);
        if (!swap) return;

        // Store the revealed secret
        swap.secret = preimage;
        swaps.set(hashlock, swap);

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
        const result = await contractInteractor.claimOnEthereum(preimage);
        if (result.success) {
            console.log('✅ ETH claim successful:', result.txHash);
        } else {
            console.error('❌ ETH claim failed:', result.error);
        }
    }

    async triggerTronClaim(hashlock, preimage) {
        console.log('Triggering TRON claim with secret:', preimage);
        const result = await contractInteractor.claimOnTron(preimage);
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
app.get('/swaps', (req, res) => {
    const swapsArray = Array.from(swaps.values());
    res.json(swapsArray);
});

// Get swap by hashlock
app.get('/swaps/:hashlock', (req, res) => {
    const { hashlock } = req.params;
    const swap = swaps.get(hashlock);
    
    if (!swap) {
        return res.status(404).json({ error: 'Swap not found' });
    }
    
    res.json(swap);
});

// Get swap events
app.get('/events', (req, res) => {
    res.json(swapEvents);
});

// Create new swap
app.post('/swaps', async (req, res) => {
    try {
        const { direction, userEthAddress, userTronAddress, resolverEthAddress, resolverTronAddress, amount } = req.body;

        // Validate input for dual address requirement
        if (!direction || !userEthAddress || !userTronAddress || !resolverEthAddress || !resolverTronAddress) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                required: {
                    direction: 'eth-to-trx or trx-to-eth',
                    userEthAddress: 'Ethereum address (0x...)',
                    userTronAddress: 'TRON address (T...)',
                    resolverEthAddress: 'Resolver Ethereum address (0x...)',
                    resolverTronAddress: 'Resolver TRON address (T...)'
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

        // Generate secret and hashlock
        const secret = generateSecret();
        const hashlock = generateHashlock(secret);
        const timelock = calculateTimelock();

        // Create swap record with dual addresses
        const swap = {
            id: swaps.size + 1,
            direction,
            hashlock,
            secret: null, // Will be revealed when claimed
            user_eth_address: userEthAddress,
            user_tron_address: userTronAddress,
            resolver_eth_address: resolverEthAddress,
            resolver_tron_address: resolverTronAddress,
            amount: amount || CONFIG.SWAP_AMOUNT.toString(),
            token_address: '0x0000000000000000000000000000000000000000', // Native token
            status: 'initiated',
            eth_lock_tx: null,
            tron_lock_tx: null,
            eth_claim_tx: null,
            tron_claim_tx: null,
            eth_refund_tx: null,
            tron_refund_tx: null,
            timelock,
            created_at: new Date(),
            updated_at: new Date(),
            completed_at: null
        };

        // Store swap
        swaps.set(hashlock, swap);

        res.json({
            success: true,
            swap,
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
                    ethereum: resolverEthAddress,
                    tron: resolverTronAddress
                }
            }
        });

    } catch (error) {
        console.error('Error creating swap:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Execute complete HTLC swap (ETH → TRX)
app.post('/swaps/:hashlock/execute-eth-to-trx', async (req, res) => {
    try {
        const { hashlock } = req.params;
        const { amount = '0.01' } = req.body;

        console.log('🚀 Executing ETH → TRX swap for hashlock:', hashlock);

        // Get swap details
        const swap = swaps.get(hashlock);
        if (!swap) {
            return res.status(404).json({ error: 'Swap not found' });
        }

        const timelock = calculateTimelock();
        const ethAmount = ethers.parseEther(amount);
        const trxAmount = ethers.parseEther(amount); // Convert to proper format for TRON

        // Step 1: Lock ETH on Ethereum
        console.log('Step 1: Locking ETH on Ethereum...');
        const ethLockResult = await contractInteractor.lockOnEthereum(
            hashlock,
            swap.resolver_eth_address, // Use resolver's ETH address, not TRON address
            '0x0000000000000000000000000000000000000000', // Native ETH
            ethAmount,
            timelock
        );

        if (!ethLockResult.success) {
            return res.status(400).json({ error: 'ETH lock failed', details: ethLockResult.error });
        }

        // Update swap status
        swap.eth_lock_tx = ethLockResult.txHash;
        swap.status = 'eth_locked';
        swaps.set(hashlock, swap);

        // Step 2: Lock TRX on TRON
        console.log('Step 2: Locking TRX on TRON...');
        const trxLockResult = await contractInteractor.lockOnTron(
            hashlock,
            swap.user_tron_address, // Use user's TRON address
            '0x0000000000000000000000000000000000000000', // Native TRX
            trxAmount.toString(), // Convert to string for TRON
            timelock
        );

        if (!trxLockResult.success) {
            return res.status(400).json({ error: 'TRX lock failed', details: trxLockResult.error });
        }

        // Update swap status
        swap.tron_lock_tx = trxLockResult.txHash;
        swap.status = 'both_locked';
        swaps.set(hashlock, swap);

        res.json({
            success: true,
            message: 'HTLC swap executed successfully',
            ethLockTx: ethLockResult.txHash,
            trxLockTx: trxLockResult.txHash,
            swap: swap
        });

    } catch (error) {
        console.error('Error executing swap:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Execute complete HTLC swap (TRX → ETH)
app.post('/swaps/:hashlock/execute-trx-to-eth', async (req, res) => {
    try {
        const { hashlock } = req.params;
        const { amount = '0.01' } = req.body;

        console.log('🚀 Executing TRX → ETH swap for hashlock:', hashlock);

        // Get swap details
        const swap = swaps.get(hashlock);
        if (!swap) {
            return res.status(404).json({ error: 'Swap not found' });
        }

        const timelock = calculateTimelock();
        const trxAmount = ethers.parseEther(amount); // Convert to proper format for TRON
        const ethAmount = ethers.parseEther(amount); // Convert to proper format for ETH

        // Step 1: Lock TRX on TRON
        console.log('Step 1: Locking TRX on TRON...');
        const trxLockResult = await contractInteractor.lockOnTron(
            hashlock,
            swap.resolver_tron_address, // Use resolver's TRON address
            '0x0000000000000000000000000000000000000000', // Native TRX
            trxAmount.toString(), // Convert to string for TRON
            timelock
        );

        if (!trxLockResult.success) {
            return res.status(400).json({ error: 'TRX lock failed', details: trxLockResult.error });
        }

        // Update swap status
        swap.tron_lock_tx = trxLockResult.txHash;
        swap.status = 'trx_locked';
        swaps.set(hashlock, swap);

        // Step 2: Lock ETH on Ethereum
        console.log('Step 2: Locking ETH on Ethereum...');
        const ethLockResult = await contractInteractor.lockOnEthereum(
            hashlock,
            swap.user_eth_address, // Use user's ETH address
            '0x0000000000000000000000000000000000000000', // Native ETH
            ethAmount,
            timelock
        );

        if (!ethLockResult.success) {
            return res.status(400).json({ error: 'ETH lock failed', details: ethLockResult.error });
        }

        // Update swap status
        swap.eth_lock_tx = ethLockResult.txHash;
        swap.status = 'both_locked';
        swaps.set(hashlock, swap);

        res.json({
            success: true,
            message: 'HTLC swap executed successfully',
            trxLockTx: trxLockResult.txHash,
            ethLockTx: ethLockResult.txHash,
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

        let result;
        if (chain === 'ethereum') {
            result = await contractInteractor.claimOnEthereum(secret);
        } else {
            result = await contractInteractor.claimOnTron(secret);
        }

        if (result.success) {
            // Update swap status
            const swap = swaps.get(hashlock);
            if (swap) {
                if (chain === 'ethereum') {
                    swap.eth_claim_tx = result.txHash;
                } else {
                    swap.tron_claim_tx = result.txHash;
                }
                swap.status = 'claimed';
                swaps.set(hashlock, swap);
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

// Get lock parameters for a swap
app.get('/swaps/:hashlock/lock-params', (req, res) => {
    const { hashlock } = req.params;
    const swap = swaps.get(hashlock);
    
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
        const testAmountTrx = 0.001;
        const testAmountEthWei = ethers.parseEther('0.001').toString();
        const testAmountTrxSun = Math.floor(0.001 * 1000000).toString(); // Convert TRX to SUN
        
        res.json({
            success: true,
            balances,
            testAmount: {
                eth: `${testAmountEth} ETH`,
                trx: `${testAmountTrx} TRX`,
                ethWei: testAmountEthWei,
                trxSun: testAmountTrxSun
            },
            conversion: {
                ethToWei: '1 ETH = 1000000000000000000 WEI',
                trxToSun: '1 TRX = 1000000 SUN'
            }
        });
    } catch (error) {
        console.error('Error getting balances:', error);
        res.status(500).json({ error: 'Internal server error' });
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
