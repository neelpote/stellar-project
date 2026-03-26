import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Wallet, Menu, X } from 'lucide-react';
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
import { server, getAccount, getAllVCs, getAllStartups } from './stellar';
import { useUnreadCounts } from './hooks/useUnreadCounts';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, refetchOnWindowFocus: false } },
});

type ViewMode = 'founder' | 'vc' | 'voting' | 'admin' | 'about';

function AppContent() {
  const { wallet, connectWallet, disconnectWallet } = useWallet();
  const { data: adminAddress, isLoading: adminLoading } = useAdmin();
  const [viewMode, setViewMode] = useState<ViewMode>('founder');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch all addresses to track unread messages across all chats
  const { data: allVCs = [] } = useQuery({ queryKey: ['allVCs'], queryFn: getAllVCs, enabled: !!wallet.publicKey });
  const { data: allStartups = [] } = useQuery({ queryKey: ['allStartups'], queryFn: getAllStartups, enabled: !!wallet.publicKey });

  // For a founder: unread = messages from VCs. For a VC: unread = messages from founders.
  const chatPeers = wallet.publicKey
    ? [...new Set([...allVCs, ...allStartups].filter(a => a !== wallet.publicKey))]
    : [];
  const { totalUnread } = useUnreadCounts(wallet.publicKey || '', chatPeers);

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
        if (StellarSdk.rpc.Api.isSimulationSuccess(simulated)) {
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

  // ── Role-based nav ────────────────────────────────────────────────────────
  // Build nav links based on who is connected
  const navLinks = (() => {
    if (!wallet.isConnected) return [{ label: 'About', view: 'about' as ViewMode }];

    const links: { label: string; view: ViewMode; unreadDot?: boolean }[] = [];

    if (isVC) {
      links.push({ label: 'VC Dashboard', view: 'vc', unreadDot: totalUnread > 0 });
    } else {
      links.push({ label: 'My Application', view: 'founder', unreadDot: totalUnread > 0 });
    }

    links.push({ label: 'Vote', view: 'voting' });

    // Non-VCs can still see the "Become VC" path
    if (!isVC) {
      links.push({ label: 'Become VC', view: 'vc' });
    }

    links.push({ label: 'About', view: 'about' });

    if (isAdmin) {
      links.push({ label: 'Admin', view: 'admin' });
    }

    return links;
  })();

  // Auto-redirect to correct home view when role is resolved
  useEffect(() => {
    if (!wallet.isConnected) return;
    if (viewMode === 'founder' && isVC) setViewMode('vc');
  }, [isVC, wallet.isConnected]);

  const renderView = () => {
    if (viewMode === 'about') return <AboutView />;
    if (!wallet.isConnected || !wallet.publicKey) {
      return (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-4">Wallet Required</div>
          <h2 className="text-3xl font-bold tracking-tighter mb-3">Connect to continue</h2>
          <p className="text-zinc-500 text-sm mb-8 max-w-sm">
            You need a Freighter wallet connected to access this section.
          </p>
          <button onClick={connectWallet} className="btn btn-primary flex items-center gap-2 px-8 py-3">
            <Wallet size={14} /> Connect Wallet
          </button>
        </div>
      );
    }
    if (viewMode === 'admin' && isAdmin && adminAddress === wallet.publicKey)
      return <AdminView publicKey={wallet.publicKey} />;
    if (viewMode === 'admin') {
      setViewMode(isVC ? 'vc' : 'founder');
      return null;
    }
    switch (viewMode) {
      case 'vc': return <VCView publicKey={wallet.publicKey} />;
      case 'voting': return <PublicVotingView publicKey={wallet.publicKey} />;
      case 'founder': return <FounderView publicKey={wallet.publicKey} />;
      default: return <FounderView publicKey={wallet.publicKey} />;
    }
  };

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

          {/* Desktop Nav — always visible, role-based links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <button
                key={link.view}
                onClick={() => setViewMode(link.view)}
                className={`relative px-4 py-2 text-[11px] font-bold uppercase tracking-widest transition-all ${
                  viewMode === link.view ? 'bg-black text-white' : 'text-zinc-500 hover:text-black'
                }`}
              >
                {link.label}
                {link.unreadDot && (
                  <span className="absolute top-1.5 right-1 w-1.5 h-1.5 bg-black rounded-full border border-white" />
                )}
              </button>
            ))}
          </div>

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
            {/* Mobile menu toggle — always show */}
            <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-black/10 bg-white">
            {navLinks.map(link => (
              <button
                key={link.view}
                onClick={() => { setViewMode(link.view); setMobileMenuOpen(false); }}
                className={`relative w-full text-left px-6 py-4 text-[11px] font-bold uppercase tracking-widest border-b border-black/5 flex items-center justify-between ${
                  viewMode === link.view ? 'bg-black text-white' : 'text-zinc-600'
                }`}
              >
                {link.label}
                {link.unreadDot && (
                  <span className="w-2 h-2 bg-black rounded-full" />
                )}
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="pt-20">
        {viewMode === 'about' ? (
          <div className="max-w-7xl mx-auto px-6 py-20"><AboutView /></div>
        ) : (!wallet.isConnected || !wallet.publicKey) ? (
            <>
              {/* Hero */}
              <section className="pt-20 pb-24 border-b border-black/5">
                <div className="max-w-7xl mx-auto px-6">
                  <div className="grid lg:grid-cols-2 gap-16 items-center">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    >
                      <div className="inline-flex items-center gap-2 px-3 py-1 border border-black/10 text-[10px] font-bold uppercase tracking-[0.2em] mb-8">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-black" />
                        </span>
                        Live on Stellar Testnet
                      </div>

                      <h1 className="text-7xl md:text-8xl font-bold tracking-tighter leading-[0.9] mb-8">
                        THE FUTURE<br />
                        <span className="italic font-serif font-light">OF FUNDING</span>
                      </h1>

                      <p className="text-xl text-zinc-600 max-w-lg leading-relaxed mb-4">
                        DeCo is a fully on-chain startup accelerator built on Stellar Soroban.
                        No platform fees, no gatekeepers, no opaque committees.
                      </p>
                      <p className="text-base text-zinc-500 max-w-lg leading-relaxed mb-10">
                        Founders apply with a single transaction. Communities vote on-chain.
                        VCs invest directly. Every rule is enforced by a Rust smart contract —
                        not a person, not a company.
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
                          How It Works
                        </button>
                      </div>

                      <div className="mt-16 grid grid-cols-3 gap-px bg-black/10">
                        {[
                          { value: '1000 XLM', label: 'VC Stake' },
                          { value: '30 Days', label: 'Voting Period' },
                          { value: '0%', label: 'Platform Fee' },
                        ].map(s => (
                          <div key={s.label} className="bg-white pr-6 py-4">
                            <div className="text-2xl font-bold tracking-tighter">{s.value}</div>
                            <div className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mt-1">{s.label}</div>
                          </div>
                        ))}
                      </div>
                    </motion.div>

                    {/* Mock proposal card */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 1, delay: 0.2 }}
                      className="relative lg:h-[600px] bg-zinc-50 border border-black/5 flex items-center justify-center overflow-hidden"
                    >
                      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, black 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
                      <div className="relative z-10 w-full max-w-md p-8 bg-white border border-black shadow-[20px_20px_0px_0px_rgba(0,0,0,1)]">
                        <div className="flex justify-between items-start mb-10">
                          <div className="space-y-1">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Active Proposal</div>
                            <div className="text-xl font-bold tracking-tight">Stellar Nexus Protocol</div>
                          </div>
                          <div className="px-2 py-1 bg-black text-white text-[10px] font-bold">DAO-042</div>
                        </div>
                        <div className="space-y-3 mb-10">
                          <div className="h-1.5 w-full bg-zinc-100">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: '75%' }}
                              transition={{ duration: 1.5, delay: 0.5 }}
                              className="h-1.5 bg-black"
                            />
                          </div>
                          <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest">
                            <span>75% Yes</span>
                            <span className="text-zinc-400">25% No</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="p-4 bg-zinc-50 border border-black/5">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Votes Cast</div>
                            <div className="text-xl font-bold tracking-tighter">1,247</div>
                          </div>
                          <div className="p-4 bg-zinc-50 border border-black/5">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Funding Goal</div>
                            <div className="text-xl font-bold tracking-tighter">50k XLM</div>
                          </div>
                          <div className="p-4 bg-zinc-50 border border-black/5">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Time Left</div>
                            <div className="text-xl font-bold tracking-tighter">3d 14h</div>
                          </div>
                          <div className="p-4 bg-zinc-50 border border-black/5">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Status</div>
                            <div className="text-xl font-bold tracking-tighter">Open</div>
                          </div>
                        </div>
                      </div>
                      <div className="absolute top-10 right-10 w-24 h-24 border border-black/10 rounded-full animate-pulse" />
                      <div className="absolute bottom-10 left-10 w-32 h-32 border border-black/5 rotate-45" />
                    </motion.div>
                  </div>
                </div>
              </section>

              {/* Problem / Solution */}
              <section className="py-24 border-b border-black/5">
                <div className="max-w-7xl mx-auto px-6">
                  <div className="grid lg:grid-cols-2 gap-16">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 mb-4">The Problem</div>
                      <h2 className="text-4xl font-bold tracking-tighter mb-6">Traditional accelerators are broken</h2>
                      <div className="space-y-4 text-zinc-600 leading-relaxed">
                        <p>A small committee decides who gets in. The process is opaque — founders never know why they were rejected, and the criteria shift based on who's in the room that day.</p>
                        <p>Geography matters more than merit. The same handful of cities produce the same kinds of companies because that's where the networks are. Everyone else is locked out.</p>
                        <p>Intermediaries take a cut at every step. Platform fees, carry, management fees — by the time money reaches a founder, a significant portion has been extracted by people who added no value to the product.</p>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 mb-4">The Solution</div>
                      <h2 className="text-4xl font-bold tracking-tighter mb-6">Replace the committee with code</h2>
                      <div className="space-y-4 text-zinc-600 leading-relaxed">
                        <p>DeCo puts every rule on-chain. Who can apply, how votes are counted, when funds are released — all enforced by a Rust smart contract on Stellar Soroban. No human can override it.</p>
                        <p>Any founder with a Stellar wallet can apply. Any wallet holder can vote. Any VC willing to stake can invest. Geography is irrelevant. Connections are irrelevant. The code doesn't care.</p>
                        <p>Zero platform fees. Funds flow directly from VC wallets to the smart contract, and from the contract to founders. The only cost is the Stellar network base fee — fractions of a cent per transaction.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* How it works */}
              <section className="py-24 border-b border-black/5">
                <div className="max-w-7xl mx-auto px-6">
                  <div className="mb-12">
                    <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 mb-3">Process</div>
                    <h2 className="text-4xl font-bold tracking-tighter">Four steps, fully on-chain</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-black/10">
                    {[
                      {
                        n: '01', title: 'Apply',
                        body: 'Founders submit project details, team info, and a funding goal. Metadata is pinned to IPFS — only a 46-character hash is stored on-chain. A 30-day community voting window opens immediately.',
                      },
                      {
                        n: '02', title: 'Community Votes',
                        body: 'Any Stellar wallet can vote Yes or No. One vote per wallet, enforced by the contract. Votes are public, immutable, and tallied in real time. No backend, no database — pure on-chain state.',
                      },
                      {
                        n: '03', title: 'VCs Invest',
                        body: 'Verified VCs stake 1000 XLM to join the network — no whitelist, no admin approval. They can then invest any amount into any listed startup. Funds are held in the contract.',
                      },
                      {
                        n: '04', title: 'Founders Claim',
                        body: 'Invested funds accumulate in the contract and are claimable at any time. One transaction pulls the full balance to the founder\'s wallet. No delay, no approval, no fee.',
                      },
                    ].map(s => (
                      <div key={s.n} className="bg-white p-10 flex gap-6">
                        <div className="text-[11px] font-bold tracking-widest text-zinc-200 shrink-0 w-8 pt-0.5">{s.n}</div>
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-widest mb-3">{s.title}</div>
                          <p className="text-sm text-zinc-600 leading-relaxed">{s.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Startup Directory */}
              <section className="py-24 border-b border-black/5">
                <div className="max-w-7xl mx-auto px-6">
                  <div className="mb-10">
                    <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 mb-3">Live Data</div>
                    <h2 className="text-4xl font-bold tracking-tighter mb-2">Startup Directory</h2>
                    <p className="text-zinc-500 max-w-xl">Every application is public. Browse projects, read descriptions, and see community votes — all pulled directly from the Stellar blockchain and IPFS.</p>
                  </div>
                  <PublicStartupDirectory onConnectWallet={connectWallet} />
                </div>
              </section>

              {/* Principles */}
              <section className="py-24 bg-black text-white">
                <div className="max-w-7xl mx-auto px-6">
                  <div className="mb-12">
                    <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500 mb-3">Principles</div>
                    <h2 className="text-4xl font-bold tracking-tighter">Built on three ideas</h2>
                  </div>
                  <div className="grid md:grid-cols-3 gap-px bg-white/10">
                    {[
                      {
                        title: 'Transparency by default',
                        body: 'Every vote, every investment, every approval is a blockchain transaction. Anyone can verify the full history of any startup or VC at any time. There are no private channels, no off-chain decisions.',
                      },
                      {
                        title: 'Code over committees',
                        body: 'The smart contract is the only authority. It cannot be bribed, lobbied, or pressured. It applies the same rules to every participant regardless of who they are or where they\'re from.',
                      },
                      {
                        title: 'Direct value flow',
                        body: 'Money moves from VC wallets to the contract to founder wallets. No platform extracts a percentage. The only friction is the Stellar base fee — a fraction of a cent per operation.',
                      },
                    ].map(f => (
                      <div key={f.title} className="bg-black p-10 space-y-4">
                        <div className="text-[11px] font-bold uppercase tracking-widest">{f.title}</div>
                        <p className="text-sm text-zinc-400 leading-relaxed">{f.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </>
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
