const supabase = require('../client');

class SwapModel {
    // Create a new swap
    static async create(swapData) {
        try {
            const { data, error } = await supabase
                .from('swaps')
                .insert([swapData])
                .select()
                .single();

            if (error) {
                console.error('❌ Error creating swap:', error);
                throw error;
            }

            console.log('✅ Swap created:', data.id);
            return data;
        } catch (error) {
            console.error('❌ Swap creation failed:', error);
            throw error;
        }
    }

    // Get swap by hashlock
    static async getByHashlock(hashlock) {
        try {
            const { data, error } = await supabase
                .from('swaps')
                .select('*')
                .eq('hashlock', hashlock)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return null; // Not found
                }
                console.error('❌ Error getting swap:', error);
                throw error;
            }

            return data;
        } catch (error) {
            console.error('❌ Get swap failed:', error);
            throw error;
        }
    }

    // Get all swaps
    static async getAll() {
        try {
            const { data, error } = await supabase
                .from('swaps')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('❌ Error getting swaps:', error);
                throw error;
            }

            return data || [];
        } catch (error) {
            console.error('❌ Get all swaps failed:', error);
            throw error;
        }
    }

    // Update swap
    static async update(hashlock, updateData) {
        try {
            const { data, error } = await supabase
                .from('swaps')
                .update({
                    ...updateData,
                    updated_at: new Date().toISOString()
                })
                .eq('hashlock', hashlock)
                .select()
                .single();

            if (error) {
                console.error('❌ Error updating swap:', error);
                throw error;
            }

            console.log('✅ Swap updated:', hashlock);
            return data;
        } catch (error) {
            console.error('❌ Update swap failed:', error);
            throw error;
        }
    }

    // Update swap status
    static async updateStatus(hashlock, status) {
        return this.update(hashlock, { status });
    }

    // Update transaction hash
    static async updateTransaction(hashlock, txField, txHash) {
        const updateData = {};
        updateData[txField] = txHash;
        return this.update(hashlock, updateData);
    }

    // Mark swap as completed
    static async markCompleted(hashlock) {
        return this.update(hashlock, {
            status: 'completed',
            completed_at: new Date().toISOString()
        });
    }
}

module.exports = SwapModel; 