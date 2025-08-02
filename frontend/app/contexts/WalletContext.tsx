'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { WalletState } from '../types/wallet';
import { WalletManager } from '../lib/wallet-providers';

interface WalletContextType {
  walletState: WalletState;
  connectWallet: (walletType: 'metamask' | 'tronlink') => Promise<void>;
  disconnectWallet: (walletType?: 'metamask' | 'tronlink') => Promise<void>;
  refreshBalance: () => Promise<void>;
  availableProviders: { name: string; type: 'metamask' | 'tronlink'; isAvailable: boolean }[];
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [walletManager] = useState(() => new WalletManager());
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    isConnecting: false,
    ethAddress: null,
    tronAddress: null,
    ethChainId: null,
    tronChainId: null,
    ethBalance: null,
    tronBalance: null,
    connectedWallets: []
  });

  const availableProviders = walletManager.getAvailableProviders().map(provider => ({
    name: provider.name,
    type: provider.type,
    isAvailable: provider.isAvailable
  }));

  const connectWallet = async (walletType: 'metamask' | 'tronlink') => {
    try {
      const newState = await walletManager.connectWallet(walletType);
      setWalletState(newState);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  };

  const disconnectWallet = async (walletType?: 'metamask' | 'tronlink') => {
    try {
      await walletManager.disconnectWallet(walletType);
      const newState = walletManager.getState();
      setWalletState(newState);
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      throw error;
    }
  };

  const refreshBalance = async () => {
    try {
      const balances = await walletManager.refreshBalance();
      setWalletState(prev => ({ 
        ...prev, 
        ethBalance: balances.ethBalance || prev.ethBalance,
        tronBalance: balances.tronBalance || prev.tronBalance
      }));
    } catch (error) {
      console.error('Failed to refresh balance:', error);
      throw error;
    }
  };

  // Auto-refresh balance every 30 seconds when connected
  useEffect(() => {
    if (!walletState.isConnected) return;

    const interval = setInterval(() => {
      refreshBalance().catch(console.error);
    }, 30000);

    return () => clearInterval(interval);
  }, [walletState.isConnected]);

  const value: WalletContextType = {
    walletState,
    connectWallet,
    disconnectWallet,
    refreshBalance,
    availableProviders
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
} 