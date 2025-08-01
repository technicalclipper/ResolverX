const ResolverClient = require('./resolver-client');
const ResolverModel = require('./database/models/Resolver');

class ResolverManager {
    constructor() {
        this.resolverClient = new ResolverClient();
    }

    // Get best resolver for a swap direction
    async getBestResolver(direction, amount) {
        try {
            console.log(`🔍 Finding best resolver for ${direction} swap...`);

            // Get all active resolvers that support this direction
            const resolvers = await ResolverModel.getByDirection(direction);
            
            if (!resolvers || resolvers.length === 0) {
                throw new Error(`No active resolvers found for ${direction} swaps`);
            }

            console.log(`📋 Found ${resolvers.length} resolvers for ${direction}`);

            // Filter resolvers with sufficient liquidity
            const eligibleResolvers = [];
            
            for (const resolver of resolvers) {
                try {
                    // Get current resolver info
                    const info = await this.resolverClient.getResolverInfo(resolver.endpoint);
                    
                    if (info.success) {
                        const liquidity = direction === 'eth→trx' 
                            ? parseFloat(info.data.liquidity.tron)
                            : parseFloat(info.data.liquidity.ethereum);
                        
                        const requiredAmount = direction === 'eth→trx'
                            ? parseFloat(amount) * 11265.12 // Convert ETH to TRX
                            : parseFloat(amount) / 11265.12; // Convert TRX to ETH

                        if (liquidity >= requiredAmount) {
                            eligibleResolvers.push({
                                ...resolver,
                                currentInfo: info.data,
                                liquidity,
                                requiredAmount
                            });
                        } else {
                            console.log(`⚠️ Resolver ${resolver.name} insufficient liquidity: ${liquidity} < ${requiredAmount}`);
                        }
                    } else {
                        console.log(`⚠️ Resolver ${resolver.name} info check failed: ${info.error}`);
                    }
                } catch (error) {
                    console.log(`⚠️ Resolver ${resolver.name} validation failed: ${error.message}`);
                }
            }

            if (eligibleResolvers.length === 0) {
                throw new Error(`No resolvers with sufficient liquidity for ${direction} swap`);
            }

            // Sort by fee percentage (lowest first)
            eligibleResolvers.sort((a, b) => a.fee_percent - b.fee_percent);

            const bestResolver = eligibleResolvers[0];
            console.log(`✅ Selected resolver: ${bestResolver.name} (fee: ${bestResolver.fee_percent * 100}%)`);

            return {
                success: true,
                resolver: bestResolver,
                alternatives: eligibleResolvers.slice(1, 3) // Keep 2 alternatives
            };

        } catch (error) {
            console.error('❌ Error finding best resolver:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Validate resolver is still available
    async validateResolver(resolverId) {
        try {
            const resolver = await ResolverModel.getById(resolverId);
            if (!resolver) {
                return { valid: false, error: 'Resolver not found' };
            }

            const validation = await this.resolverClient.validateResolver(resolver.endpoint);
            return validation;
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    // Execute swap using resolver bot
    async executeSwapWithResolver(swapData, resolver) {
        try {
            console.log(`🚀 Executing swap with resolver: ${resolver.name}`);
            console.log(`📡 Resolver endpoint: ${resolver.endpoint}`);

            const { direction, hashlock, user_eth_address, user_tron_address, amount, timelock } = swapData;

            let result;

            if (direction === 'eth→trx') {
                // ETH→TRX: Resolver locks TRX
                const trxAmount = parseFloat(amount) * 11265.12; // Convert ETH to TRX
                result = await this.resolverClient.lockTron(
                    resolver.endpoint,
                    hashlock,
                    user_tron_address,
                    trxAmount.toString(),
                    timelock
                );
            } else if (direction === 'trx→eth') {
                // TRX→ETH: Resolver locks ETH
                const ethAmount = parseFloat(swapData.user_amount) / 11265.12; // Convert TRX to ETH using user_amount
                result = await this.resolverClient.lockEth(
                    resolver.endpoint,
                    hashlock,
                    user_eth_address,
                    ethAmount.toString(),
                    timelock
                );
            } else {
                throw new Error(`Unsupported direction: ${direction}`);
            }

            if (result.success) {
                console.log(`✅ Resolver swap execution successful: ${result.txHash}`);
                return {
                    success: true,
                    txHash: result.txHash,
                    resolver: resolver
                };
            } else {
                console.error(`❌ Resolver swap execution failed: ${result.error}`);
                return {
                    success: false,
                    error: result.error,
                    resolver: resolver
                };
            }

        } catch (error) {
            console.error('❌ Error executing swap with resolver:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Trigger resolver claim with secret
    async triggerResolverClaim(swapData, resolver, preimage) {
        try {
            console.log(`💰 Triggering resolver claim: ${resolver.name}`);
            console.log(`📡 Resolver endpoint: ${resolver.endpoint}`);

            const { direction } = swapData;
            let result;

            if (direction === 'eth→trx') {
                // ETH→TRX: Resolver claims ETH
                result = await this.resolverClient.claimEth(resolver.endpoint, preimage);
            } else if (direction === 'trx→eth') {
                // TRX→ETH: Resolver claims TRX
                result = await this.resolverClient.claimTron(resolver.endpoint, preimage);
            } else {
                throw new Error(`Unsupported direction: ${direction}`);
            }

            if (result.success) {
                console.log(`✅ Resolver claim successful: ${result.txHash}`);
                return {
                    success: true,
                    txHash: result.txHash
                };
            } else {
                console.error(`❌ Resolver claim failed: ${result.error}`);
                return {
                    success: false,
                    error: result.error
                };
            }

        } catch (error) {
            console.error('❌ Error triggering resolver claim:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get all available resolvers with current info
    async getAllResolversWithInfo() {
        try {
            const resolvers = await ResolverModel.getActive();
            const resolversWithInfo = [];

            for (const resolver of resolvers) {
                try {
                    const info = await this.resolverClient.getResolverInfo(resolver.endpoint);
                    resolversWithInfo.push({
                        ...resolver,
                        currentInfo: info.success ? info.data : null,
                        status: info.success ? 'online' : 'offline'
                    });
                } catch (error) {
                    resolversWithInfo.push({
                        ...resolver,
                        currentInfo: null,
                        status: 'offline'
                    });
                }
            }

            return resolversWithInfo;
        } catch (error) {
            console.error('❌ Error getting resolvers with info:', error.message);
            return [];
        }
    }
}

module.exports = ResolverManager; 