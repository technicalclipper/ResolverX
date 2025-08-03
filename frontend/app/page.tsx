import WalletConnect from './components/WalletConnect';
import SwapInterface from './components/SwapInterface';

export default function Home() {
  return (
    <main className="min-h-screen p-4">
            <div className="max-w-6xl mx-auto relative">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-black text-black mb-6 flex items-center justify-center gap-4">
            <img src="/images/rlogo.png" alt="ResolverX" className="w-28 h-28 object-contain" />
            ResolverX
          </h1>
          <div className="relative">
            <p className="text-2xl font-bold text-black max-w-2xl mx-auto">
              Secure cross-chain swaps between Ethereum and TRON with a Decentralized Resolver Marketplace
            </p>
            <div className="absolute -top-1 -right-32">
              <a 
                href="/resolver/register" 
                className="inline-block px-6 py-3 bg-[#4285f4] text-white text-lg font-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all whitespace-nowrap"
              >
                Join Resolver Marketplace
              </a>
            </div>
          </div>
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
