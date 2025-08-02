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
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        Connect Your Wallets
      </h2>
      
      <p className="text-gray-600 mb-6 text-center">
        You need to connect both MetaMask and TronLink to perform atomic swaps.
      </p>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* MetaMask Button */}
        <div className="relative">
          <button
            onClick={() => handleConnect('metamask')}
            disabled={walletState.isConnecting || !!walletState.ethAddress}
            className={`w-full p-4 rounded-lg border-2 transition-all duration-200 flex items-center justify-center space-x-3 ${
              walletState.ethAddress
                ? 'border-green-500 bg-green-50 text-green-700 cursor-not-allowed'
                : availableProviders.some(p => p.type === 'metamask' && p.isAvailable)
                ? 'border-blue-500 hover:border-blue-600 hover:bg-blue-50 text-blue-700'
                : 'border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed'
            } ${walletState.isConnecting ? 'opacity-50 cursor-wait' : ''}`}
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21.49 1L13.5 8.99 15.51 11 21.49 1zM2.49 1L8.51 11 10.5 8.99 2.49 1zM1 2.49L9.01 10.5 7 12.51 1 4.49V2.49zM1 21.49L7 13.51 9.01 15.5 1 23.49V21.49zM21.49 23L13.5 15.01 15.51 13 21.49 23zM23 21.49L14.99 13.5 13 15.51 23 23.49V21.49z"/>
            </svg>
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
            className={`w-full p-4 rounded-lg border-2 transition-all duration-200 flex items-center justify-center space-x-3 ${
              walletState.tronAddress
                ? 'border-green-500 bg-green-50 text-green-700 cursor-not-allowed'
                : availableProviders.some(p => p.type === 'tronlink' && p.isAvailable)
                ? 'border-green-500 hover:border-green-600 hover:bg-green-50 text-green-700'
                : 'border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed'
            } ${walletState.isConnecting ? 'opacity-50 cursor-wait' : ''}`}
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5zM12 20c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
            </svg>
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
          <div className="text-center p-6 bg-gray-50 rounded-lg">
            <p className="text-gray-600 mb-4">
              No wallet extensions detected
            </p>
            <div className="space-y-2 text-sm text-gray-500">
              <p>Please install one of the following:</p>
              <ul className="space-y-1">
                <li>• <a href="https://metamask.io" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">MetaMask</a> for Ethereum</li>
                <li>• <a href="https://www.tronlink.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">TronLink</a> for TRON</li>
              </ul>
              <p className="mt-3 text-xs text-gray-400">
                After installing, refresh this page and try connecting again.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 