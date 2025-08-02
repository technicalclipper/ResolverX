'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { apiClient } from '../lib/api';
import { Resolver, SwapFormData, SwapEstimate } from '../types/swap';
import SwapStatus from './SwapStatus';

export default function SwapInterface() {
  const { walletState } = useWallet();
  const [formData, setFormData] = useState<SwapFormData>({
    direction: 'eth→trx',
    amount: '',
    selectedResolver: null
  });
  const [resolvers, setResolvers] = useState<Resolver[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<SwapEstimate | null>(null);
  const [currentSwap, setCurrentSwap] = useState<any>(null);

  // Load resolvers when direction changes
  useEffect(() => {
    loadResolvers();
  }, [formData.direction]);

  // Calculate estimate when amount or resolver changes
  useEffect(() => {
    if (formData.amount && formData.selectedResolver) {
      calculateEstimate();
    } else {
      setEstimate(null);
    }
  }, [formData.amount, formData.selectedResolver]);

  const loadResolvers = async () => {
    try {
      setLoading(true);
      const availableResolvers = await apiClient.getResolvers(formData.direction);
      setResolvers(availableResolvers);
      
      // Auto-select first resolver if available
      if (availableResolvers.length > 0 && !formData.selectedResolver) {
        setFormData(prev => ({ ...prev, selectedResolver: availableResolvers[0] }));
      }
    } catch (err) {
      setError('Failed to load resolvers');
      console.error('Error loading resolvers:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateEstimate = () => {
    if (!formData.amount || !formData.selectedResolver) return;

    const amount = parseFloat(formData.amount);
    const feePercent = formData.selectedResolver.fee_percent / 100;
    const fee = amount * feePercent;
    const total = amount + fee;

    // Simple exchange rate (you can replace with real API)
    const exchangeRate = formData.direction === 'eth→trx' ? 11265.12 : 0.0000887;
    const estimatedReceive = amount * exchangeRate;

    // Format estimated receive with appropriate precision
    const estimatedReceiveFormatted = estimatedReceive >= 1
      ? estimatedReceive.toFixed(2)
      : estimatedReceive.toFixed(6);

    setEstimate({
      userAmount: formData.amount,
      userToken: formData.direction === 'eth→trx' ? 'ETH' : 'TRX',
      resolverFee: fee.toFixed(6),
      totalAmount: total.toFixed(6),
      exchangeRate,
      estimatedReceive: estimatedReceiveFormatted
    });
  };

  const handleDirectionChange = (direction: 'eth→trx' | 'trx→eth') => {
    setFormData(prev => ({ 
      ...prev, 
      direction,
      selectedResolver: null // Reset resolver selection
    }));
    setError(null);
  };

  const handleAmountChange = (amount: string) => {
    setFormData(prev => ({ ...prev, amount }));
    setError(null);
  };

  const handleResolverSelect = (resolver: Resolver) => {
    setFormData(prev => ({ ...prev, selectedResolver: resolver }));
    setError(null);
  };

  const handleSwap = async () => {
    console.log('🔍 Current wallet state:', walletState);
    
    if (!walletState.isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    if (!formData.amount || !formData.selectedResolver) {
      setError('Please fill in all fields');
      return;
    }

    // Check if both wallets are connected
    if (!walletState.ethAddress || !walletState.tronAddress) {
      setError('Please connect both MetaMask and TronLink wallets to perform a swap');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Step 1: Create swap
      const response = await apiClient.createSwap(
        formData.direction, 
        formData.amount, 
        walletState.ethAddress, 
        walletState.tronAddress
      );
      
      // The backend returns a nested structure, so we need to access response.swap
      const swap = response.swap;
      const secret = response.lockParams.secret; // Get the secret from the response
      setCurrentSwap(swap);

      console.log('Swap created:', response);
      console.log('Secret for claims:', secret);
      
      // Step 2: Get transaction parameters and sign with user wallet
      if (formData.direction === 'eth→trx') {
        await executeEthToTrxSwap(swap.hashlock, secret);
      } else {
        await executeTrxToEthSwap(swap.hashlock, secret);
      }
      
      // Reset form
      setFormData({
        direction: 'eth→trx',
        amount: '',
        selectedResolver: null
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Swap failed');
      console.error('Swap error:', err);
    } finally {
      setLoading(false);
    }
  };

  const executeEthToTrxSwap = async (hashlock: string, secret: string) => {
    try {
      // Get ETH lock transaction parameters
      const lockParams = await apiClient.getEthLockParams(hashlock);
      
      // Sign transaction with MetaMask
      if (!window.ethereum) {
        throw new Error('MetaMask not found');
      }

      // Check if user is on Sepolia network
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (chainId !== '0xaa36a7') { // Sepolia chainId
        throw new Error('Please switch to Sepolia network in MetaMask');
      }

      const txParams = lockParams.transactionParams;
      console.log('🔍 ETH Lock Transaction Parameters:', txParams);
      console.log('🔍 To address:', txParams.to);
      console.log('🔍 To address type:', typeof txParams.to);
      console.log('🔍 To address length:', txParams.to?.length);
      console.log('🔍 Data field:', txParams.data);
      console.log('🔍 Data field type:', typeof txParams.data);
      console.log('🔍 Data field length:', txParams.data?.length);
      
      // Convert value to hexadecimal string for MetaMask
      const valueHex = `0x${BigInt(txParams.value).toString(16)}`;
      console.log('🔍 Value (decimal):', txParams.value);
      console.log('🔍 Value (hex):', valueHex);
      
      // Create the transaction object with from address
      const transactionObject = {
        from: walletState.ethAddress,
        to: txParams.to,
        data: txParams.data,
        value: valueHex
      };
      
      console.log('🔍 Final transaction object:', transactionObject);
      console.log('🔍 Final transaction object stringified:', JSON.stringify(transactionObject, null, 2));
      console.log('🔍 From address type:', typeof walletState.ethAddress);
      console.log('🔍 From address length:', walletState.ethAddress?.length);
      console.log('🔍 From address value:', walletState.ethAddress);
      
      // Validate addresses
      if (!walletState.ethAddress || !walletState.ethAddress.startsWith('0x') || walletState.ethAddress.length !== 42) {
        throw new Error(`Invalid from address: ${walletState.ethAddress}`);
      }
      
      if (!txParams.to || !txParams.to.startsWith('0x') || txParams.to.length !== 42) {
        throw new Error(`Invalid to address: ${txParams.to}`);
      }
      
      // Try to get the current account first
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found in MetaMask');
      }
      
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [transactionObject]
      });

      console.log('ETH lock transaction signed:', txHash);

      // Submit signed transaction to backend
      const result = await apiClient.submitEthLock(hashlock, txHash);
      console.log('Swap execution result:', result);
      
      // Step 3: User claims TRX on TRON chain (reveals secret)
      console.log('💰 Step 3: User claiming TRX on TRON chain...');
      const userClaimResult = await executeUserClaim(hashlock, 'tron', secret);
      console.log('User TRX claim result:', userClaimResult);
      
      // Step 4: Resolver claims ETH on Ethereum chain (uses secret)
      console.log('💰 Step 4: Resolver claiming ETH on Ethereum chain...');
      const resolverClaimResult = await apiClient.triggerResolverClaim(hashlock, secret);
      console.log('Resolver ETH claim result:', resolverClaimResult);
      
      console.log('🎉 Complete ETH→TRX swap successful!');

    } catch (err) {
      throw new Error(`ETH→TRX swap failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const executeTrxToEthSwap = async (hashlock: string, secret: string) => {
    try {
      // Get TRX lock transaction parameters
      const lockParams = await apiClient.getTrxLockParams(hashlock);
      
      // Sign transaction with TronLink
      if (!window.tronWeb) {
        throw new Error('TronLink not found');
      }

      const txParams = lockParams.transactionParams;
      const result = await window.tronWeb.contract().at(txParams.contractAddress)
        .then(contract => {
          return contract[txParams.functionName](...txParams.parameters).send({
            feeLimit: txParams.feeLimit,
            callValue: txParams.callValue
          });
        });

      console.log('TRX lock transaction signed:', result);

      // Submit signed transaction to backend
      const submitResult = await apiClient.submitTrxLock(hashlock, result);
      console.log('Swap execution result:', submitResult);
      
      // Step 3: User claims ETH on Ethereum chain (reveals secret)
      console.log('💰 Step 3: User claiming ETH on Ethereum chain...');
      const userClaimResult = await executeUserClaim(hashlock, 'ethereum', secret);
      console.log('User ETH claim result:', userClaimResult);
      
      // Step 4: Resolver claims TRX on TRON chain (uses secret)
      console.log('💰 Step 4: Resolver claiming TRX on TRON chain...');
      const resolverClaimResult = await apiClient.triggerResolverClaim(hashlock, secret);
      console.log('Resolver TRX claim result:', resolverClaimResult);
      
      console.log('🎉 Complete TRX→ETH swap successful!');

         } catch (err) {
       throw new Error(`TRX→ETH swap failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
     }
   };

   const executeUserClaim = async (hashlock: string, chain: string, secret: string) => {
     try {
       // Get claim transaction parameters
       const claimParams = await apiClient.getClaimParams(hashlock, chain, secret);
       
       let txHash: string;
       
       if (chain === 'ethereum') {
         // Sign ETH claim with MetaMask
         if (!window.ethereum) {
           throw new Error('MetaMask not found');
         }

         const txParams = claimParams.transactionParams;
         const transactionObject = {
           from: walletState.ethAddress,
           to: txParams.to,
           data: txParams.data,
           value: txParams.value,
           chainId: `0x${txParams.chainId.toString(16)}`
         };

         txHash = await window.ethereum.request({
           method: 'eth_sendTransaction',
           params: [transactionObject]
         });

       } else if (chain === 'tron') {
         // Sign TRX claim with TronLink
         if (!window.tronWeb) {
           throw new Error('TronLink not found');
         }

         const txParams = claimParams.transactionParams;
         const result = await window.tronWeb.contract().at(txParams.contractAddress)
           .then(contract => {
             return contract[txParams.functionName](...txParams.parameters).send({
               feeLimit: txParams.feeLimit,
               callValue: txParams.callValue
             });
           });

         txHash = result;
       } else {
         throw new Error(`Unsupported chain: ${chain}`);
       }

       console.log(`${chain.toUpperCase()} claim transaction signed:`, txHash);

       // Submit signed transaction to backend
       const result = await apiClient.submitClaim(hashlock, chain, txHash);
       console.log('Claim submission result:', result);

       return {
         success: true,
         txHash: txHash,
         message: `${chain} claim successful`
       };

     } catch (err) {
       throw new Error(`${chain.toUpperCase()} claim failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
     }
   };

  if (!walletState.ethAddress || !walletState.tronAddress) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Connect Both Wallets to Start Swapping</h2>
          <p className="text-gray-600 mb-4">
            You need to connect both MetaMask and TronLink wallets to perform atomic swaps.
          </p>
          <div className="text-sm text-gray-500 space-y-1">
            {!walletState.ethAddress && <p>• MetaMask (Ethereum) wallet not connected</p>}
            {!walletState.tronAddress && <p>• TronLink (TRON) wallet not connected</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Current Swap Status */}
      {currentSwap && (
        <SwapStatus swap={currentSwap} />
      )}

      {/* Swap Form */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Swap Tokens</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Direction Toggle */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Swap Direction
          </label>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => handleDirectionChange('eth→trx')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                formData.direction === 'eth→trx'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              ETH → TRX
            </button>
            <button
              onClick={() => handleDirectionChange('trx→eth')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                formData.direction === 'trx→eth'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              TRX → ETH
            </button>
          </div>
        </div>

        {/* Amount Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount ({formData.direction === 'eth→trx' ? 'ETH' : 'TRX'})
          </label>
          <div className="relative">
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="0.0"
              step="0.000001"
              min="0"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
              {formData.direction === 'eth→trx' ? 'ETH' : 'TRX'}
            </div>
          </div>
        </div>

        {/* Resolver Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Resolver
          </label>
          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading resolvers...</div>
          ) : resolvers.length > 0 ? (
            <div className="space-y-2">
              {resolvers.map((resolver) => (
                <button
                  key={resolver.id}
                  onClick={() => handleResolverSelect(resolver)}
                  className={`w-full p-4 border rounded-lg text-left transition-colors ${
                    formData.selectedResolver?.id === resolver.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-gray-900">{resolver.name}</div>
                      <div className="text-sm text-gray-500">
                        Fee: {resolver.fee_percent}% | 
                        Liquidity: {formData.direction === 'eth→trx' 
                          ? `${resolver.liquidity_eth} ETH` 
                          : `${resolver.liquidity_trx} TRX`
                        }
                      </div>
                    </div>
                    {formData.selectedResolver?.id === resolver.id && (
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">No resolvers available for this direction</div>
          )}
        </div>

        {/* Estimate */}
        {estimate && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Swap Estimate</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">You pay:</span>
                <span className="font-medium">{estimate.userAmount} {estimate.userToken}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Resolver fee:</span>
                <span className="font-medium">{estimate.resolverFee} {estimate.userToken}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total:</span>
                <span className="font-medium">{estimate.totalAmount} {estimate.userToken}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="text-gray-600">You receive:</span>
                <span className="font-medium text-green-600">
                  ~{estimate.estimatedReceive} {formData.direction === 'eth→trx' ? 'TRX' : 'ETH'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Execute Button */}
        <button
          onClick={handleSwap}
          disabled={loading || !formData.amount || !formData.selectedResolver}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            loading || !formData.amount || !formData.selectedResolver
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {loading ? 'Processing...' : 'Execute Swap'}
        </button>
      </div>
    </div>
  );
} 