require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testUserWalletFlow() {
    console.log('🔄 Testing User Wallet Signing Flow (ETH→TRX)\n');

    try {
        // Step 1: Create swap with automatic resolver selection
        console.log('📝 Step 1: Creating swap with automatic resolver selection...');
        const swapData = {
            direction: 'eth→trx',
            userEthAddress: '0x4E9DE56262c7108C23e74658CE6489e4576c8263', // User's ETH address
            userTronAddress: 'TA7YTBTkHAQtF9M5umq3w2Vo7GJfKc3eoJ', // User's TRON address
            amount: '0.002'
        };

        const createSwapResponse = await axios.post(`${BASE_URL}/swaps`, swapData);
        const swap = createSwapResponse.data.swap;
        
        console.log('✅ Swap created:');
        console.log('   Hashlock:', swap.hashlock);
        console.log('   Direction:', swap.direction);
        console.log('   User Amount:', swap.user_amount, 'ETH');
        console.log('   Resolver Fee:', swap.resolver_fee, 'ETH');
        console.log('   Total Amount:', swap.amount, 'ETH');
        console.log('   Resolver:', createSwapResponse.data.resolver.name);
        console.log('');

        // Step 2: Get ETH lock transaction parameters for frontend signing
        console.log('🔍 Step 2: Getting ETH lock transaction parameters...');
        const lockParamsResponse = await axios.get(`${BASE_URL}/swaps/${swap.hashlock}/eth-lock-params`);
        const lockParams = lockParamsResponse.data;
        
        console.log('✅ ETH lock parameters received:');
        console.log('   Contract Address:', lockParams.transactionParams.to);
        console.log('   Transaction Data:', lockParams.transactionParams.data.substring(0, 66) + '...');
        console.log('   Value (Wei):', lockParams.transactionParams.value);
        console.log('   Chain ID:', lockParams.transactionParams.chainId);
        console.log('');

        // Step 3: Simulate frontend signing (in real app, user would sign with MetaMask)
        console.log('✍️ Step 3: Simulating user wallet signing...');
        console.log('   In the real frontend, the user would:');
        console.log('   1. Call window.ethereum.request() with the transaction parameters');
        console.log('   2. MetaMask would show a popup for user to sign');
        console.log('   3. User would approve the transaction');
        console.log('   4. MetaMask would return the transaction hash');
        console.log('');

        // Simulate a signed transaction hash (in real app, this comes from MetaMask)
        const simulatedTxHash = '0x' + 'a'.repeat(64); // Simulated transaction hash
        console.log('   Simulated transaction hash:', simulatedTxHash);
        console.log('');

        // Step 4: Submit the signed transaction to backend
        console.log('📤 Step 4: Submitting signed transaction to backend...');
        const submitResponse = await axios.post(`${BASE_URL}/swaps/${swap.hashlock}/submit-eth-lock`, {
            txHash: simulatedTxHash
        });
        
        console.log('✅ Transaction submitted:');
        console.log('   ETH Lock TX (User):', submitResponse.data.ethLockTx);
        console.log('   TRX Lock TX (Resolver):', submitResponse.data.trxLockTx);
        console.log('   Message:', submitResponse.data.message);
        console.log('');

        // Step 5: Check final swap status
        console.log('📊 Step 5: Final swap status...');
        const swapStatusResponse = await axios.get(`${BASE_URL}/swaps/${swap.hashlock}`);
        const finalSwap = swapStatusResponse.data;
        
        console.log('✅ User wallet flow completed:');
        console.log('   Status:', finalSwap.status);
        console.log('   ETH Lock TX (User):', finalSwap.eth_lock_tx);
        console.log('   TRX Lock TX (Resolver):', finalSwap.tron_lock_tx);
        console.log('');

        console.log('🎉 User wallet signing flow successful!');
        console.log('');
        console.log('📋 Flow Summary:');
        console.log('   1. Frontend creates swap via backend API');
        console.log('   2. Backend returns transaction parameters');
        console.log('   3. Frontend asks user to sign with their wallet');
        console.log('   4. User signs transaction in MetaMask/TronLink');
        console.log('   5. Frontend submits signed transaction to backend');
        console.log('   6. Backend coordinates with resolver bot');
        console.log('');
        console.log('🔐 Security Benefits:');
        console.log('   - User controls their own private keys');
        console.log('   - Backend never sees user private keys');
        console.log('   - User signs transactions in their wallet');
        console.log('   - Backend only coordinates the swap process');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        console.log('');
        console.log('💡 Make sure:');
        console.log('   - Backend is running on port 3000');
        console.log('   - Resolver bot is running on port 3001');
        console.log('   - Database is connected');
    }
}

// Run test
testUserWalletFlow(); 