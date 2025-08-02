require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testTRXToETHSwapFlow() {
    console.log('🔄 Testing Complete Swap Flow (TRX→ETH)\n');

    try {
        // Step 1: Create swap with automatic resolver selection
        console.log('📝 Step 1: Creating swap with automatic resolver selection...');
        const swapData = {
            direction: 'trx→eth',
            userEthAddress: '0x4E9DE56262c7108C23e74658CE6489e4576c8263', // User's ETH address
            userTronAddress: 'TA7YTBTkHAQtF9M5umq3w2Vo7GJfKc3eoJ', // User's TRON address
            amount: '22.54' // Amount in TRX
        };

        const createSwapResponse = await axios.post(`${BASE_URL}/swaps`, swapData);
        const swap = createSwapResponse.data.swap;
        const secret = createSwapResponse.data.lockParams.secret;
        
        console.log('✅ Swap created:');
        console.log('   Hashlock:', swap.hashlock);
        console.log('   Direction:', swap.direction);
        console.log('   User Amount:', swap.user_amount, 'TRX');
        console.log('   Resolver Fee:', swap.resolver_fee, 'TRX');
        console.log('   Total Amount:', swap.amount, 'TRX');
        console.log('   Resolver:', createSwapResponse.data.resolver.name);
        console.log('   Resolver Fee:', createSwapResponse.data.resolver.fee_percent * 100 + '%');
        console.log('');

        // Step 2: Execute TRX→ETH swap (User locks TRX, Resolver locks ETH)
        console.log('🔒 Step 2: Executing TRX→ETH swap...');
        const executeResponse = await axios.post(`${BASE_URL}/swaps/${swap.hashlock}/execute-trx-to-eth`);
        
        console.log('✅ Swap execution completed:');
        console.log('   TRX Lock TX (User):', executeResponse.data.trxLockTx);
        console.log('   ETH Lock TX (Resolver):', executeResponse.data.ethLockTx);
        console.log('   Resolver:', executeResponse.data.resolver.name);
        console.log('');

        // Step 3: User claims ETH on Ethereum chain
        console.log('💰 Step 3: User claiming ETH on Ethereum chain...');
        const userClaimResponse = await axios.post(`${BASE_URL}/swaps/${swap.hashlock}/claim`, {
            secret: secret,
            chain: 'ethereum'
        });
        
        console.log('✅ User ETH claim completed:');
        console.log('   ETH Claim TX (User):', userClaimResponse.data.txHash);
        console.log('   Message:', userClaimResponse.data.message);
        console.log('');

        // Step 4: Resolver claims TRX on TRON chain (secret will be extracted from user's ETH claim transaction)
        console.log('💰 Step 4: Resolver claiming TRX on TRON chain...');
        const resolverClaimResponse = await axios.post(`${BASE_URL}/swaps/${swap.hashlock}/trigger-resolver-claim`);
        
        console.log('✅ Resolver TRX claim completed:');
        console.log('   TRX Claim TX (Resolver):', resolverClaimResponse.data.txHash);
        console.log('   Resolver:', resolverClaimResponse.data.resolver.name);
        console.log('');

        // Step 5: Check final swap status
        console.log('📊 Step 5: Final swap status...');
        const swapStatusResponse = await axios.get(`${BASE_URL}/swaps/${swap.hashlock}`);
        const finalSwap = swapStatusResponse.data;
        
        console.log('✅ Complete swap flow:');
        console.log('   Status:', finalSwap.status);
        console.log('   TRX Lock TX (User):', finalSwap.tron_lock_tx);
        console.log('   ETH Lock TX (Resolver):', finalSwap.eth_lock_tx);
        console.log('   ETH Claim TX (User):', finalSwap.eth_claim_tx);
        console.log('   TRX Claim TX (Resolver):', finalSwap.tron_claim_tx);
        console.log('');

        console.log('🎉 Complete TRX→ETH swap flow successful!');
        console.log('');
        console.log('📋 Transaction Summary:');
        console.log('   1. User locks 22.54 TRX on TRON');
        console.log('   2. Resolver locks 0.002 ETH on Ethereum');
        console.log('   3. User claims 0.002 ETH on Ethereum (reveals secret)');
        console.log('   4. Resolver claims 22.54 TRX on TRON (uses secret)');
        console.log('');
        console.log('💰 Fee Breakdown:');
        console.log('   User pays: 22.54 TRX');
        console.log('   User receives: 0.002 ETH');
        console.log('   Resolver fee: 0.02254 TRX (0.1%)');
        console.log('   Resolver earns: 0.02254 TRX');

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
testTRXToETHSwapFlow(); 