const axios = require('axios');

class ResolverClient {
    constructor() {
        this.timeout = 30000; // 30 seconds timeout
    }

    // Health check resolver bot
    async checkHealth(resolverEndpoint) {
        try {
            const response = await axios.get(`${resolverEndpoint}/status`, {
                timeout: this.timeout
            });
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('❌ Resolver health check failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get resolver information
    async getResolverInfo(resolverEndpoint) {
        try {
            const response = await axios.get(`${resolverEndpoint}/info`, {
                timeout: this.timeout
            });
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('❌ Failed to get resolver info:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Lock TRX for ETH→TRX swap
    async lockTron(resolverEndpoint, hashlock, recipient, amount, timelock) {
        try {
            console.log('📡 Calling resolver lock-tron endpoint:', resolverEndpoint);
            
            const response = await axios.post(`${resolverEndpoint}/lock-tron`, {
                hashlock,
                recipient,
                amount,
                timelock
            }, {
                timeout: this.timeout
            });

            console.log('✅ Resolver lock-tron response:', response.data);
            return response.data;
        } catch (error) {
            console.error('❌ Resolver lock-tron failed:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }

    // Claim ETH with secret (for ETH→TRX swap)
    async claimEth(resolverEndpoint, preimage) {
        try {
            console.log('📡 Calling resolver claim-eth endpoint:', resolverEndpoint);
            
            const response = await axios.post(`${resolverEndpoint}/claim-eth`, {
                preimage
            }, {
                timeout: this.timeout
            });

            console.log('✅ Resolver claim-eth response:', response.data);
            return response.data;
        } catch (error) {
            console.error('❌ Resolver claim-eth failed:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }

    // Lock ETH for TRX→ETH swap
    async lockEth(resolverEndpoint, hashlock, recipient, amount, timelock) {
        try {
            console.log('📡 Calling resolver lock-eth endpoint:', resolverEndpoint);
            
            const response = await axios.post(`${resolverEndpoint}/lock-eth`, {
                hashlock,
                recipient,
                amount,
                timelock
            }, {
                timeout: this.timeout
            });

            console.log('✅ Resolver lock-eth response:', response.data);
            return response.data;
        } catch (error) {
            console.error('❌ Resolver lock-eth failed:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }

    // Claim TRX with secret (for TRX→ETH swap)
    async claimTron(resolverEndpoint, preimage) {
        try {
            console.log('📡 Calling resolver claim-tron endpoint:', resolverEndpoint);
            
            const response = await axios.post(`${resolverEndpoint}/claim-tron`, {
                preimage
            }, {
                timeout: this.timeout
            });

            console.log('✅ Resolver claim-tron response:', response.data);
            return response.data;
        } catch (error) {
            console.error('❌ Resolver claim-tron failed:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }

    // Validate resolver endpoint
    async validateResolver(resolverEndpoint) {
        try {
            const healthCheck = await this.checkHealth(resolverEndpoint);
            if (!healthCheck.success) {
                return {
                    valid: false,
                    error: 'Health check failed'
                };
            }

            const info = await this.getResolverInfo(resolverEndpoint);
            if (!info.success) {
                return {
                    valid: false,
                    error: 'Info endpoint failed'
                };
            }

            return {
                valid: true,
                info: info.data
            };
        } catch (error) {
            return {
                valid: false,
                error: error.message
            };
        }
    }
}

module.exports = ResolverClient; 