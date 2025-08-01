require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testWalletSetup() {
    console.log('🔐 Testing Wallet Setup and Roles\n');

    try {
        // Get backend health to see wallet addresses
        console.log('📋 Backend Wallet Configuration:');
        const healthResponse = await axios.get(`${BASE_URL}/health`);
        console.log('✅ Backend Health:', {
            ethereum: healthResponse.data.ethereum.address,
            tron: healthResponse.data.tron.address
        });
        console.log('');

        // Get resolver info to see resolver addresses
        console.log('📋 Resolver Wallet Configuration:');
        const resolversResponse = await axios.get(`${BASE_URL}/resolvers-info`);
        const resolver = resolversResponse.data[0];
        console.log('✅ Resolver Info:', {
            name: resolver.name,
            eth_address: resolver.eth_address,
            tron_address: resolver.tron_address,
            status: resolver.status
        });
        console.log('');

        console.log('🎯 Wallet Roles in ETH→TRX Swap:');
        console.log('');
        console.log('🔑 Ethereum Chain:');
        console.log('   User ETH Address: 0x4E9DE56262c7108C23e74658CE6489e4576c8263');
        console.log('   Resolver ETH Address:', resolver.eth_address);
        console.log('   Backend ETH Address:', healthResponse.data.ethereum.address);
        console.log('');
        console.log('🔑 TRON Chain:');
        console.log('   User TRON Address: TA7YTBTkHAQtF9M5umq3w2Vo7GJfKc3eoJ');
        console.log('   Resolver TRON Address:', resolver.tron_address);
        console.log('   Backend TRON Address:', healthResponse.data.tron.address);
        console.log('');
        console.log('📋 Transaction Flow:');
        console.log('   1. User locks ETH → Resolver ETH address');
        console.log('   2. Resolver locks TRX → User TRON address');
        console.log('   3. User claims TRX → User TRON address (reveals secret)');
        console.log('   4. Resolver claims ETH → Resolver ETH address (uses secret)');
        console.log('');
        console.log('⚠️  Note: Backend uses different wallets for:');
        console.log('   - ETH operations: Backend ETH wallet');
        console.log('   - TRON operations: Backend TRON wallet');
        console.log('   - Resolver operations: HTTP calls to resolver bot');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

// Run test
testWalletSetup(); 