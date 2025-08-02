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
      case 'claimed': return '✅';
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
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-800">Swap Status & Transaction Details</h3>
        <button
          onClick={pollSwapStatus}
          disabled={loading}
          className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Swap Overview */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-3">Swap Overview</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-blue-600">Direction:</span>
              <span className="ml-2 font-medium">{swap.direction}</span>
            </div>
            <div>
              <span className="text-blue-600">Amount:</span>
              <span className="ml-2 font-medium">{swap.user_amount} {swap.direction === 'eth→trx' ? 'ETH' : 'TRX'}</span>
            </div>
            <div>
              <span className="text-blue-600">Resolver:</span>
              <span className="ml-2 font-medium">{swap.resolver?.name}</span>
            </div>
            <div>
              <span className="text-blue-600">Hashlock:</span>
              <span className="ml-2 font-mono text-xs break-all">{swap.hashlock}</span>
            </div>
          </div>
        </div>

        {/* Status */}
        {swapState && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center space-x-3 mb-4">
              <span className="text-3xl">{getStatusIcon(swapState.status)}</span>
              <div>
                <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(swapState.status)}`}>
                  {swapState.status.toUpperCase()}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {swapState.status === 'claimed' ? 'Swap completed successfully!' : 
                   swapState.status === 'locked' ? 'Funds locked on both chains' :
                   swapState.status === 'initiated' ? 'Swap initiated' : 'Processing...'}
                </p>
              </div>
            </div>

            {/* Transaction Summary */}
            <div className="bg-white p-4 rounded-lg border">
              <h5 className="font-semibold text-gray-800 mb-3">Transaction Summary</h5>
              
              <div className="space-y-4">
                {/* Step 1: User Lock */}
                <div className="border-l-4 border-blue-500 pl-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h6 className="font-medium text-gray-800">1. User Lock</h6>
                      <p className="text-sm text-gray-600">
                        {swap.direction === 'eth→trx' ? 'User locks ETH on Ethereum' : 'User locks TRX on TRON'}
                      </p>
                    </div>
                    <div className="text-right">
                      {swap.direction === 'eth→trx' && swapState.eth_lock_tx ? (
                        <div className="text-green-600 text-sm">✅ Completed</div>
                      ) : swap.direction === 'trx→eth' && swapState.tron_lock_tx ? (
                        <div className="text-green-600 text-sm">✅ Completed</div>
                      ) : (
                        <div className="text-yellow-600 text-sm">⏳ Pending</div>
                      )}
                    </div>
                  </div>
                  {swap.direction === 'eth→trx' && swapState.eth_lock_tx && (
                    <div className="mt-2">
                      <a 
                        href={getTransactionExplorerUrl(swapState.eth_lock_tx, 'ethereum')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-mono text-sm"
                      >
                        {formatTransactionHash(swapState.eth_lock_tx)}
                      </a>
                    </div>
                  )}
                  {swap.direction === 'trx→eth' && swapState.tron_lock_tx && (
                    <div className="mt-2">
                      <a 
                        href={getTransactionExplorerUrl(swapState.tron_lock_tx, 'tron')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-mono text-sm"
                      >
                        {formatTransactionHash(swapState.tron_lock_tx)}
                      </a>
                    </div>
                  )}
                </div>

                {/* Step 2: Resolver Lock */}
                <div className="border-l-4 border-green-500 pl-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h6 className="font-medium text-gray-800">2. Resolver Lock</h6>
                      <p className="text-sm text-gray-600">
                        {swap.direction === 'eth→trx' ? 'Resolver locks TRX on TRON' : 'Resolver locks ETH on Ethereum'}
                      </p>
                    </div>
                    <div className="text-right">
                      {swapState.tron_lock_tx && swap.direction === 'eth→trx' ? (
                        <div className="text-green-600 text-sm">✅ Completed</div>
                      ) : swapState.eth_lock_tx && swap.direction === 'trx→eth' ? (
                        <div className="text-green-600 text-sm">✅ Completed</div>
                      ) : (
                        <div className="text-yellow-600 text-sm">⏳ Pending</div>
                      )}
                    </div>
                  </div>
                  {swapState.tron_lock_tx && swap.direction === 'eth→trx' && (
                    <div className="mt-2">
                      <a 
                        href={getTransactionExplorerUrl(swapState.tron_lock_tx, 'tron')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-mono text-sm"
                      >
                        {formatTransactionHash(swapState.tron_lock_tx)}
                      </a>
                    </div>
                  )}
                  {swapState.eth_lock_tx && swap.direction === 'trx→eth' && (
                    <div className="mt-2">
                      <a 
                        href={getTransactionExplorerUrl(swapState.eth_lock_tx, 'ethereum')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-mono text-sm"
                      >
                        {formatTransactionHash(swapState.eth_lock_tx)}
                      </a>
                    </div>
                  )}
                </div>

                {/* Step 3: User Claim */}
                <div className="border-l-4 border-purple-500 pl-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h6 className="font-medium text-gray-800">3. User Claim</h6>
                      <p className="text-sm text-gray-600">
                        {swap.direction === 'eth→trx' ? 'User claims TRX on TRON' : 'User claims ETH on Ethereum'}
                      </p>
                    </div>
                    <div className="text-right">
                      {swapState.tron_claim_tx && swap.direction === 'eth→trx' ? (
                        <div className="text-green-600 text-sm">✅ Completed</div>
                      ) : swapState.eth_claim_tx && swap.direction === 'trx→eth' ? (
                        <div className="text-green-600 text-sm">✅ Completed</div>
                      ) : (
                        <div className="text-yellow-600 text-sm">⏳ Pending</div>
                      )}
                    </div>
                  </div>
                  {swapState.tron_claim_tx && swap.direction === 'eth→trx' && (
                    <div className="mt-2">
                      <a 
                        href={getTransactionExplorerUrl(swapState.tron_claim_tx, 'tron')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-mono text-sm"
                      >
                        {formatTransactionHash(swapState.tron_claim_tx)}
                      </a>
                    </div>
                  )}
                  {swapState.eth_claim_tx && swap.direction === 'trx→eth' && (
                    <div className="mt-2">
                      <a 
                        href={getTransactionExplorerUrl(swapState.eth_claim_tx, 'ethereum')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-mono text-sm"
                      >
                        {formatTransactionHash(swapState.eth_claim_tx)}
                      </a>
                    </div>
                  )}
                </div>

                {/* Step 4: Resolver Claim */}
                <div className="border-l-4 border-orange-500 pl-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h6 className="font-medium text-gray-800">4. Resolver Claim</h6>
                      <p className="text-sm text-gray-600">
                        {swap.direction === 'eth→trx' ? 'Resolver claims ETH on Ethereum' : 'Resolver claims TRX on TRON'}
                      </p>
                    </div>
                    <div className="text-right">
                      {swapState.eth_claim_tx && swap.direction === 'eth→trx' ? (
                        <div className="text-green-600 text-sm">✅ Completed</div>
                      ) : swapState.tron_claim_tx && swap.direction === 'trx→eth' ? (
                        <div className="text-green-600 text-sm">✅ Completed</div>
                      ) : (
                        <div className="text-yellow-600 text-sm">⏳ Pending</div>
                      )}
                    </div>
                  </div>
                  {swapState.eth_claim_tx && swap.direction === 'eth→trx' && (
                    <div className="mt-2">
                      <a 
                        href={getTransactionExplorerUrl(swapState.eth_claim_tx, 'ethereum')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-mono text-sm"
                      >
                        {formatTransactionHash(swapState.eth_claim_tx)}
                      </a>
                    </div>
                  )}
                  {swapState.tron_claim_tx && swap.direction === 'trx→eth' && (
                    <div className="mt-2">
                      <a 
                        href={getTransactionExplorerUrl(swapState.tron_claim_tx, 'tron')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-mono text-sm"
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
              <div className="mt-4">
                <button
                  onClick={handleClaim}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Claiming...' : 'Claim Tokens'}
                </button>
              </div>
            )}

            {/* Success Message */}
            {swapState.status === 'claimed' && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">🎉</span>
                  <div>
                    <h6 className="font-semibold text-green-800">Swap Completed Successfully!</h6>
                    <p className="text-sm text-green-600">
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