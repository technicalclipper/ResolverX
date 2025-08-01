require('dotenv').config();
const SwapModel = require('./database/models/Swap');

async function checkSwapStatus(hashlock) {
    try {
        console.log('🔍 Checking swap status for hashlock:', hashlock);
        
        const swap = await SwapModel.getByHashlock(hashlock);
        
        if (!swap) {
            console.log('❌ Swap not found');
            return;
        }
        
        console.log('✅ Swap found:');
        console.log('   ID:', swap.id);
        console.log('   Direction:', swap.direction);
        console.log('   Status:', swap.status);
        console.log('   ETH Lock TX:', swap.eth_lock_tx);
        console.log('   TRON Lock TX:', swap.tron_lock_tx);
        console.log('   ETH Claim TX:', swap.eth_claim_tx);
        console.log('   TRON Claim TX:', swap.tron_claim_tx);
        console.log('   Created:', swap.created_at);
        console.log('   Updated:', swap.updated_at);
        
    } catch (error) {
        console.error('❌ Error checking swap status:', error);
    }
}

// Get hashlock from command line argument
const hashlock = process.argv[2];

if (!hashlock) {
    console.log('Usage: node check-swap-status.js <hashlock>');
    console.log('Example: node check-swap-status.js 0xdb3d248ea51b3e06e76c47f5b7d0661b1f00e163d7167c5f19619d8ae64ae477');
    process.exit(1);
}

checkSwapStatus(hashlock); 