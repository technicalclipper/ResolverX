const ethers = require('ethers');
const TronWeb = require('tronweb');

// Configuration - USER'S private key (not resolver's)
const CONFIG = {
    TRON_NILE: {
        CONTRACT_ADDRESS: 'TQU4VDENJFnnQcPUTXrzDn4E7SoMy98pkZ',
        PRIVATE_KEY: 'fb3e5ebb71816364003ea9b300b04252d5d48ee48674dfed8a19340daad8315f', // USER's TRON private key
        RPC_URL: 'https://nile.trongrid.io'
    }
};

// Initialize TronWeb with USER's private key
const tronWeb = new TronWeb({
    fullHost: CONFIG.TRON_NILE.RPC_URL,
    privateKey: CONFIG.TRON_NILE.PRIVATE_KEY
});

// The secret from the latest test
const SECRET = '0x771c8bd3d07087ffdab9608180fa22506aaa7cb470ae5bd732388b834ac959e3';
const ORIGINAL_HASHLOCK = '0x24bc83c3dba7e76541eb5caae93aa654026bee834815aee05337b89133ee94fa';

console.log('💰 USER CLAIMING TRX\n');

console.log('📋 Claim Details:');
console.log('   Secret:', SECRET);
console.log('   Hashlock:', ORIGINAL_HASHLOCK);
console.log('   Contract Address:', CONFIG.TRON_NILE.CONTRACT_ADDRESS);
console.log('   User Address:', tronWeb.defaultAddress.base58);
console.log('');

async function userClaim() {
    try {
        const contract = await tronWeb.contract().at(CONFIG.TRON_NILE.CONTRACT_ADDRESS);
        
        // Get the swap state first
        const swapData = await contract.swaps(ORIGINAL_HASHLOCK).call();
        
        console.log('📋 Swap State:');
        console.log('   State:', Number(swapData.state));
        console.log('   Sender:', swapData.sender);
        console.log('   Recipient:', swapData.recipient);
        console.log('   Amount:', swapData.amount.toString(), 'SUN');
        console.log('   Timelock:', swapData.timelock.toString());
        console.log('');

        // Check if user is the recipient
        const userAddress = tronWeb.defaultAddress.base58;
        const recipientAddress = swapData.recipient;
        
        console.log('🔍 Authorization Check:');
        console.log('   User Address:', userAddress);
        console.log('   Recipient Address:', recipientAddress);
        console.log('   User is Recipient:', userAddress === recipientAddress);
        console.log('');

        if (userAddress !== recipientAddress) {
            console.log('❌ ERROR: User is not the recipient!');
            console.log('   The resolver locked TRX for the user, but the user needs to claim it.');
            console.log('   Make sure you\'re using the USER\'s private key, not the resolver\'s.');
            return;
        }

        if (Number(swapData.state) !== 1) {
            console.log('❌ ERROR: Swap is not in OPEN state. State:', Number(swapData.state));
            return;
        }

        // Check timelock
        const currentTime = Math.floor(Date.now() / 1000);
        if (currentTime >= swapData.timelock.toString()) {
            console.log('❌ ERROR: Timelock has expired!');
            return;
        }

        console.log('✅ All checks passed! Attempting claim...\n');
        
        // Attempt the claim
        const result = await contract.claim(SECRET).send({
            feeLimit: 1000000000
        });

        console.log('🎉 SUCCESS! Claim transaction sent:');
        console.log('   Transaction Hash:', result);
        console.log('   View on Tronscan: https://nile.tronscan.org/#/transaction/' + result);
        console.log('');
        console.log('💰 The user should now receive the TRX!');

    } catch (error) {
        console.error('❌ Claim failed:', error.message);
        console.log('');
        console.log('🔍 Debug Info:');
        console.log('   Error:', error.message);
        console.log('   Make sure:');
        console.log('   1. You\'re using the USER\'s private key (not resolver\'s)');
        console.log('   2. The user is the recipient of the swap');
        console.log('   3. The timelock hasn\'t expired');
    }
}

userClaim(); 