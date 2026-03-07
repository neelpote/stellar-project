import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useWallet } from './hooks/useWallet';
import { useAdmin } from './hooks/useAdmin';
import { useQuery } from '@tanstack/react-query';
import { FounderView } from './components/FounderView';
import { AdminView } from './components/AdminView';
import { VCView } from './components/VCView';
import { PublicVotingView } from './components/PublicVotingView';
import { AboutView } from './components/AboutView';
import * as StellarSdk from '@stellar/stellar-sdk';
import { CONTRACT_ID, NETWORK_PASSPHRASE } from './config';
import { server } from './stellar';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

type ViewMode = 'founder' | 'vc' | 'voting' | 'admin' | 'about';

function AppContent() {
  const { wallet, connectWallet, disconnectWallet } = useWallet();
  const { data: adminAddress, isLoading: adminLoading } = useAdmin();
  const [viewMode, setViewMode] = useState<ViewMode>('founder');

  // Listen for navigation events
  useEffect(() => {
    const handleNavigateToVC = () => setViewMode('vc');
    window.addEventListener('navigate-to-vc', handleNavigateToVC);
    return () => window.removeEventListener('navigate-to-vc', handleNavigateToVC);
  }, []);

  const { data: isVC } = useQuery({
    queryKey: ['isVC', wallet.publicKey],
    queryFn: async () => {
      if (!wallet.publicKey) return false;
      
      try {
        const contract = new StellarSdk.Contract(CONTRACT_ID);
        const sourceAccount = await server.getAccount(wallet.publicKey);
        
        const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
          fee: '100',
          networkPassphrase: NETWORK_PASSPHRASE,
        })
          .addOperation(
            contract.call(
              'is_vc',
              StellarSdk.Address.fromString(wallet.publicKey).toScVal()
            )
          )
          .setTimeout(30)
          .build();

        const simulated = await server.simulateTransaction(transaction);
        
        if (StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulated)) {
          const result = simulated.result?.retval;
          if (result) {
            return StellarSdk.scValToNative(result);
          }
        }
        
        return false;
      } catch (error) {
        console.error('Error checking VC status:', error);
        return false;
      }
    },
    enabled: !!wallet.publicKey,
    refetchInterval: 30000,
  });

  const isAdmin = wallet.publicKey && adminAddress && !adminLoading && wallet.publicKey === adminAddress;

  const renderView = () => {
    // Allow About view without wallet connection
    if (viewMode === 'about') {
      return <AboutView />;
    }
    
    if (!wallet.isConnected || !wallet.publicKey) return null;
    
    // Only allow admin view if user is actually the admin
    if (viewMode === 'admin' && isAdmin && adminAddress === wallet.publicKey) {
      return <AdminView publicKey={wallet.publicKey} />;
    }
    
    // If someone tries to access admin view but isn't admin, redirect to founder view
    if (viewMode === 'admin' && (!isAdmin || adminAddress !== wallet.publicKey)) {
      setViewMode('founder');
      return <FounderView publicKey={wallet.publicKey} />;
    }
    
    switch (viewMode) {
      case 'vc':
        return <VCView publicKey={wallet.publicKey} />;
      case 'voting':
        return <PublicVotingView publicKey={wallet.publicKey} />;
      case 'founder':
      default:
        return <FounderView publicKey={wallet.publicKey} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b-2 border-gray-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    DeCo
                  </h1>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Decentralized Combinator</p>
                </div>
              </div>
              
              {/* Navigation Tabs */}
              {wallet.isConnected && !adminLoading && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setViewMode('founder')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all text-sm border-2 ${
                      viewMode === 'founder'
                        ? 'bg-blue-50 text-blue-700 border-blue-300'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50 border-gray-300'
                    }`}
                  >
                    Founder
                  </button>
                  {isVC && (
                    <button
                      onClick={() => setViewMode('vc')}
                      className={`px-4 py-2 rounded-lg font-medium transition-all text-sm border-2 ${
                        viewMode === 'vc'
                          ? 'bg-blue-50 text-blue-700 border-blue-300'
                          : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50 border-gray-300'
                      }`}
                    >
                      VC Dashboard
                    </button>
                  )}
                  <button
                    onClick={() => setViewMode('voting')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all text-sm border-2 ${
                      viewMode === 'voting'
                        ? 'bg-blue-50 text-blue-700 border-blue-300'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50 border-gray-300'
                    }`}
                  >
                    Vote
                  </button>
                  {!isVC && (
                    <button
                      onClick={() => setViewMode('vc')}
                      className={`px-4 py-2 rounded-lg font-medium transition-all text-sm border-2 ${
                        viewMode === 'vc'
                          ? 'bg-blue-50 text-blue-700 border-blue-300'
                          : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50 border-gray-300'
                      }`}
                    >
                      Become VC
                    </button>
                  )}
                  <button
                    onClick={() => setViewMode('about')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all text-sm border-2 ${
                      viewMode === 'about'
                        ? 'bg-blue-50 text-blue-700 border-blue-300'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50 border-gray-300'
                    }`}
                  >
                    About
                  </button>
                  {isAdmin && adminAddress === wallet.publicKey && (
                    <button
                      onClick={() => setViewMode('admin')}
                      className={`px-4 py-2 rounded-lg font-medium transition-all text-sm border-2 ${
                        viewMode === 'admin'
                          ? 'bg-amber-50 text-amber-700 border-amber-300'
                          : 'text-gray-600 hover:text-amber-600 hover:bg-gray-50 border-gray-300'
                      }`}
                    >
                      Admin
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              {wallet.isConnected && wallet.publicKey ? (
                <>
                  <div className="flex items-center space-x-3 bg-gray-50 border-2 border-gray-300 rounded-lg px-4 py-2">
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider">Connected</div>
                      <div className="text-sm font-mono font-semibold text-gray-900">
                        {wallet.publicKey?.slice(0, 6)}...{wallet.publicKey?.slice(-6)}
                      </div>
                    </div>
                  </div>
                  {isAdmin && adminAddress === wallet.publicKey && (
                    <span className="bg-amber-100 text-amber-800 text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wider border-2 border-amber-300">
                      Admin
                    </span>
                  )}
                  {isVC && !isAdmin && (
                    <span className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wider border-2 border-blue-300">
                      VC
                    </span>
                  )}
                  <button
                    onClick={disconnectWallet}
                    className="btn btn-primary px-6 py-2 text-sm"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={connectWallet}
                  className="btn btn-primary px-6 py-2 text-sm"
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!wallet.isConnected || !wallet.publicKey ? (
          <div className="text-center py-20">
            <div className="mb-12">
              <h2 className="text-5xl font-bold text-gray-900 mb-4">
                Welcome to DeCo
              </h2>
              <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
                The decentralized accelerator platform powered by Stellar blockchain. 
                Connect your wallet to apply for funding, manage investments, or oversee the accelerator.
              </p>
            </div>
            
            <div className="flex gap-4 justify-center mb-8">
              <button
                onClick={connectWallet}
                className="btn btn-primary px-8 py-3 text-lg font-semibold"
              >
                Connect Freighter Wallet
              </button>
              <button
                onClick={() => setViewMode('about')}
                className="btn btn-primary px-8 py-3 text-lg font-semibold bg-gray-600 hover:bg-gray-700"
              >
                Learn More
              </button>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20 max-w-5xl mx-auto">
              <div className="card">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">For Founders</h3>
                <p className="text-gray-600">
                  Apply for funding and receive milestone-based investments directly to your wallet
                </p>
              </div>
              <div className="card">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">For VCs</h3>
                <p className="text-gray-600">
                  Stake tokens to verify, then invest directly in approved startups
                </p>
              </div>
              <div className="card">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">For Community</h3>
                <p className="text-gray-600">
                  Vote on startup applications and help shape the future of DeCo
                </p>
              </div>
            </div>

            {/* Blockchain Badge */}
            <div className="mt-16 inline-flex items-center space-x-3 bg-white border-2 border-gray-300 rounded-lg px-6 py-3">
              <div className="text-left">
                <div className="text-xs text-gray-500 uppercase tracking-wider">Powered by</div>
                <div className="text-sm font-semibold text-blue-600">Stellar Blockchain</div>
              </div>
            </div>
          </div>
        ) : (
          renderView()
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t-2 border-gray-300 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center">
            <div className="text-gray-500 text-sm">
              © 2024 DeCo - Decentralized Combinator. Built on Stellar Testnet.
            </div>
            <div className="flex items-center space-x-6">
              <a href="https://stellar.org" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-600 text-sm transition-colors">
                Stellar Network
              </a>
              <a href="https://soroban.stellar.org" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-600 text-sm transition-colors">
                Soroban Docs
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
