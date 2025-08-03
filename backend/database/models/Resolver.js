const supabase = require('../client');

class ResolverModel {
    // Create a new resolver
    static async create(resolverData) {
        try {
            const { data, error } = await supabase
                .from('resolvers')
                .insert([resolverData])
                .select()
                .single();

            if (error) {
                console.error('❌ Error creating resolver:', error);
                throw error;
            }

            console.log('✅ Resolver created:', data.id);
            return data;
        } catch (error) {
            console.error('❌ Resolver creation failed:', error);
            throw error;
        }
    }

    // Get resolver by ID
    static async getById(id) {
        try {
            const { data, error } = await supabase
                .from('resolvers')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return null; // Not found
                }
                console.error('❌ Error getting resolver:', error);
                throw error;
            }

            return data;
        } catch (error) {
            console.error('❌ Get resolver failed:', error);
            throw error;
        }
    }

    // Get all active resolvers
    static async getActive() {
        try {
            const { data, error } = await supabase
                .from('resolvers')
                .select('*')
                .eq('status', 'active')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('❌ Error getting active resolvers:', error);
                throw error;
            }

            return data || [];
        } catch (error) {
            console.error('❌ Get active resolvers failed:', error);
            throw error;
        }
    }

    // Get resolvers by direction
    static async getByDirection(direction) {
        try {
            console.log('🔍 Getting resolvers for direction:', direction);
            
            // First get all active resolvers
            const { data: allResolvers, error: allError } = await supabase
                .from('resolvers')
                .select('*')
                .eq('status', 'active');

            if (allError) {
                throw allError;
            }

            console.log('📋 All active resolvers:', allResolvers);

            // Then filter by direction
            const { data, error } = await supabase
                .from('resolvers')
                .select('*')
                .eq('status', 'active')
                .contains('supported_directions', [direction])
                .order('fee_percent', { ascending: true }); // Lowest fee first

            if (error) {
                console.error('❌ Error getting resolvers by direction:', error);
                throw error;
            }

            console.log('📋 Filtered resolvers:', data);

            // Manual check of supported directions
            const filteredResolvers = (data || []).filter(resolver => {
                console.log('🔍 Checking resolver:', {
                    id: resolver.id,
                    name: resolver.name,
                    supported_directions: resolver.supported_directions,
                    includes: resolver.supported_directions.includes(direction)
                });
                return resolver.supported_directions.includes(direction);
            });

            console.log('📋 Final filtered resolvers:', filteredResolvers);
            return filteredResolvers;
        } catch (error) {
            console.error('❌ Get resolvers by direction failed:', error);
            throw error;
        }
    }

    // Update resolver
    static async update(id, updateData) {
        try {
            const { data, error } = await supabase
                .from('resolvers')
                .update({
                    ...updateData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (error) {
                console.error('❌ Error updating resolver:', error);
                throw error;
            }

            console.log('✅ Resolver updated:', id);
            return data;
        } catch (error) {
            console.error('❌ Update resolver failed:', error);
            throw error;
        }
    }

    // Update resolver status
    static async updateStatus(id, status) {
        return this.update(id, { status });
    }

    // Update resolver liquidity
    static async updateLiquidity(id, liquidityEth, liquidityTrx) {
        return this.update(id, {
            liquidity_eth: liquidityEth,
            liquidity_trx: liquidityTrx
        });
    }

    // Get resolver by address
    static async getByAddress(ethAddress, tronAddress) {
        try {
            const { data, error } = await supabase
                .from('resolvers')
                .select('*')
                .or(`eth_address.eq.${ethAddress},tron_address.eq.${tronAddress}`)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return null; // Not found
                }
                console.error('❌ Error getting resolver by address:', error);
                throw error;
            }

            return data;
        } catch (error) {
            console.error('❌ Get resolver by address failed:', error);
            throw error;
        }
    }
}

module.exports = ResolverModel; 