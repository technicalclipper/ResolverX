'use client';

import React from 'react';
import { useWallet } from '../contexts/WalletContext';

export default function WalletInfo() {
  const { walletState, disconnectWallet, refreshBalance } = useWallet();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getNetworkName = (chainId: string, walletType: 'metamask' | 'tronlink') => {
    if (walletType === 'metamask') {
      switch (chainId) {
        case '0xaa36a7': // Sepolia
          return 'Sepolia Testnet';
        case '0x1': // Mainnet
          return 'Ethereum Mainnet';
        default:
          return `Chain ID: ${chainId}`;
      }
    } else {
      switch (chainId) {
        case 'nile':
          return 'Nile Testnet';
        case 'mainnet':
          return 'TRON Mainnet';
        default:
          return `Network: ${chainId}`;
      }
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">
          Connected Wallets
        </h2>
        <button
          onClick={() => disconnectWallet()}
          className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Disconnect All
        </button>
      </div>

      <div className="space-y-4">
        {/* MetaMask Wallet */}
        {walletState.ethAddress && (
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <svg className="w-5 h-5 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21.49 1L13.5 8.99 15.51 11 21.49 1zM2.49 1L8.51 11 10.5 8.99 2.49 1zM1 2.49L9.01 10.5 7 12.51 1 4.49V2.49zM1 21.49L7 13.51 9.01 15.5 1 23.49V21.49zM21.49 23L13.5 15.01 15.51 13 21.49 23zM23 21.49L14.99 13.5 13 15.51 23 23.49V21.49z"/>
              </svg>
              <span className="font-semibold text-gray-700">MetaMask</span>
              <button
                onClick={() => disconnectWallet('metamask')}
                className="ml-auto px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Disconnect
              </button>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm text-gray-600">Address: {formatAddress(walletState.ethAddress)}</div>
              <div className="text-sm text-gray-600">Network: {walletState.ethChainId ? getNetworkName(walletState.ethChainId, 'metamask') : 'N/A'}</div>
              <div className="text-sm text-gray-600">Balance: {walletState.ethBalance ? `${parseFloat(walletState.ethBalance).toFixed(4)} ETH` : 'N/A'}</div>
            </div>
          </div>
        )}

        {/* TronLink Wallet */}
        {walletState.tronAddress && (
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5zM12 20c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
              </svg>
              <span className="font-semibold text-gray-700">TronLink</span>
              <button
                onClick={() => disconnectWallet('tronlink')}
                className="ml-auto px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Disconnect
              </button>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm text-gray-600">Address: {formatAddress(walletState.tronAddress)}</div>
              <div className="text-sm text-gray-600">Network: {walletState.tronChainId ? getNetworkName(walletState.tronChainId, 'tronlink') : 'N/A'}</div>
              <div className="text-sm text-gray-600">Balance: {walletState.tronBalance ? `${parseFloat(walletState.tronBalance).toFixed(4)} TRX` : 'N/A'}</div>
            </div>
          </div>
        )}

        {/* No Wallets Connected */}
        {!walletState.ethAddress && !walletState.tronAddress && (
          <div className="text-center text-gray-500 py-4">
            No wallets connected
          </div>
        )}

        {/* Refresh Button */}
        {(walletState.ethAddress || walletState.tronAddress) && (
          <button
            onClick={refreshBalance}
            className="w-full px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Refresh Balances
          </button>
        )}

        {/* Connection Status */}
        {walletState.isConnected && (
          <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-green-700 font-medium">
              {walletState.connectedWallets.length === 2 ? 'Both Wallets Connected' : 'Wallet Connected'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
} 