require('dotenv').config();
const ResolverModel = require('./database/models/Resolver');
const SwapModel = require('./database/models/Swap');

async function testDatabase() {
    try {
        console.log('🔍 Testing database connection and data...\n');

        // Check resolvers
        console.log('📋 Checking resolvers...');
        const resolvers = await ResolverModel.getActive();
        console.log(`Found ${resolvers.length} active resolvers:`);
        
        for (const resolver of resolvers) {
            console.log(`  - ID: ${resolver.id}`);
            console.log(`    Name: ${resolver.name}`);
            console.log(`    ETH Address: ${resolver.eth_address}`);
            console.log(`    TRON Address: ${resolver.tron_address}`);
            console.log(`    Endpoint: ${resolver.endpoint}`);
            console.log(`    Status: ${resolver.status}`);
            console.log('');
        }

        // Check swaps
        console.log('📋 Checking swaps...');
        const swaps = await SwapModel.getAll();
        console.log(`Found ${swaps.length} swaps:`);
        
        for (const swap of swaps.slice(0, 5)) { // Show only first 5
            console.log(`  - Hashlock: ${swap.hashlock}`);
            console.log(`    Direction: ${swap.direction}`);
            console.log(`    Resolver ID: ${swap.resolver_id}`);
            console.log(`    Resolver ETH Address: ${swap.resolver_eth_address}`);
            console.log(`    User Amount: ${swap.user_amount}`);
            console.log(`    Status: ${swap.status}`);
            console.log('');
        }

    } catch (error) {
        console.error('❌ Database test failed:', error);
    }
}

testDatabase(); 