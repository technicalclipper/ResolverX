export interface Resolver {
  id: number;
  name: string;
  endpoint: string;
  supported_directions: string[];
  liquidity_eth: string;
  liquidity_trx: string;
  fee_percent: number;
  status: 'active' | 'paused';
  created_at: string;
}

export interface SwapFormData {
  direction: 'eth→trx' | 'trx→eth';
  amount: string;
  selectedResolver: Resolver | null;
}

export interface SwapState {
  hashlock: string;
  direction: 'eth→trx' | 'trx→eth';
  status: 'initiated' | 'locked' | 'claimed' | 'refunded';
  user_address: string;
  resolver_id: string;
  eth_lock_tx: string | null;
  tron_lock_tx: string | null;
  eth_claim_tx: string | null;
  tron_claim_tx: string | null;
  created_at: string;
  expires_at: string;
}

export interface ExchangeRate {
  eth_to_trx: number;
  trx_to_eth: number;
  last_updated: string;
}

export interface SwapEstimate {
  userAmount: string;
  userToken: string;
  resolverFee: string;
  totalAmount: string;
  exchangeRate: number;
  estimatedReceive: string;
} 