'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '../lib/api';

interface SwapStatusProps {
  swap: any;
}

export default function SwapStatus({ swap }: SwapStatusProps) {
  const [swapState, setSwapState] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (swap?.hashlock) {
      pollSwapStatus();
    }
  }, [swap?.hashlock]);

  const pollSwapStatus = async () => {
    try {
      setLoading(true);
      // Get the full swap details instead of just state
      const swapDetails = await apiClient.getSwap(swap.hashlock);
      setSwapState(swapDetails);
    } catch (err) {
      console.error('Error polling swap status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await apiClient.claimSwap(swap.hashlock);
      console.log('Claim result:', result);
      
      // Poll for updated status
      setTimeout(pollSwapStatus, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Claim failed');
      console.error('Claim error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'initiated': return 'text-yellow-600 bg-yellow-100';
      case 'locked': return 'text-blue-600 bg-blue-100';
      case 'claimed': return 'text-green-600 bg-green-100';
      case 'refunded': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'initiated': return '🔄';
      case 'locked': return '🔒';
      case 'claimed': return '';
      case 'refunded': return '❌';
      default: return '⏳';
    }
  };

  const formatTransactionHash = (hash: string) => {
    if (!hash) return '';
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  const getTransactionExplorerUrl = (hash: string, chain: 'ethereum' | 'tron') => {
    if (!hash) return '';
    if (chain === 'ethereum') {
      return `https://sepolia.etherscan.io/tx/${hash}`;
    } else {
      return `https://nile.tronscan.org/#/transaction/${hash}`;
    }
  };

  if (!swap) return null;

  return (
    <div className="bg-[#DCEBFE] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-black text-black">Swap Status & Transaction Details</h3>
        <button
          onClick={pollSwapStatus}
          disabled={loading}
          className="px-4 py-2 bg-[#4285f4] text-white font-bold border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border-2 border-black text-black font-bold">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Swap Overview */}
        <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4">
          <h4 className="text-xl font-black text-black mb-4">Swap Overview</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-bold text-black">Direction:</span>
              <span className="ml-2 font-bold">{swap.direction}</span>
            </div>
            <div>
              <span className="font-bold text-black">Amount:</span>
              <span className="ml-2 font-bold">{swap.user_amount} {swap.direction === 'eth→trx' ? 'ETH' : 'TRX'}</span>
            </div>
            <div>
              <span className="font-bold text-black">Resolver:</span>
              <span className="ml-2 font-bold">{swap.resolver?.name}</span>
            </div>
            <div>
              <span className="font-bold text-black">Hashlock:</span>
              <span className="ml-2 font-mono font-bold break-all">{swap.hashlock}</span>
            </div>
          </div>
        </div>

        {/* Status */}
        {swapState && (
          <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4">
            <div className="flex items-center gap-4 mb-4">
              <span className="text-4xl">{getStatusIcon(swapState.status)}</span>
              <div>
                <div className={`inline-flex px-4 py-2 border-2 border-black font-black text-lg ${
                  swapState.status === 'initiated' ? 'bg-yellow-400' :
                  swapState.status === 'locked' ? 'bg-[#4285f4] text-white' :
                  swapState.status === 'claimed' ? 'bg-green-500 text-white' :
                  swapState.status === 'refunded' ? 'bg-red-500 text-white' :
                  'bg-gray-200'
                }`}>
                  {swapState.status.toUpperCase()}
                </div>
                <p className="text-lg font-bold text-black mt-2">
                  {swapState.status === 'claimed' ? 'Swap completed successfully!' : 
                   swapState.status === 'locked' ? 'Funds locked on both chains' :
                   swapState.status === 'initiated' ? 'Swap initiated' : 'Processing...'}
                </p>
              </div>
            </div>

            {/* Transaction Summary */}
            <div className="bg-[#DCEBFE] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 mt-6">
              <h5 className="text-xl font-black text-black mb-4">Transaction Summary</h5>
              
              <div className="space-y-6">
                {/* Step 1: User Lock */}
                <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h6 className="text-lg font-black text-black">1. User Lock</h6>
                      <p className="text-base font-bold mt-1">
                        {swap.direction === 'eth→trx' ? 'User locks ETH on Ethereum' : 'User locks TRX on TRON'}
                      </p>
                    </div>
                    <div className="text-right">
                      {swap.direction === 'eth→trx' && swapState.eth_lock_tx ? (
                        <div className="px-3 py-1 bg-green-500 text-white font-bold border-2 border-black">✅ Completed</div>
                      ) : swap.direction === 'trx→eth' && swapState.tron_lock_tx ? (
                        <div className="px-3 py-1 bg-green-500 text-white font-bold border-2 border-black">✅ Completed</div>
                      ) : (
                        <div className="px-3 py-1 bg-yellow-400 font-bold border-2 border-black">⏳ Pending</div>
                      )}
                    </div>
                  </div>
                  {swap.direction === 'eth→trx' && swapState.eth_lock_tx && (
                    <div className="mt-3">
                      <a 
                        href={getTransactionExplorerUrl(swapState.eth_lock_tx, 'ethereum')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-3 py-1 bg-[#4285f4] text-white font-mono font-bold border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                      >
                        {formatTransactionHash(swapState.eth_lock_tx)}
                      </a>
                    </div>
                  )}
                  {swap.direction === 'trx→eth' && swapState.tron_lock_tx && (
                    <div className="mt-3">
                      <a 
                        href={getTransactionExplorerUrl(swapState.tron_lock_tx, 'tron')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-3 py-1 bg-[#C23631] text-white font-mono font-bold border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                      >
                        {formatTransactionHash(swapState.tron_lock_tx)}
                      </a>
                    </div>
                  )}
                </div>

                {/* Step 2: Resolver Lock */}
                <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h6 className="text-lg font-black text-black">2. Resolver Lock</h6>
                      <p className="text-base font-bold mt-1">
                        {swap.direction === 'eth→trx' ? 'Resolver locks TRX on TRON' : 'Resolver locks ETH on Ethereum'}
                      </p>
                    </div>
                    <div className="text-right">
                      {swapState.tron_lock_tx && swap.direction === 'eth→trx' ? (
                        <div className="px-3 py-1 bg-green-500 text-white font-bold border-2 border-black">✅ Completed</div>
                      ) : swapState.eth_lock_tx && swap.direction === 'trx→eth' ? (
                        <div className="px-3 py-1 bg-green-500 text-white font-bold border-2 border-black">✅ Completed</div>
                      ) : (
                        <div className="px-3 py-1 bg-yellow-400 font-bold border-2 border-black">⏳ Pending</div>
                      )}
                    </div>
                  </div>
                  {swapState.tron_lock_tx && swap.direction === 'eth→trx' && (
                    <div className="mt-3">
                      <a 
                        href={getTransactionExplorerUrl(swapState.tron_lock_tx, 'tron')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-3 py-1 bg-[#C23631] text-white font-mono font-bold border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                      >
                        {formatTransactionHash(swapState.tron_lock_tx)}
                      </a>
                    </div>
                  )}
                  {swapState.eth_lock_tx && swap.direction === 'trx→eth' && (
                    <div className="mt-3">
                      <a 
                        href={getTransactionExplorerUrl(swapState.eth_lock_tx, 'ethereum')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-3 py-1 bg-[#4285f4] text-white font-mono font-bold border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                      >
                        {formatTransactionHash(swapState.eth_lock_tx)}
                      </a>
                    </div>
                  )}
                </div>

                {/* Step 3: User Claim */}
                <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h6 className="text-lg font-black text-black">3. User Claim</h6>
                      <p className="text-base font-bold mt-1">
                        {swap.direction === 'eth→trx' ? 'User claims TRX on TRON' : 'User claims ETH on Ethereum'}
                      </p>
                    </div>
                    <div className="text-right">
                      {swapState.tron_claim_tx && swap.direction === 'eth→trx' ? (
                        <div className="px-3 py-1 bg-green-500 text-white font-bold border-2 border-black">✅ Completed</div>
                      ) : swapState.eth_claim_tx && swap.direction === 'trx→eth' ? (
                        <div className="px-3 py-1 bg-green-500 text-white font-bold border-2 border-black">✅ Completed</div>
                      ) : (
                        <div className="px-3 py-1 bg-yellow-400 font-bold border-2 border-black">⏳ Pending</div>
                      )}
                    </div>
                  </div>
                  {swapState.tron_claim_tx && swap.direction === 'eth→trx' && (
                    <div className="mt-3">
                      <a 
                        href={getTransactionExplorerUrl(swapState.tron_claim_tx, 'tron')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-3 py-1 bg-[#C23631] text-white font-mono font-bold border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                      >
                        {formatTransactionHash(swapState.tron_claim_tx)}
                      </a>
                    </div>
                  )}
                  {swapState.eth_claim_tx && swap.direction === 'trx→eth' && (
                    <div className="mt-3">
                      <a 
                        href={getTransactionExplorerUrl(swapState.eth_claim_tx, 'ethereum')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-3 py-1 bg-[#4285f4] text-white font-mono font-bold border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                      >
                        {formatTransactionHash(swapState.eth_claim_tx)}
                      </a>
                    </div>
                  )}
                </div>

                {/* Step 4: Resolver Claim */}
                <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h6 className="text-lg font-black text-black">4. Resolver Claim</h6>
                      <p className="text-base font-bold mt-1">
                        {swap.direction === 'eth→trx' ? 'Resolver claims ETH on Ethereum' : 'Resolver claims TRX on TRON'}
                      </p>
                    </div>
                    <div className="text-right">
                      {swapState.eth_claim_tx && swap.direction === 'eth→trx' ? (
                        <div className="px-3 py-1 bg-green-500 text-white font-bold border-2 border-black">✅ Completed</div>
                      ) : swapState.tron_claim_tx && swap.direction === 'trx→eth' ? (
                        <div className="px-3 py-1 bg-green-500 text-white font-bold border-2 border-black">✅ Completed</div>
                      ) : (
                        <div className="px-3 py-1 bg-yellow-400 font-bold border-2 border-black">⏳ Pending</div>
                      )}
                    </div>
                  </div>
                  {swapState.eth_claim_tx && swap.direction === 'eth→trx' && (
                    <div className="mt-3">
                      <a 
                        href={getTransactionExplorerUrl(swapState.eth_claim_tx, 'ethereum')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-3 py-1 bg-[#4285f4] text-white font-mono font-bold border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                      >
                        {formatTransactionHash(swapState.eth_claim_tx)}
                      </a>
                    </div>
                  )}
                  {swapState.tron_claim_tx && swap.direction === 'trx→eth' && (
                    <div className="mt-3">
                      <a 
                        href={getTransactionExplorerUrl(swapState.tron_claim_tx, 'tron')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-3 py-1 bg-[#C23631] text-white font-mono font-bold border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                      >
                        {formatTransactionHash(swapState.tron_claim_tx)}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {swapState.status === 'locked' && (
              <div className="mt-6">
                <button
                  onClick={handleClaim}
                  disabled={loading}
                  className="w-full py-4 px-6 bg-green-500 text-white text-xl font-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50"
                >
                  {loading ? 'Claiming...' : 'Claim Tokens'}
                </button>
              </div>
            )}

            {/* Success Message */}
            {swapState.status === 'claimed' && (
              <div className="mt-6 p-6 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center gap-4">
                  <span className="text-4xl">🎉</span>
                  <div>
                    <h6 className="text-xl font-black text-black">Swap Completed Successfully!</h6>
                    <p className="text-lg font-bold mt-2">
                      All transactions have been completed. Your atomic swap is now finished.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 