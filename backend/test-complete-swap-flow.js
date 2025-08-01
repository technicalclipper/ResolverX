require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testCompleteSwapFlow() {
    console.log('🔄 Testing Complete Swap Flow (ETH→TRX)\n');

    try {
        // Step 1: Create swap with automatic resolver selection
        console.log('📝 Step 1: Creating swap with automatic resolver selection...');
        const swapData = {
            direction: 'eth→trx',
            userEthAddress: '0x4E9DE56262c7108C23e74658CE6489e4576c8263', // Correct ETH user address
            userTronAddress: 'TA7YTBTkHAQtF9M5umq3w2Vo7GJfKc3eoJ', // User's TRON address (different from resolver)
            amount: '0.002'
        };

        const createSwapResponse = await axios.post(`${BASE_URL}/swaps`, swapData);
        const swap = createSwapResponse.data.swap;
        const secret = createSwapResponse.data.lockParams.secret;
        
        console.log('✅ Swap created:');
        console.log('   Hashlock:', swap.hashlock);
        console.log('   Direction:', swap.direction);
        console.log('   User Amount:', swap.user_amount, 'ETH');
        console.log('   Resolver Fee:', swap.resolver_fee, 'ETH');
        console.log('   Total Amount:', swap.amount, 'ETH');
        console.log('   Resolver:', createSwapResponse.data.resolver.name);
        console.log('   Resolver Fee:', createSwapResponse.data.resolver.fee_percent * 100 + '%');
        console.log('');

        // Step 2: Execute ETH→TRX swap (User locks ETH, Resolver locks TRX)
        console.log('🔒 Step 2: Executing ETH→TRX swap...');
        const executeResponse = await axios.post(`${BASE_URL}/swaps/${swap.hashlock}/execute-eth-to-trx`);
        
        console.log('✅ Swap execution completed:');
        console.log('   ETH Lock TX (User):', executeResponse.data.ethLockTx);
        console.log('   TRX Lock TX (Resolver):', executeResponse.data.trxLockTx);
        console.log('   Resolver:', executeResponse.data.resolver.name);
        console.log('');

        // Step 3: User claims TRX on TRON chain
        console.log('💰 Step 3: User claiming TRX on TRON chain...');
        const userClaimResponse = await axios.post(`${BASE_URL}/swaps/${swap.hashlock}/claim`, {
            secret: secret,
            chain: 'tron'
        });
        
        console.log('✅ User TRX claim completed:');
        console.log('   TRX Claim TX (User):', userClaimResponse.data.txHash);
        console.log('   Message:', userClaimResponse.data.message);
        console.log('');

        // Step 4: Resolver claims ETH on Ethereum chain
        console.log('💰 Step 4: Resolver claiming ETH on Ethereum chain...');
        const resolverClaimResponse = await axios.post(`${BASE_URL}/swaps/${swap.hashlock}/trigger-resolver-claim`, {
            secret: secret
        });
        
        console.log('✅ Resolver ETH claim completed:');
        console.log('   ETH Claim TX (Resolver):', resolverClaimResponse.data.txHash);
        console.log('   Resolver:', resolverClaimResponse.data.resolver.name);
        console.log('');

        // Step 5: Check final swap status
        console.log('📊 Step 5: Final swap status...');
        const swapStatusResponse = await axios.get(`${BASE_URL}/swaps/${swap.hashlock}`);
        const finalSwap = swapStatusResponse.data;
        
        console.log('✅ Complete swap flow:');
        console.log('   Status:', finalSwap.status);
        console.log('   ETH Lock TX (User):', finalSwap.eth_lock_tx);
        console.log('   TRX Lock TX (Resolver):', finalSwap.tron_lock_tx);
        console.log('   TRX Claim TX (User):', finalSwap.tron_claim_tx);
        console.log('   ETH Claim TX (Resolver):', finalSwap.eth_claim_tx);
        console.log('');

        console.log('🎉 Complete ETH→TRX swap flow successful!');
        console.log('');
        console.log('📋 Transaction Summary:');
        console.log('   1. User locks 0.002 ETH on Ethereum');
        console.log('   2. Resolver locks 22.54 TRX on TRON');
        console.log('   3. User claims 22.54 TRX on TRON (reveals secret)');
        console.log('   4. Resolver claims 0.002 ETH on Ethereum (uses secret)');
        console.log('');
        console.log('💰 Fee Breakdown:');
        console.log('   User pays: 0.002 ETH');
        console.log('   User receives: 22.54 TRX');
        console.log('   Resolver fee: 0.0002 ETH (0.1%)');
        console.log('   Resolver earns: 0.0002 ETH');

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
testCompleteSwapFlow(); 