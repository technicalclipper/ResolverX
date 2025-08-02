import WalletConnect from './components/WalletConnect';
import SwapInterface from './components/SwapInterface';

export default function Home() {
  return (
    <main className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🔄 ResolverX
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Secure cross-chain swaps between Ethereum and TRON with a decentralized resolver marketplace
          </p>
        </div>
        
        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Wallet Connection */}
          <div className="lg:col-span-1">
            <WalletConnect />
          </div>
          
          {/* Right Column - Swap Interface */}
          <div className="lg:col-span-2">
            <SwapInterface />
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>Connect your wallet to start swapping ETH ↔ TRX</p>
          <p className="mt-2">
            <span className="font-semibold">Supported Networks:</span> Sepolia Testnet & Nile Testnet
          </p>
        </div>
      </div>
    </main>
  );
}
