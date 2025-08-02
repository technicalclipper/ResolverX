const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';

async function testSecretExtraction() {
    console.log('🔍 Testing Secret Extraction from Transaction Logs\n');
    
    try {
        // Step 1: Create a swap to get a secret
        console.log('📝 Step 1: Creating swap to get secret...');
        const swapData = {
            direction: 'trx→eth',
            userEthAddress: '0x4E9DE56262c7108C23e74658CE6489e4576c8263',
            userTronAddress: 'TA7YTBTkHAQtF9M5umq3w2Vo7GJfKc3eoJ',
            amount: '22.54'
        };

        const createSwapResponse = await axios.post(`${BASE_URL}/swaps`, swapData);
        const swap = createSwapResponse.data.swap;
        const originalSecret = createSwapResponse.data.lockParams.secret;
        
        console.log('✅ Swap created:');
        console.log('   Hashlock:', swap.hashlock);
        console.log('   Original Secret:', originalSecret);
        console.log('');

        // Step 2: Execute the swap
        console.log('🔒 Step 2: Executing swap...');
        await axios.post(`${BASE_URL}/swaps/${swap.hashlock}/execute-trx-to-eth`);
        console.log('✅ Swap executed');
        console.log('');

        // Step 3: User claims ETH (this will create a transaction with the secret in logs)
        console.log('💰 Step 3: User claiming ETH...');
        const userClaimResponse = await axios.post(`${BASE_URL}/swaps/${swap.hashlock}/claim`, {
            secret: originalSecret,
            chain: 'ethereum'
        });
        const userClaimTxHash = userClaimResponse.data.txHash;
        
        console.log('✅ User ETH claim completed:');
        console.log('   Transaction Hash:', userClaimTxHash);
        console.log('');

        // Step 4: Wait for transaction confirmation
        console.log('⏳ Step 4: Waiting for transaction confirmation...');
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        console.log('✅ Transaction confirmed');
        console.log('');

        // Step 5: Test secret extraction from transaction
        console.log('🔍 Step 5: Testing secret extraction from transaction...');
        const extractResponse = await axios.post(`${BASE_URL}/debug/extract-secret`, {
            txHash: userClaimTxHash,
            chain: 'ethereum'
        });
        const extractedSecret = extractResponse.data.extractedSecret;
        
        console.log('✅ Secret extraction test completed:');
        console.log('   Original Secret:', originalSecret);
        console.log('   Extracted Secret:', extractedSecret);
        console.log('   Match:', originalSecret === extractedSecret ? '✅ YES' : '❌ NO');
        console.log('');

        if (originalSecret === extractedSecret) {
            console.log('🎉 Secret extraction is working correctly!');
            console.log('   The system can now automatically extract secrets from transaction logs.');
            console.log('   This should fix the TRX→ETH swap resolver claim issues.');
        } else {
            console.log('❌ Secret extraction failed - secrets do not match!');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        console.log('');
        console.log('💡 Make sure:');
        console.log('   - Backend is running on port 3000');
        console.log('   - Database is connected');
        console.log('   - All transactions have sufficient confirmation time');
    }
}

testSecretExtraction(); 