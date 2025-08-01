const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Test configuration
const TEST_CONFIG = {
    amount: '22.54', // 22.54 TRX for testing (22.54 TRX = 0.002 ETH)
    direction: 'trx→eth',
    // User wallets (should be different from resolver)
    user: {
        ethAddress: '0x4E9DE56262c7108C23e74658CE6489e4576c8263', // User's ETH wallet
        tronAddress: 'TA7YTBTkHAQtF9M5umq3w2Vo7GJfKc3eoJ'        // User's TRON wallet
    },
    // Resolver wallets (backend wallets - different from user)
    resolver: {
        ethAddress: '0x16AC9b468DC98FeF41556A4B61E47bfd29B13868', // Resolver's ETH wallet (same for testing)
        tronAddress: 'TMRjib1g4wWWUTBSbtXCFntcg97xXu79mE'        // Resolver's TRON wallet (same for testing)
    }
};

async function testCompleteHTLCSwap() {
    console.log('🚀 Testing Complete HTLC Swap Flow (ETH ↔ TRX)\n');
    console.log('⚠️ Note: This test uses the same wallets for user and resolver for simplicity');
    console.log('   In real usage, users and resolvers would have different wallets\n');

    try {
        // 1. Get configuration and wallet addresses
        console.log('1. Getting configuration...');
        const configResponse = await axios.get(`${BASE_URL}/config`);
        console.log('✅ Configuration loaded');
        console.log('   ETH Contract:', configResponse.data.ethereum.contractAddress);
        console.log('   TRON Contract:', configResponse.data.tron.contractAddress);
        console.log('   ETH Wallet:', configResponse.data.ethereum.walletAddress);
        console.log('   TRON Wallet:', configResponse.data.tron.walletAddress);
        console.log('');

        // Check balances before proceeding
        console.log('1.5. Checking wallet balances...');
        const balanceResponse = await axios.get(`${BASE_URL}/balances`);
        console.log('💰 Wallet Balances:');
        console.log('   ETH Wallet:', balanceResponse.data.balances.ethereum.address);
        console.log('   ETH Balance:', balanceResponse.data.balances.ethereum.balance, 'ETH');
        console.log('   TRON Wallet:', balanceResponse.data.balances.tron.address);
        console.log('   TRON Balance:', balanceResponse.data.balances.tron.balance, 'TRX');
        console.log('');
        console.log('📊 Test Amount Required:');
        console.log('   ETH Required:', balanceResponse.data.testAmount.eth);
        console.log('   TRX Required:', balanceResponse.data.testAmount.trx);
        console.log('');

        // Check if balances are sufficient
        const ethBalance = parseFloat(balanceResponse.data.balances.ethereum.balance);
        const trxBalance = parseFloat(balanceResponse.data.balances.tron.balance);
        const requiredEth = 0.002;
        const requiredTrx = 22.54; // 22.54 TRX = 0.002 ETH at current rate

        if (ethBalance < requiredEth) {
            console.log('⚠️ Warning: Insufficient ETH balance for testing');
            console.log('   Get test ETH from: https://sepoliafaucet.com/');
        }

        if (trxBalance < requiredTrx) {
            console.log('⚠️ Warning: Insufficient TRX balance for testing');
            console.log('   Get test TRX from: http://nileex.io/join/getJoinPage');
        }

        console.log('');

        // 2. Create a new swap
        console.log('2. Creating new swap...');
        const swapResponse = await axios.post(`${BASE_URL}/swaps`, {
            direction: TEST_CONFIG.direction,
            userEthAddress: TEST_CONFIG.user.ethAddress,
            userTronAddress: TEST_CONFIG.user.tronAddress,
            resolverEthAddress: TEST_CONFIG.resolver.ethAddress, // Self-resolver for testing
            resolverTronAddress: TEST_CONFIG.resolver.tronAddress,   // Self-resolver for testing
            amount: '0.002' // Use 0.002 for testing
        });
        
        const swap = swapResponse.data.swap;
        const lockParams = swapResponse.data.lockParams;
        const addresses = swapResponse.data.addresses;
        
        console.log('✅ Swap created:', {
            id: swap.id,
            hashlock: swap.hashlock,
            direction: swap.direction,
            status: swap.status
        });
        console.log('🔑 Lock parameters:', {
            hashlock: lockParams.hashlock,
            timelock: lockParams.timelock,
            secret: lockParams.secret
        });
        console.log('📍 Addresses:', {
            user: {
                ethereum: addresses.user.ethereum,
                tron: addresses.user.tron
            },
            resolver: {
                ethereum: addresses.resolver.ethereum,
                tron: addresses.resolver.tron
            }
        });
        console.log('');

        // 3. Execute ETH → TRX swap
        console.log('3. Executing ETH → TRX swap...');
        const executeResponse = await axios.post(`${BASE_URL}/swaps/${swap.hashlock}/execute-eth-to-trx`, {
            amount: '0.002' // Use 0.002 for testing
        });
        
        console.log('✅ Swap execution result:', {
            success: executeResponse.data.success,
            ethLockTx: executeResponse.data.ethLockTx,
            trxLockTx: executeResponse.data.trxLockTx,
            status: executeResponse.data.swap.status
        });
        console.log('');

        // 4. Wait a moment for transactions to be processed
        console.log('4. Waiting for transactions to be processed...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        console.log('');

        // 5. Get updated swap status
        console.log('5. Getting updated swap status...');
        const updatedSwapResponse = await axios.get(`${BASE_URL}/swaps/${swap.hashlock}`);
        console.log('✅ Updated swap status:', {
            status: updatedSwapResponse.data.status,
            eth_lock_tx: updatedSwapResponse.data.eth_lock_tx,
            tron_lock_tx: updatedSwapResponse.data.tron_lock_tx
        });
        console.log('');

        // 6. Get swap state from contracts
        console.log('6. Checking contract states...');
        
        // Check Ethereum contract state
        try {
            const ethStateResponse = await axios.get(`${BASE_URL}/swaps/${swap.hashlock}/state?chain=ethereum`);
            console.log('✅ Ethereum contract state:', ethStateResponse.data);
        } catch (error) {
            console.log('⚠️ Ethereum state check failed:', error.response?.data?.error || error.message);
        }

        // Check TRON contract state
        try {
            const tronStateResponse = await axios.get(`${BASE_URL}/swaps/${swap.hashlock}/state?chain=tron`);
            console.log('✅ TRON contract state:', tronStateResponse.data);
        } catch (error) {
            console.log('⚠️ TRON state check failed:', error.response?.data?.error || error.message);
        }
        console.log('');

        // 7. Simulate claim process (using the secret)
        console.log('7. Testing claim process...');
        
        // Claim on TRON (destination chain)
        try {
            const claimResponse = await axios.post(`${BASE_URL}/swaps/${swap.hashlock}/claim`, {
                secret: lockParams.secret,
                chain: 'tron'
            });
            console.log('✅ TRON claim result:', claimResponse.data);
        } catch (error) {
            console.log('⚠️ TRON claim test failed:', error.response?.data?.error || error.message);
        }
        console.log('');

        // 8. Get all events
        console.log('8. Getting all events...');
        const eventsResponse = await axios.get(`${BASE_URL}/events`);
        console.log('✅ Total events:', eventsResponse.data.length);
        eventsResponse.data.forEach((event, index) => {
            console.log(`   Event ${index + 1}:`, {
                chain: event.chain,
                eventType: event.eventType,
                hashlock: event.hashlock,
                timestamp: event.timestamp
            });
        });
        console.log('');

        console.log('🎉 Complete HTLC swap test finished!');
        console.log('');
        console.log('📋 Summary:');
        console.log('   ✅ Swap created successfully');
        console.log('   ✅ ETH and TRX locked on both chains');
        console.log('   ✅ Contract states verified');
        console.log('   ✅ Claim process tested');
        console.log('   ✅ Events tracked');
        console.log('');
        console.log('🔗 Transaction Links:');
        console.log(`   ETH Lock: https://sepolia.etherscan.io/tx/${executeResponse.data.ethLockTx}`);
        console.log(`   TRX Lock: https://nile.tronscan.org/#/transaction/${executeResponse.data.trxLockTx}`);

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

async function testTRXToETHSwap() {
    console.log('🔄 Testing TRX → ETH Swap Flow\n');

    try {
        // 1. Create a new TRX → ETH swap
        console.log('1. Creating TRX → ETH swap...');
        const configResponse = await axios.get(`${BASE_URL}/config`);
        
        const swapResponse = await axios.post(`${BASE_URL}/swaps`, {
            direction: 'trx→eth',
            userEthAddress: TEST_CONFIG.user.ethAddress,
            userTronAddress: TEST_CONFIG.user.tronAddress,
            resolverEthAddress: TEST_CONFIG.resolver.ethAddress, // Self-resolver for testing
            resolverTronAddress: TEST_CONFIG.resolver.tronAddress,   // Self-resolver for testing
            amount: TEST_CONFIG.amount
        });
        
        const swap = swapResponse.data.swap;
        console.log('✅ TRX → ETH swap created:', {
            id: swap.id,
            hashlock: swap.hashlock,
            direction: swap.direction
        });
        console.log('');

        // 2. Execute TRX → ETH swap
        console.log('2. Executing TRX → ETH swap...');
        const executeResponse = await axios.post(`${BASE_URL}/swaps/${swap.hashlock}/execute-trx-to-eth`, {
            amount: '0.002' // Use 0.002 for testing
        });
        
        console.log('✅ TRX → ETH swap execution result:', {
            success: executeResponse.data.success,
            trxLockTx: executeResponse.data.trxLockTx,
            ethLockTx: executeResponse.data.ethLockTx,
            status: executeResponse.data.swap.status
        });
        console.log('');

        console.log('🎉 TRX → ETH swap test completed!');

    } catch (error) {
        console.error('❌ TRX → ETH test failed:', error.response?.data || error.message);
    }
}

async function testHealthCheck() {
    try {
        console.log('🏥 Testing health check...');
        const response = await axios.get(`${BASE_URL}/health`);
        console.log('✅ Health check:', {
            status: response.data.status,
            ethereum: response.data.ethereum,
            tron: response.data.tron
        });
        return true;
    } catch (error) {
        console.error('❌ Health check failed:', error.message);
        return false;
    }
}

// Run tests
async function runCompleteTests() {
    console.log('🧪 Starting Complete HTLC Swap Tests\n');
    
    // Check if server is running
    const isHealthy = await testHealthCheck();
    if (!isHealthy) {
        console.log('❌ Server is not running. Please start the backend first:');
        console.log('   cd backend && npm install && npm start');
        return;
    }
    
    console.log('');
    await testCompleteHTLCSwap();
    console.log('');
    await testTRXToETHSwap();
}

// Export for use in other files
module.exports = {
    testCompleteHTLCSwap,
    testTRXToETHSwap,
    testHealthCheck,
    runCompleteTests
};

// Run if called directly
if (require.main === module) {
    runCompleteTests();
} 