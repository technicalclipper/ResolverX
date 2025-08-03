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
    // Reset resolver selection when direction changes
    setFormData(prev => ({ ...prev, selectedResolver: null }));
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
      console.log('🔍 Loading resolvers for direction:', formData.direction);
      const availableResolvers = await apiClient.getResolvers(formData.direction);
      console.log('📋 Available resolvers:', availableResolvers);
      setResolvers(availableResolvers);
      
      // Auto-select first resolver if available
      if (availableResolvers.length > 0 && !formData.selectedResolver) {
        console.log('🔄 Auto-selecting first resolver:', availableResolvers[0]);
        setFormData(prev => ({ ...prev, selectedResolver: availableResolvers[0] }));
      } else {
        console.log('ℹ️ Not auto-selecting resolver:', {
          hasResolvers: availableResolvers.length > 0,
          currentResolver: formData.selectedResolver
        });
      }
    } catch (err) {
      setError('Failed to load resolvers');
      console.error('❌ Error loading resolvers:', err);
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
    console.log('🔄 Direction changed to:', direction);
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
    console.log('🔄 Selecting resolver:', resolver);
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
      if (!formData.selectedResolver) {
        throw new Error('No resolver selected');
      }

      console.log('🚀 Creating swap with resolver:', formData.selectedResolver);
      const response = await apiClient.createSwap(
        formData.direction, 
        formData.amount, 
        walletState.ethAddress, 
        walletState.tronAddress,
        formData.selectedResolver.id
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
      <div className={`${formData.direction === 'eth→trx' ? 'bg-[#DCEBFE]' : 'bg-[#fde8e8]'} border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6`}>
        <h2 className="text-3xl font-black text-black mb-6">Swap Tokens</h2>
        
        {error && (
          <div className="mb-4 p-4 bg-red-100 border-2 border-black text-black font-bold">
            {error}
          </div>
        )}

        {/* Direction Toggle */}
        <div className="mb-6">
          <label className="block text-xl font-black text-black mb-3">
            Swap Direction
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleDirectionChange('eth→trx')}
              className={`py-3 px-4 text-lg font-bold border-2 border-black transition-all ${
                formData.direction === 'eth→trx'
                  ? 'bg-[#4285f4] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                  : 'bg-white hover:bg-[#4285f4] hover:text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <img src="/images/ethpng.png" alt="ETH" className="w-8 h-8 object-contain" />
                <span>ETH → TRX</span>
                <img src="/images/Tron.png" alt="TRX" className="w-6 h-6 object-contain" />
              </div>
            </button>
            <button
              onClick={() => handleDirectionChange('trx→eth')}
              className={`py-3 px-4 text-lg font-bold border-2 border-black transition-all ${
                formData.direction === 'trx→eth'
                  ? 'bg-[#C23631] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                  : 'bg-white hover:bg-[#C23631] hover:text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <img src="/images/Tron.png" alt="TRX" className="w-6 h-6 object-contain" />
                <span>TRX → ETH</span>
                <img src="/images/ethpng.png" alt="ETH" className="w-8 h-8 object-contain" />
              </div>
            </button>
          </div>
        </div>

        {/* Amount Input */}
        <div className="mb-6">
          <label className="block text-xl font-black text-black mb-3">
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
              className="w-full px-4 py-3 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-lg font-bold focus:outline-none focus:shadow-none focus:translate-x-[2px] focus:translate-y-[2px] transition-all"
            />
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-black font-bold">
              {formData.direction === 'eth→trx' ? 'ETH' : 'TRX'}
            </div>
          </div>
        </div>

        {/* Resolver Selection */}
        <div className="mb-6">
          <label className="block text-xl font-black text-black mb-3">
            Select Resolver
          </label>
          {loading ? (
            <div className="p-4 text-center font-bold text-black">Loading resolvers...</div>
          ) : resolvers.length > 0 ? (
            <div className="space-y-3">
              {resolvers.map((resolver) => (
                <button
                  key={resolver.id}
                  onClick={() => handleResolverSelect(resolver)}
                  className={`w-full p-4 border-2 border-black text-left transition-all ${
                    formData.selectedResolver?.id === resolver.id
                      ? `bg-${formData.direction === 'eth→trx' ? '[#4285f4]' : '[#C23631]'} text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`
                      : `bg-white hover:bg-${formData.direction === 'eth→trx' ? '[#4285f4]' : '[#C23631]'} hover:text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-lg font-black">{resolver.name}</div>
                      <div className="text-base font-bold">
                        Fee: {resolver.fee_percent}% | 
                        Liquidity: {formData.direction === 'eth→trx' 
                          ? `${resolver.liquidity_eth} ETH` 
                          : `${resolver.liquidity_trx} TRX`
                        }
                      </div>
                    </div>
                    {formData.selectedResolver?.id === resolver.id && (
                      <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center border-2 border-black">
                        <svg className={`w-4 h-4 text-${formData.direction === 'eth→trx' ? '[#4285f4]' : '[#C23631]'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center font-bold text-black">No resolvers available for this direction</div>
          )}
        </div>

        {/* Estimate */}
        {estimate && (
          <div className="mb-6 p-4 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-xl font-black text-black mb-3">Swap Estimate</h3>
            <div className="space-y-2 text-base">
              <div className="flex justify-between">
                <span className="font-bold text-black">You pay:</span>
                <span className="font-bold">{estimate.userAmount} {estimate.userToken}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-black">Resolver fee:</span>
                <span className="font-bold">{estimate.resolverFee} {estimate.userToken}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-black">Total:</span>
                <span className="font-bold">{estimate.totalAmount} {estimate.userToken}</span>
              </div>
              <div className="flex justify-between pt-3 border-t-2 border-black">
                <span className="font-bold text-black">You receive:</span>
                <span className={`font-bold text-${formData.direction === 'eth→trx' ? '[#4285f4]' : '[#C23631]'}`}>
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
          className={`w-full py-4 px-6 text-xl font-black border-2 border-black transition-all ${
            loading || !formData.amount || !formData.selectedResolver
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : `bg-${formData.direction === 'eth→trx' ? '[#4285f4]' : '[#C23631]'} text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]`
          }`}
        >
          {loading ? 'Processing...' : 'Execute Swap'}
        </button>
      </div>
    </div>
  );
} 