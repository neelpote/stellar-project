import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Wallet, Shield, Users, Zap, Globe, Menu, X } from 'lucide-react';
import { useWallet } from './hooks/useWallet';
import { useAdmin } from './hooks/useAdmin';
import { useQuery } from '@tanstack/react-query';
import { FounderView } from './components/FounderView';
import { AdminView } from './components/AdminView';
import { VCView } from './components/VCView';
import { PublicVotingView } from './components/PublicVotingView';
import { AboutView } from './components/AboutView';
import { PublicStartupDirectory } from './components/PublicStartupDirectory';
import * as StellarSdk from '@stellar/stellar-sdk';
import { CONTRACT_ID, NETWORK_PASSPHRASE } from './config';
import { server, getAccount } from './stellar';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, refetchOnWindowFocus: false } },
});

type ViewMode = 'founder' | 'vc' | 'voting' | 'admin' | 'about';

function AppContent() {
  const { wallet, connectWallet, disconnectWallet } = useWallet();
  const { data: adminAddress, isLoading: adminLoading } = useAdmin();
  const [viewMode, setViewMode] = useState<ViewMode>('founder');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        const sourceAccount = await getAccount(wallet.publicKey);
        const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
          fee: '100', networkPassphrase: NETWORK_PASSPHRASE,
        })
          .addOperation(contract.call('is_vc', StellarSdk.Address.fromString(wallet.publicKey).toScVal()))
          .setTimeout(30).build();
        const simulated = await server.simulateTransaction(transaction);
        if (StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulated)) {
          const result = simulated.result?.retval;
          if (result) return StellarSdk.scValToNative(result);
        }
        return false;
      } catch { return false; }
    },
    enabled: !!wallet.publicKey,
    refetchInterval: 30000,
  });

  const isAdmin = wallet.publicKey && adminAddress && !adminLoading && wallet.publicKey === adminAddress;

  const renderView = () => {
    if (viewMode === 'about') return <AboutView />;
    if (!wallet.isConnected || !wallet.publicKey) return null;
    if (viewMode === 'admin' && isAdmin && adminAddress === wallet.publicKey)
      return <AdminView publicKey={wallet.publicKey} />;
    if (viewMode === 'admin' && (!isAdmin || adminAddress !== wallet.publicKey)) {
      setViewMode('founder');
      return <FounderView publicKey={wallet.publicKey} />;
    }
    switch (viewMode) {
      case 'vc': return <VCView publicKey={wallet.publicKey} />;
      case 'voting': return <PublicVotingView publicKey={wallet.publicKey} />;
      default: return <FounderView publicKey={wallet.publicKey} />;
    }
  };

  const navLinks = [
    { label: 'Founders', view: 'founder' as ViewMode },
    { label: 'Vote', view: 'voting' as ViewMode },
    { label: isVC ? 'VC Dashboard' : 'Become VC', view: 'vc' as ViewMode },
    { label: 'About', view: 'about' as ViewMode },
  ];

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-black/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setViewMode('founder'); }}>
            <div className="w-8 h-8 bg-black flex items-center justify-center">
              <span className="text-white font-bold text-xl">D</span>
            </div>
            <div>
              <span className="font-bold tracking-tighter text-2xl">DeCo</span>
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 leading-none">Decentralized Combinator</div>
            </div>
          </div>

          {/* Desktop Nav */}
          {wallet.isConnected && (
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map(link => (
                <button
                  key={link.view}
                  onClick={() => setViewMode(link.view)}
                  className={`px-4 py-2 text-[11px] font-bold uppercase tracking-widest transition-all ${
                    viewMode === link.view
                      ? 'bg-black text-white'
                      : 'text-zinc-500 hover:text-black'
                  }`}
                >
                  {link.label}
                </button>
              ))}
              {isAdmin && (
                <button
                  onClick={() => setViewMode('admin')}
                  className={`px-4 py-2 text-[11px] font-bold uppercase tracking-widest transition-all ${
                    viewMode === 'admin' ? 'bg-black text-white' : 'text-zinc-500 hover:text-black'
                  }`}
                >
                  Admin
                </button>
              )}
            </div>
          )}

          {/* Wallet */}
          <div className="flex items-center gap-3">
            {wallet.isConnected && wallet.publicKey ? (
              <>
                <div className="hidden sm:flex items-center gap-2 px-3 py-2 border border-black/10 bg-zinc-50">
                  {isAdmin ? (
                    <span className="text-[9px] font-bold uppercase tracking-widest bg-black text-white px-2 py-0.5">Admin</span>
                  ) : isVC ? (
                    <span className="text-[9px] font-bold uppercase tracking-widest bg-zinc-800 text-white px-2 py-0.5">VC</span>
                  ) : null}
                  <span className="text-xs font-mono font-bold">
                    {wallet.publicKey.slice(0, 6)}...{wallet.publicKey.slice(-6)}
                  </span>
                </div>
                <button onClick={disconnectWallet} className="btn btn-outline text-[11px] px-4 py-2">
                  Disconnect
                </button>
              </>
            ) : (
              <button onClick={connectWallet} className="btn btn-primary flex items-center gap-2 px-6 py-3">
                <Wallet size={14} />
                Connect
              </button>
            )}
            {/* Mobile menu toggle */}
            {wallet.isConnected && (
              <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && wallet.isConnected && (
          <div className="md:hidden border-t border-black/10 bg-white">
            {navLinks.map(link => (
              <button
                key={link.view}
                onClick={() => { setViewMode(link.view); setMobileMenuOpen(false); }}
                className={`w-full text-left px-6 py-4 text-[11px] font-bold uppercase tracking-widest border-b border-black/5 ${
                  viewMode === link.view ? 'bg-black text-white' : 'text-zinc-600'
                }`}
              >
                {link.label}
              </button>
            ))}
            {isAdmin && (
              <button
                onClick={() => { setViewMode('admin'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-6 py-4 text-[11px] font-bold uppercase tracking-widest ${
                  viewMode === 'admin' ? 'bg-black text-white' : 'text-zinc-600'
                }`}
              >
                Admin
              </button>
            )}
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="pt-20">
        {!wallet.isConnected || !wallet.publicKey ? (
          viewMode === 'about' ? (
            <div className="max-w-7xl mx-auto px-6 py-20"><AboutView /></div>
          ) : (
            <>
              {/* Hero Section */}
              <section className="pt-20 pb-20">
                <div className="max-w-7xl mx-auto px-6">
                  <div className="grid lg:grid-cols-2 gap-16 items-center">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    >
                      <div className="inline-flex items-center gap-2 px-3 py-1 border border-black/10 text-[10px] font-bold uppercase tracking-[0.2em] mb-8">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-black"></span>
                        </span>
                        Stellar Soroban Network
                      </div>

                      <h1 className="text-7xl md:text-8xl font-bold tracking-tighter leading-[0.9] mb-8">
                        THE FUTURE <br />
                        <span className="italic font-serif font-light">OF FUNDING</span>
                      </h1>

                      <p className="text-xl text-zinc-600 max-w-lg leading-relaxed mb-10">
                        DeCo is a fully decentralized accelerator platform. Apply for funding,
                        vote on projects, and invest directly through DAO governance on Stellar.
                      </p>

                      <div className="flex flex-col sm:flex-row gap-4">
                        <button
                          onClick={connectWallet}
                          className="group btn btn-primary px-8 py-4 text-sm flex items-center justify-center gap-3"
                        >
                          Connect & Apply
                          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button
                          onClick={() => setViewMode('about')}
                          className="btn btn-outline px-8 py-4 text-sm"
                        >
                          Explore DAO
                        </button>
                      </div>

                      <div className="mt-16 grid grid-cols-3 gap-8 border-t border-black/5 pt-8">
                        <div>
                          <div className="text-2xl font-bold tracking-tighter">1000+ XLM</div>
                          <div className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mt-1">VC Stake</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold tracking-tighter">7 DAYS</div>
                          <div className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mt-1">Voting Period</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold tracking-tighter">IPFS</div>
                          <div className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mt-1">Storage</div>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 1, delay: 0.2 }}
                      className="relative aspect-square lg:aspect-auto lg:h-[600px] bg-zinc-50 border border-black/5 flex items-center justify-center overflow-hidden"
                    >
                      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, black 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

                      <div className="relative z-10 w-full max-w-md p-8 bg-white border border-black shadow-[20px_20px_0px_0px_rgba(0,0,0,1)]">
                        <div className="flex justify-between items-start mb-12">
                          <div className="space-y-1">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Active Proposal</div>
                            <div className="text-xl font-bold tracking-tight">Stellar Nexus Protocol</div>
                          </div>
                          <div className="px-2 py-1 bg-black text-white text-[10px] font-bold">DAO-042</div>
                        </div>

                        <div className="space-y-6">
                          <div className="h-2 w-full bg-zinc-100 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: '75%' }}
                              transition={{ duration: 1.5, delay: 0.5 }}
                              className="h-full bg-black"
                            />
                          </div>
                          <div className="flex justify-between text-sm font-bold">
                            <span>75% YES</span>
                            <span className="text-zinc-400">25% NO</span>
                          </div>
                        </div>

                        <div className="mt-12 grid grid-cols-2 gap-4">
                          <div className="p-4 bg-zinc-50 border border-black/5">
                            <Users size={20} className="mb-3" />
                            <div className="text-xs font-bold uppercase tracking-wider">Community</div>
                            <div className="text-lg font-bold tracking-tight">1.2k Votes</div>
                          </div>
                          <div className="p-4 bg-zinc-50 border border-black/5">
                            <Shield size={20} className="mb-3" />
                            <div className="text-xs font-bold uppercase tracking-wider">Security</div>
                            <div className="text-lg font-bold tracking-tight">Verified</div>
                          </div>
                        </div>
                      </div>

                      <div className="absolute top-10 right-10 w-24 h-24 border border-black/10 rounded-full animate-pulse"></div>
                      <div className="absolute bottom-10 left-10 w-32 h-32 border border-black/5 rotate-45"></div>
                    </motion.div>
                  </div>
                </div>
              </section>

              {/* Public Startup Directory */}
              <section className="py-20 border-t border-black/5">
                <div className="max-w-7xl mx-auto px-6">
                  <div className="mb-12">
                    <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 mb-3">Live on Stellar Testnet</div>
                    <h2 className="text-4xl font-bold tracking-tighter">Startup Directory</h2>
                    <p className="text-zinc-500 mt-3 max-w-xl">Browse all applications and community votes. Connect your wallet to participate in governance.</p>
                  </div>
                  <PublicStartupDirectory onConnectWallet={connectWallet} />
                </div>
              </section>

              {/* Features */}
              <section className="bg-black text-white py-24">
                <div className="max-w-7xl mx-auto px-6">
                  <div className="grid md:grid-cols-3 gap-12">
                    {[
                      { icon: <Zap size={24} />, title: 'Smart Accelerator', desc: 'Automated milestone-based funding release through Soroban smart contracts. No middleman, just code.' },
                      { icon: <Globe size={24} />, title: 'IPFS Integration', desc: 'Metadata stored permanently on IPFS for 95% storage reduction while maintaining full decentralization.' },
                      { icon: <Shield size={24} />, title: 'DAO Governance', desc: '7-day public voting periods ensure community-driven project selection and sybil-resistant approvals.' },
                    ].map((f, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="space-y-4"
                      >
                        <div className="w-12 h-12 border border-white/20 flex items-center justify-center">{f.icon}</div>
                        <h3 className="text-xl font-bold tracking-tight uppercase">{f.title}</h3>
                        <p className="text-zinc-400 text-sm leading-relaxed">{f.desc}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </section>
            </>
          )
        ) : (
          <div className="max-w-7xl mx-auto px-6 py-12">
            {renderView()}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-black/5">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-black flex items-center justify-center">
              <span className="text-white font-bold text-xs">D</span>
            </div>
            <span className="font-bold tracking-tighter">DeCo</span>
          </div>
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">
            Built on Stellar Soroban • 2026
          </div>
          <div className="flex gap-8 text-[10px] font-bold uppercase tracking-widest">
            <a href="https://github.com/neelpote/deco-stellar-accelerator" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">GitHub</a>
            <a href="https://stellar.org" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">Stellar</a>
            <a href="https://soroban.stellar.org" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">Soroban</a>
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
