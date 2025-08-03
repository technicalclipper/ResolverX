'use client';

import { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { ApiClient } from '../lib/api';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

type Direction = 'eth→trx' | 'trx→eth';

const neoBrutalismInput = "border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none transition-shadow";

const apiClient = ApiClient.getInstance();

export default function ResolverRegistration() {
  const { walletState } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    name: string;
    endpoint: string;
    eth_address: string;
    tron_address: string;
    supported_directions: Direction[];
    liquidity_eth: string;
    liquidity_trx: string;
    fee_percent: number;
  }>({
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
      const resolverData = {
        ...formData,
        eth_address: formData.eth_address || walletState.ethAddress || '',
        tron_address: formData.tron_address || walletState.tronAddress || '',
        fee_percent: parseFloat(formData.fee_percent.toString())
      };

      const response = await apiClient.registerResolver(resolverData);
      setSuccess('Resolver registered successfully!');
      
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
    <div className="space-y-8">
      <h1 className="text-5xl font-black text-center">Resolver Registration</h1>
      <p className="text-3xl text-center font-bold mt-4 mb-8"> Run your bot. Bridge Ethereum ↔ TRON. Earn as a resolver.</p>
      <Card className="w-full max-w-4xl mx-auto border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all bg-[#DCEBFE]">
        <CardHeader className="border-b-2 border-black pb-4">
          <CardTitle className="text-2xl font-black">Register New Resolver</CardTitle>
          <CardDescription className="text-base font-medium text-black">
            Register your resolver to provide liquidity for cross-chain swaps
          </CardDescription>
        </CardHeader>

        {error && (
          <div className="mx-6 p-4 bg-red-100 border-2 border-red-900 text-red-900 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mx-6 p-4 bg-green-100 border-2 border-green-900 text-green-900 rounded">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4 pt-6">
              <div className="grid gap-2">
                <Label htmlFor="name">Resolver Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., My Resolver"
                  required
                  className={neoBrutalismInput}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="endpoint">API Endpoint</Label>
                <Input
                  id="endpoint"
                  name="endpoint"
                  type="url"
                  value={formData.endpoint}
                  onChange={handleInputChange}
                  placeholder="https://resolver.example.com/api"
                  required
                  className={neoBrutalismInput}
                />
              </div>
            </div>

            {/* Wallet Addresses */}
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="eth_address">
                  Ethereum Address {walletState.ethAddress && '(Connected with MetaMask)'}
                </Label>
                <Input
                  id="eth_address"
                  name="eth_address"
                  value={formData.eth_address || walletState.ethAddress || ''}
                  onChange={handleInputChange}
                  placeholder="0x..."
                  required
                  className={neoBrutalismInput}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="tron_address">
                  TRON Address {walletState.tronAddress && '(Connected with TronLink)'}
                </Label>
                <Input
                  id="tron_address"
                  name="tron_address"
                  value={formData.tron_address || walletState.tronAddress || ''}
                  onChange={handleInputChange}
                  placeholder="T..."
                  required
                  className={neoBrutalismInput}
                />
              </div>
            </div>

            {/* Supported Directions */}
            <div className="space-y-2">
              <Label>Supported Directions</Label>
              <div className="flex gap-8 mt-4">
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="eth-to-trx"
                    checked={formData.supported_directions.includes('eth→trx')}
                    onCheckedChange={() => handleDirectionsChange('eth→trx')}
                    className="border-2 border-black data-[state=checked]:bg-[#4285f4] data-[state=checked]:border-black"
                  />
                  <Label htmlFor="eth-to-trx" className="font-bold">ETH → TRX</Label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="trx-to-eth"
                    checked={formData.supported_directions.includes('trx→eth')}
                    onCheckedChange={() => handleDirectionsChange('trx→eth')}
                    className="border-2 border-black data-[state=checked]:bg-[#4285f4] data-[state=checked]:border-black"
                  />
                  <Label htmlFor="trx-to-eth" className="font-bold">TRX → ETH</Label>
                </div>
              </div>
            </div>

            {/* Liquidity and Fee */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="liquidity_eth">ETH Liquidity</Label>
                <Input
                  id="liquidity_eth"
                  name="liquidity_eth"
                  type="number"
                  value={formData.liquidity_eth}
                  onChange={handleInputChange}
                  step="0.000001"
                  min="0"
                  className={neoBrutalismInput}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="liquidity_trx">TRX Liquidity</Label>
                <Input
                  id="liquidity_trx"
                  name="liquidity_trx"
                  type="number"
                  value={formData.liquidity_trx}
                  onChange={handleInputChange}
                  step="0.000001"
                  min="0"
                  className={neoBrutalismInput}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="fee_percent">Fee Percentage</Label>
                <Input
                  id="fee_percent"
                  name="fee_percent"
                  type="number"
                  value={formData.fee_percent}
                  onChange={handleInputChange}
                  step="0.0001"
                  min="0"
                  max="1"
                  placeholder="Enter as decimal (e.g., 0.001 for 0.1%)"
                  className={neoBrutalismInput}
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="mt-6">
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full text-lg font-bold h-16 bg-[#4285f4] hover:bg-[#4285f4]/90 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all"
              variant="default"
            >
              {loading ? 'Registering...' : 'Register Resolver'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}