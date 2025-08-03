'use client';

import React, { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import WalletInfo from './WalletInfo';

export default function WalletConnect() {
  const { walletState, connectWallet, availableProviders } = useWallet();
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async (walletType: 'metamask' | 'tronlink') => {
    try {
      setError(null);
      await connectWallet(walletType);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    }
  };

  // Show WalletInfo if both wallets are connected
  if (walletState.ethAddress && walletState.tronAddress) {
    return <WalletInfo />;
  }

  // Check if we have any available providers
  const hasAvailableProviders = availableProviders.length > 0;
  
  // Check if TronLink is already in available providers
  const hasTronLinkInProviders = availableProviders.some(p => p.type === 'tronlink');

  return (
    <div className="max-w-xl mx-auto p-8 bg-[#DCEBFE] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <h2 className="text-3xl font-black text-black mb-4 text-center">
        Connect Your Wallets
      </h2>
      
      <p className="text-xl font-bold mb-8 text-center">
        You need to connect both MetaMask and TronLink to perform atomic swaps.
      </p>
      
      {error && (
        <div className="mb-6 p-4 bg-red-100 border-2 border-black text-black font-bold">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* MetaMask Button */}
        <div className="relative">
          <button
            onClick={() => handleConnect('metamask')}
            disabled={walletState.isConnecting || !!walletState.ethAddress}
            className={`w-full p-6 border-2 border-black transition-all flex items-center justify-center space-x-3 text-lg font-bold ${
              walletState.ethAddress
                ? 'bg-green-400 cursor-not-allowed'
                : availableProviders.some(p => p.type === 'metamask' && p.isAvailable)
                ? 'bg-[#4285f4] hover:bg-[#4285f4]/90 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            } ${walletState.isConnecting ? 'opacity-50 cursor-wait' : ''}`}
          >
            <img 
              src="/images/MetaMask_Fox.png" 
              alt="MetaMask" 
              className="w-10 h-10 object-contain" 
            />
            <span className="font-semibold">
              {walletState.ethAddress 
                ? 'MetaMask Connected ✓' 
                : walletState.isConnecting 
                ? 'Connecting...' 
                : 'Connect MetaMask'
              }
            </span>
          </button>
          {walletState.ethAddress && (
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>

        {/* TronLink Button */}
        <div className="relative">
          <button
            onClick={() => handleConnect('tronlink')}
            disabled={walletState.isConnecting || !!walletState.tronAddress}
            className={`w-full p-6 border-2 border-black transition-all flex items-center justify-center space-x-3 text-lg font-bold ${
              walletState.tronAddress
                ? 'bg-green-400 cursor-not-allowed'
                : availableProviders.some(p => p.type === 'tronlink' && p.isAvailable)
                ? 'bg-[#4285f4] hover:bg-[#4285f4]/90 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            } ${walletState.isConnecting ? 'opacity-50 cursor-wait' : ''}`}
          >
            <img 
              src="/images/Tron.png" 
              alt="TronLink" 
              className="w-10 h-10 object-contain" 
            />
            <span className="font-semibold">
              {walletState.tronAddress 
                ? 'TronLink Connected ✓' 
                : walletState.isConnecting 
                ? 'Connecting...' 
                : 'Connect TronLink'
              }
            </span>
          </button>
          {walletState.tronAddress && (
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>

        {/* No providers found message */}
        {!hasAvailableProviders && (
          <div className="text-center p-8">
            <h2 className="text-4xl font-black text-black mb-6">
              Connect Both Wallets to Start Swapping
            </h2>
            <p className="text-2xl font-bold text-black mb-8">
              You need to connect both MetaMask and TronLink wallets to perform atomic swaps.
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-4 h-4 rounded-full bg-red-500" />
                <span className="text-xl font-black">
                  • MetaMask (Ethereum) wallet not connected
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-4 h-4 rounded-full bg-red-500" />
                <span className="text-xl font-black">
                  • TronLink (TRON) wallet not connected
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 