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
    <div className="max-w-xl mx-auto p-6 bg-[#DCEBFE] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black text-black">
          Connected Wallets
        </h2>
        <button
          onClick={() => disconnectWallet()}
          className="px-3 py-1.5 bg-red-500 text-white font-bold text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
        >
          Disconnect All
        </button>
      </div>

      <div className="space-y-4">
        {/* MetaMask Wallet */}
        {walletState.ethAddress && (
          <div className="p-4 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <img src="/images/MetaMask_Fox.png" alt="MetaMask" className="w-6 h-6 object-contain" />
                <span className="text-xl font-black">MetaMask</span>
              </div>
              <button
                onClick={() => disconnectWallet('metamask')}
                className="px-3 py-1.5 bg-red-500 text-white font-bold text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
              >
                Disconnect
              </button>
            </div>
            
            <div className="space-y-2">
              <div className="text-base font-bold">Address: {formatAddress(walletState.ethAddress)}</div>
              <div className="text-base font-bold">Network: {walletState.ethChainId ? getNetworkName(walletState.ethChainId, 'metamask') : 'N/A'}</div>
              <div className="text-base font-bold">Balance: {walletState.ethBalance ? `${parseFloat(walletState.ethBalance).toFixed(4)} ETH` : 'N/A'}</div>
            </div>
          </div>
        )}

        {/* TronLink Wallet */}
        {walletState.tronAddress && (
          <div className="p-4 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <img src="/images/Tron.png" alt="TronLink" className="w-6 h-6 object-contain" />
                <span className="text-xl font-black">TronLink</span>
              </div>
              <button
                onClick={() => disconnectWallet('tronlink')}
                className="px-3 py-1.5 bg-red-500 text-white font-bold text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
              >
                Disconnect
              </button>
            </div>
            
            <div className="space-y-2">
              <div className="text-base font-bold">Address: {formatAddress(walletState.tronAddress)}</div>
              <div className="text-base font-bold">Network: {walletState.tronChainId ? getNetworkName(walletState.tronChainId, 'tronlink') : 'N/A'}</div>
              <div className="text-base font-bold">Balance: {walletState.tronBalance ? `${parseFloat(walletState.tronBalance).toFixed(4)} TRX` : 'N/A'}</div>
            </div>
          </div>
        )}

        {/* No Wallets Connected */}
        {!walletState.ethAddress && !walletState.tronAddress && (
          <div className="text-center p-4 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <span className="text-lg font-black">No wallets connected</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mt-6">
          {/* Refresh Button */}
          {(walletState.ethAddress || walletState.tronAddress) && (
            <button
              onClick={refreshBalance}
              className="px-4 py-2 bg-[#4285f4] text-white font-bold text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
            >
              Refresh Balances
            </button>
          )}

          {/* Connection Status */}
          {walletState.isConnected && (
            <div className="flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white font-bold text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <span>Connected</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}