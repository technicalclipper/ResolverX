'use client';

import { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { ApiClient } from '../lib/api';

const apiClient = ApiClient.getInstance();

export default function ResolverRegistration() {
  const { walletState } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    endpoint: '',
    eth_address: '',
    tron_address: '',
    supported_directions: ['eth→trx', 'trx→eth'],
    liquidity_eth: '0',
    liquidity_trx: '0',
    fee_percent: 0.001
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null);
    setSuccess(null);
  };

  const handleDirectionsChange = (direction: 'eth→trx' | 'trx→eth') => {
    setFormData(prev => ({
      ...prev,
      supported_directions: prev.supported_directions.includes(direction)
        ? prev.supported_directions.filter(d => d !== direction)
        : [...prev.supported_directions, direction]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Use connected wallet addresses if available
      const resolverData = {
        ...formData,
        eth_address: formData.eth_address || walletState.ethAddress || '',
        tron_address: formData.tron_address || walletState.tronAddress || '',
        fee_percent: parseFloat(formData.fee_percent.toString())
      };

      const response = await apiClient.registerResolver(resolverData);
      setSuccess('Resolver registered successfully!');
      
      // Reset form
      setFormData({
        name: '',
        endpoint: '',
        eth_address: '',
        tron_address: '',
        supported_directions: ['eth→trx', 'trx→eth'],
        liquidity_eth: '0',
        liquidity_trx: '0',
        fee_percent: 0.001
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register resolver');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Register New Resolver</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Resolver Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., My Resolver"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              API Endpoint
            </label>
            <input
              type="url"
              name="endpoint"
              value={formData.endpoint}
              onChange={handleInputChange}
              placeholder="https://resolver.example.com/api"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        {/* Wallet Addresses */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Ethereum Address {walletState.ethAddress && '(Connected with MetaMask)'}
            </label>
            <input
              type="text"
              name="eth_address"
              value={formData.eth_address || walletState.ethAddress || ''}
              onChange={handleInputChange}
              placeholder="0x..."
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              TRON Address {walletState.tronAddress && '(Connected with TronLink)'}
            </label>
            <input
              type="text"
              name="tron_address"
              value={formData.tron_address || walletState.tronAddress || ''}
              onChange={handleInputChange}
              placeholder="T..."
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        {/* Supported Directions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Supported Directions
          </label>
          <div className="space-x-4">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={formData.supported_directions.includes('eth→trx')}
                onChange={() => handleDirectionsChange('eth→trx')}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <span className="ml-2">ETH → TRX</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={formData.supported_directions.includes('trx→eth')}
                onChange={() => handleDirectionsChange('trx→eth')}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <span className="ml-2">TRX → ETH</span>
            </label>
          </div>
        </div>

        {/* Liquidity and Fee */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              ETH Liquidity
            </label>
            <input
              type="number"
              name="liquidity_eth"
              value={formData.liquidity_eth}
              onChange={handleInputChange}
              step="0.000001"
              min="0"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              TRX Liquidity
            </label>
            <input
              type="number"
              name="liquidity_trx"
              value={formData.liquidity_trx}
              onChange={handleInputChange}
              step="0.000001"
              min="0"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Fee Percentage
            </label>
            <input
              type="number"
              name="fee_percent"
              value={formData.fee_percent}
              onChange={handleInputChange}
              step="0.0001"
              min="0"
              max="1"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              Enter as decimal (e.g., 0.001 for 0.1%)
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Registering...' : 'Register Resolver'}
          </button>
        </div>
      </form>
    </div>
  );
}