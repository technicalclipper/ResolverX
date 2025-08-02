export interface WalletState {
  isConnected: boolean;
  isConnecting: boolean;
  ethAddress: string | null;
  tronAddress: string | null;
  ethChainId: string | null;
  tronChainId: string | null;
  ethBalance: string | null;
  tronBalance: string | null;
  connectedWallets: ('metamask' | 'tronlink')[];
}

export interface WalletError {
  code: string;
  message: string;
}

export interface WalletProvider {
  name: string;
  type: 'metamask' | 'tronlink';
  isAvailable: boolean;
  connect: () => Promise<Partial<WalletState>>;
  disconnect: () => Promise<void>;
  getBalance: () => Promise<string>;
  getAddress: () => Promise<string>;
  getChainId: () => Promise<string>;
}

export interface EthereumProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, callback: (params: any) => void) => void;
  removeListener: (event: string, callback: (params: any) => void) => void;
  isMetaMask?: boolean;
}

export interface TronProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, callback: (params: any) => void) => void;
  removeListener: (event: string, callback: (params: any) => void) => void;
  isTronLink?: boolean;
} 