import { Resolver, SwapState, ExchangeRate, SwapEstimate } from '../types/swap';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export class ApiClient {
  private static instance: ApiClient;

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Get available resolvers for a direction
  async getResolvers(direction: 'eth→trx' | 'trx→eth'): Promise<Resolver[]> {
    return this.request<Resolver[]>(`/resolvers/${direction}`);
  }

  // Get all resolvers info
  async getResolversInfo(): Promise<Resolver[]> {
    return this.request<Resolver[]>('/resolvers-info');
  }

  // Register new resolver
  async registerResolver(resolverData: {
    name: string;
    endpoint: string;
    eth_address: string;
    tron_address: string;
    supported_directions?: ('eth→trx' | 'trx→eth')[];
    liquidity_eth?: string;
    liquidity_trx?: string;
    fee_percent?: number;
  }): Promise<{
    success: boolean;
    resolver: Resolver;
    message: string;
  }> {
    return this.request('/resolvers', {
      method: 'POST',
      body: JSON.stringify(resolverData),
    });
  }

  // Create a new swap
  async createSwap(
    direction: 'eth→trx' | 'trx→eth', 
    amount: string, 
    userEthAddress: string, 
    userTronAddress: string,
    resolverId: number
  ): Promise<{
    success: boolean;
    swap: {
      hashlock: string;
      direction: string;
      user_amount: string;
      resolver_fee: string;
      amount: string;
      status: string;
      timelock: number;
      resolver_id: number;
    };
    resolver: Resolver;
    lockParams: {
      hashlock: string;
      timelock: number;
      secret: string;
    };
    addresses: {
      user: {
        ethereum: string;
        tron: string;
      };
      resolver: {
        ethereum: string;
        tron: string;
      };
    };
  }> {
    return this.request('/swaps', {
      method: 'POST',
      body: JSON.stringify({ 
        direction, 
        amount,
        userEthAddress,
        userTronAddress,
        resolverId
      }),
    });
  }

  // Get ETH lock transaction parameters for frontend signing
  async getEthLockParams(hashlock: string): Promise<{
    success: boolean;
    transactionParams: {
      to: string;
      data: string;
      value: string;
      chainId: number;
    };
    swap: any;
    resolver: Resolver;
  }> {
    return this.request(`/swaps/${hashlock}/eth-lock-params`, {
      method: 'GET',
    });
  }

  // Get TRX lock transaction parameters for frontend signing
  async getTrxLockParams(hashlock: string): Promise<{
    success: boolean;
    transactionParams: {
      contractAddress: string;
      functionName: string;
      parameters: string[];
      callValue: number;
      feeLimit: number;
    };
    swap: any;
    resolver: Resolver;
  }> {
    return this.request(`/swaps/${hashlock}/trx-lock-params`, {
      method: 'GET',
    });
  }

  // Submit user-signed ETH lock transaction
  async submitEthLock(hashlock: string, txHash: string): Promise<{
    success: boolean;
    message: string;
    ethLockTx: string;
    trxLockTx: string;
    resolver: Resolver;
    swap: any;
  }> {
    return this.request(`/swaps/${hashlock}/submit-eth-lock`, {
      method: 'POST',
      body: JSON.stringify({ txHash }),
    });
  }

  // Submit user-signed TRX lock transaction
  async submitTrxLock(hashlock: string, txHash: string): Promise<{
    success: boolean;
    message: string;
    trxLockTx: string;
    ethLockTx: string;
    resolver: Resolver;
    swap: any;
  }> {
    return this.request(`/swaps/${hashlock}/submit-trx-lock`, {
      method: 'POST',
      body: JSON.stringify({ txHash }),
    });
  }

  // Get swap details
  async getSwap(hashlock: string): Promise<SwapState> {
    return this.request<SwapState>(`/swaps/${hashlock}`);
  }

  // Get swap state
  async getSwapState(hashlock: string): Promise<SwapState> {
    return this.request<SwapState>(`/swaps/${hashlock}/state`);
  }

  // Get claim transaction parameters for frontend signing
  async getClaimParams(hashlock: string, chain: string, secret: string): Promise<{
    success: boolean;
    transactionParams: any;
    swap: any;
  }> {
    return this.request(`/swaps/${hashlock}/claim-params`, {
      method: 'POST',
      body: JSON.stringify({ chain, secret }),
    });
  }

  // Submit user-signed claim transaction
  async submitClaim(hashlock: string, chain: string, txHash: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.request(`/swaps/${hashlock}/submit-claim`, {
      method: 'POST',
      body: JSON.stringify({ chain, txHash }),
    });
  }

  // Trigger resolver claim
  async triggerResolverClaim(hashlock: string, secret?: string): Promise<{
    success: boolean;
    txHash: string;
    message: string;
    resolver: Resolver;
  }> {
    const body: any = {};
    if (secret) {
      body.secret = secret;
    }
    return this.request(`/swaps/${hashlock}/trigger-resolver-claim`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // Get exchange rate
  async getExchangeRate(): Promise<ExchangeRate> {
    return this.request<ExchangeRate>('/exchange-rate');
  }

  // Get system config
  async getConfig(): Promise<{
    ETH_SEPOLIA: {
      CONTRACT_ADDRESS: string;
      CHAIN_ID: number;
    };
    TRON_NILE: {
      CONTRACT_ADDRESS: string;
      CHAIN_ID: number;
    };
    TIMELOCK_DURATION: number;
  }> {
    return this.request('/config');
  }

  // Get wallet balances
  async getBalances(): Promise<{
    eth_balance: string;
    trx_balance: string;
  }> {
    return this.request('/balances');
  }
}

export const apiClient = new ApiClient(); 