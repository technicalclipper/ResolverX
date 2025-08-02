import { ethers } from 'ethers';
import { WalletState, WalletProvider, EthereumProvider, TronProvider } from '../types/wallet';

// MetaMask Provider
export class MetaMaskProvider implements WalletProvider {
  name = 'MetaMask';
  type = 'metamask' as const;
  isAvailable = false;
  private provider: ethers.BrowserProvider | null = null;

  constructor() {
    this.checkAvailability();
  }

  private checkAvailability() {
    if (typeof window !== 'undefined') {
      this.isAvailable = !!(window as any).ethereum && (window as any).ethereum.isMetaMask;
    }
  }

  async connect(): Promise<Partial<WalletState>> {
    try {
      if (!this.isAvailable) {
        throw new Error('MetaMask is not available. Please install MetaMask extension.');
      }

      const ethereum = (window as any).ethereum as EthereumProvider;
      
      // Request account access
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts[0];

      // Get chain ID
      const chainId = await ethereum.request({ method: 'eth_chainId' });

      // Create ethers provider
      this.provider = new ethers.BrowserProvider(ethereum);

      // Get balance
      const balance = await this.provider.getBalance(account);
      const balanceEth = ethers.formatEther(balance);

      return {
        ethAddress: account,
        ethChainId: chainId,
        ethBalance: balanceEth,
        connectedWallets: ['metamask']
      };
    } catch (error) {
      console.error('MetaMask connection error:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.provider = null;
  }

  async getBalance(): Promise<string> {
    if (!this.provider) throw new Error('Provider not connected');
    const address = await this.getAddress();
    const balance = await this.provider.getBalance(address);
    return ethers.formatEther(balance);
  }

  async getAddress(): Promise<string> {
    if (!this.provider) throw new Error('Provider not connected');
    const accounts = await this.provider.listAccounts();
    return accounts[0].address;
  }

  async getChainId(): Promise<string> {
    if (!this.provider) throw new Error('Provider not connected');
    const network = await this.provider.getNetwork();
    return network.chainId.toString();
  }
}

// TronLink Provider
export class TronLinkProvider implements WalletProvider {
  name = 'TronLink';
  type = 'tronlink' as const;
  isAvailable = false;
  private tronWeb: any = null;

  constructor() {
    this.checkAvailability();
  }

  private checkAvailability() {
    if (typeof window !== 'undefined') {
      // Check for TronLink in multiple ways
      const hasTronWeb = !!(window as any).tronWeb;
      const hasTronLink = !!(window as any).tronLink;
      const hasTronWallet = !!(window as any).tronWallet;
      
      // TronLink is available if any of these exist
      this.isAvailable = hasTronWeb || hasTronLink || hasTronWallet;
      
      console.log('TronLink detection:', {
        hasTronWeb,
        hasTronLink,
        hasTronWallet,
        isAvailable: this.isAvailable
      });
    }
  }

  async connect(): Promise<Partial<WalletState>> {
    try {
      if (!this.isAvailable) {
        throw new Error('TronLink is not available. Please install TronLink extension.');
      }

      // Try different ways to access TronLink
      let tronWeb = (window as any).tronWeb;
      
      if (!tronWeb && (window as any).tronLink) {
        tronWeb = (window as any).tronLink;
      }
      
      if (!tronWeb && (window as any).tronWallet) {
        tronWeb = (window as any).tronWallet;
      }

      if (!tronWeb) {
        throw new Error('TronLink is not properly initialized. Please refresh the page and try again.');
      }

      // Wait for TronLink to be ready (if it has a ready property)
      if (tronWeb.ready !== undefined) {
        if (!tronWeb.ready) {
          throw new Error('TronLink is not ready. Please unlock your wallet.');
        }
      }

      // Request account access
      let address;
      if (tronWeb.defaultAddress && tronWeb.defaultAddress.base58) {
        address = tronWeb.defaultAddress.base58;
      } else if (tronWeb.address) {
        address = tronWeb.address;
      } else {
        // Try to get address through request
        try {
          const accounts = await tronWeb.request({ method: 'tron_requestAccounts' });
          address = accounts[0];
        } catch (e) {
          throw new Error('No account found in TronLink. Please connect your wallet.');
        }
      }

      if (!address) {
        throw new Error('No account found in TronLink. Please connect your wallet.');
      }

      // Get balance
      let balance;
      try {
        if (tronWeb.trx && tronWeb.trx.getBalance) {
          balance = await tronWeb.trx.getBalance(address);
          balance = tronWeb.fromSun ? tronWeb.fromSun(balance) : balance / 1000000; // Convert from sun to TRX
        } else {
          balance = '0'; // Default if can't get balance
        }
      } catch (e) {
        console.warn('Could not get balance:', e);
        balance = '0';
      }

      // Get network (mainnet/testnet)
      let chainId = 'mainnet';
      if (tronWeb.fullNode && tronWeb.fullNode.host) {
        chainId = tronWeb.fullNode.host.includes('nile') ? 'nile' : 'mainnet';
      }

      this.tronWeb = tronWeb;

      return {
        tronAddress: address,
        tronChainId: chainId,
        tronBalance: balance.toString(),
        connectedWallets: ['tronlink']
      };
    } catch (error) {
      console.error('TronLink connection error:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.tronWeb = null;
  }

  async getBalance(): Promise<string> {
    if (!this.tronWeb) throw new Error('TronWeb not connected');
    const address = await this.getAddress();
    try {
      const balance = await this.tronWeb.trx.getBalance(address);
      return this.tronWeb.fromSun ? this.tronWeb.fromSun(balance) : (balance / 1000000).toString();
    } catch (e) {
      console.warn('Could not get balance:', e);
      return '0';
    }
  }

  async getAddress(): Promise<string> {
    if (!this.tronWeb) throw new Error('TronWeb not connected');
    if (this.tronWeb.defaultAddress && this.tronWeb.defaultAddress.base58) {
      return this.tronWeb.defaultAddress.base58;
    }
    if (this.tronWeb.address) {
      return this.tronWeb.address;
    }
    throw new Error('No address available');
  }

  async getChainId(): Promise<string> {
    if (!this.tronWeb) throw new Error('TronWeb not connected');
    if (this.tronWeb.fullNode && this.tronWeb.fullNode.host) {
      return this.tronWeb.fullNode.host.includes('nile') ? 'nile' : 'mainnet';
    }
    return 'mainnet';
  }
}

// Wallet Manager
export class WalletManager {
  private metamaskProvider: MetaMaskProvider;
  private tronLinkProvider: TronLinkProvider;
  private state: WalletState = {
    isConnected: false,
    isConnecting: false,
    ethAddress: null,
    tronAddress: null,
    ethChainId: null,
    tronChainId: null,
    ethBalance: null,
    tronBalance: null,
    connectedWallets: []
  };

  constructor() {
    this.metamaskProvider = new MetaMaskProvider();
    this.tronLinkProvider = new TronLinkProvider();
  }

  getAvailableProviders(): WalletProvider[] {
    const providers: WalletProvider[] = [];
    
    if (this.metamaskProvider.isAvailable) {
      providers.push(this.metamaskProvider);
    }
    
    if (this.tronLinkProvider.isAvailable) {
      providers.push(this.tronLinkProvider);
    }
    
    console.log('Available providers:', providers.map(p => ({ name: p.name, type: p.type, available: p.isAvailable })));
    
    return providers;
  }

  async connectWallet(walletType: 'metamask' | 'tronlink'): Promise<WalletState> {
    try {
      this.state.isConnecting = true;

      let provider: WalletProvider;
      if (walletType === 'metamask') {
        provider = this.metamaskProvider;
      } else if (walletType === 'tronlink') {
        provider = this.tronLinkProvider;
      } else {
        throw new Error('Invalid wallet type');
      }

      if (!provider.isAvailable) {
        throw new Error(`${provider.name} is not available`);
      }

      // Connect to the wallet and merge the state
      const newState = await provider.connect();
      
      console.log(`Connecting ${walletType}:`, newState);
      console.log('Previous state:', this.state);
      
      // Merge the new state with existing state, preserving existing wallet data
      this.state = {
        ...this.state,
        // Only update the specific wallet's data, preserve the other wallet's data
        ...(walletType === 'metamask' ? {
          ethAddress: newState.ethAddress || null,
          ethChainId: newState.ethChainId || null,
          ethBalance: newState.ethBalance || null,
        } : {
          tronAddress: newState.tronAddress || null,
          tronChainId: newState.tronChainId || null,
          tronBalance: newState.tronBalance || null,
        }),
        isConnected: true,
        isConnecting: false,
        connectedWallets: [...new Set([...this.state.connectedWallets, ...(newState.connectedWallets || [])])]
      };
      
      console.log('Updated state:', this.state);

      return this.state;
    } catch (error) {
      this.state.isConnecting = false;
      throw error;
    }
  }

  async disconnectWallet(walletType?: 'metamask' | 'tronlink'): Promise<void> {
    if (walletType) {
      // Disconnect specific wallet
      if (walletType === 'metamask') {
        await this.metamaskProvider.disconnect();
        this.state.ethAddress = null;
        this.state.ethChainId = null;
        this.state.ethBalance = null;
        this.state.connectedWallets = this.state.connectedWallets.filter(w => w !== 'metamask');
      } else if (walletType === 'tronlink') {
        await this.tronLinkProvider.disconnect();
        this.state.tronAddress = null;
        this.state.tronChainId = null;
        this.state.tronBalance = null;
        this.state.connectedWallets = this.state.connectedWallets.filter(w => w !== 'tronlink');
      }
      
      // Update connection status
      this.state.isConnected = this.state.connectedWallets.length > 0;
    } else {
      // Disconnect all wallets
      await this.metamaskProvider.disconnect();
      await this.tronLinkProvider.disconnect();
      
      this.state = {
        isConnected: false,
        isConnecting: false,
        ethAddress: null,
        tronAddress: null,
        ethChainId: null,
        tronChainId: null,
        ethBalance: null,
        tronBalance: null,
        connectedWallets: []
      };
    }
  }

  async refreshBalance(): Promise<{ ethBalance?: string; tronBalance?: string }> {
    const balances: { ethBalance?: string; tronBalance?: string } = {};

    if (this.state.connectedWallets.includes('metamask') && this.state.ethAddress) {
      try {
        const ethBalance = await this.metamaskProvider.getBalance();
        this.state.ethBalance = ethBalance;
        balances.ethBalance = ethBalance;
      } catch (error) {
        console.error('Failed to refresh ETH balance:', error);
      }
    }

    if (this.state.connectedWallets.includes('tronlink') && this.state.tronAddress) {
      try {
        const tronBalance = await this.tronLinkProvider.getBalance();
        this.state.tronBalance = tronBalance;
        balances.tronBalance = tronBalance;
      } catch (error) {
        console.error('Failed to refresh TRX balance:', error);
      }
    }

    return balances;
  }

  getState(): WalletState {
    return { ...this.state };
  }

  isConnected(): boolean {
    return this.state.isConnected;
  }

  getConnectedWallets(): ('metamask' | 'tronlink')[] {
    return [...this.state.connectedWallets];
  }
} 