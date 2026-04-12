import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as StellarSdk from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';
import { CONTRACT_ID, NETWORK_PASSPHRASE, TESTNET_XLM_CONTRACT, HORIZON_URL } from '../config';
import { server, getStartupStatus, getVCStakeRequired, getVCData, getAllStartups, getAccount, getVCInvestment, hasVotedMilestone, submitWithFeeBump } from '../stellar';
import { useIPFSMetadata } from '../hooks/useIPFSMetadata';
import { ChatBox } from './ChatBox';
import { useUnreadCounts, requestNotificationPermission } from '../hooks/useUnreadCounts';
import { trackEvent } from '../supabase';

const horizonServer = new StellarSdk.Horizon.Server(HORIZON_URL);

// Filters out startups with no IPFS name in the browse list
const BrowseStartupButton = ({ address, onClick }: { address: string; onClick: () => void }) => {
  const { data: startup } = useQuery({ queryKey: ['startupCard', address], queryFn: () => getStartupStatus(address), staleTime: 30000 });
  const { data: meta } = useIPFSMetadata(startup?.ipfs_cid);
  if (meta !== undefined && !meta?.project_name) return null;
  return (
    <button onClick={onClick} className="text-left p-4 border border-black/10 hover:border-black transition-all">
      <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Startup</div>
      <div className="text-sm font-bold truncate mb-1">{meta?.project_name || <span className="text-zinc-300">Loading...</span>}</div>
      <div className="text-xs font-mono text-zinc-400 truncate mb-2">{address}</div>
      <div className="text-[11px] font-bold uppercase tracking-widest">View Details →</div>
    </button>
  );
};

interface VCViewProps {
  publicKey: string;
}

export const VCView = ({ publicKey }: VCViewProps) => {
  const [searchAddress, setSearchAddress] = useState('');
  const [viewingAddress, setViewingAddress] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [investAmount, setInvestAmount] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const queryClient = useQueryClient();

  // Unread notifications — track all startups the VC is viewing
  const { getUnread, clearUnread } = useUnreadCounts(
    publicKey,
    viewingAddress ? [viewingAddress] : []
  );

  useEffect(() => { requestNotificationPermission(); }, []);

  const { data: stakeRequired = '0' } = useQuery({ queryKey: ['vcStakeRequired'], queryFn: getVCStakeRequired });

  const { data: vcData, isLoading: vcLoading } = useQuery({
    queryKey: ['vcData', publicKey],
    queryFn: () => getVCData(publicKey),
    refetchInterval: 10000,
  });

  const { data: xlmBalance } = useQuery({
    queryKey: ['xlmBalance', publicKey],
    queryFn: async () => {
      try {
        const account = await horizonServer.loadAccount(publicKey);
        const balance = account.balances.find(b => b.asset_type === 'native');
        return balance && 'balance' in balance ? parseFloat(balance.balance) : 0;
      } catch { return 0; }
    },
    refetchInterval: 10000,
  });

  const { data: allStartups = [] } = useQuery({ queryKey: ['allStartups'], queryFn: getAllStartups, refetchInterval: 30000 });

  const { data: startupData } = useQuery({
    queryKey: ['vcViewStartup', viewingAddress],
    queryFn: () => viewingAddress ? getStartupStatus(viewingAddress) : null,
    enabled: !!viewingAddress,
  });

  const { data: startupMetadata } = useIPFSMetadata(startupData?.ipfs_cid);

  // How much this VC invested in the viewed startup
  const { data: myInvestment = '0' } = useQuery({
    queryKey: ['vcInvestment', publicKey, viewingAddress],
    queryFn: () => viewingAddress ? getVCInvestment(publicKey, viewingAddress) : '0',
    enabled: !!viewingAddress && !!startupData?.milestone_enabled,
  });

  // Has this VC already voted on the current milestone?
  const currentMilestone = Number(startupData?.current_milestone || 0);
  const { data: alreadyVotedMilestone = false } = useQuery({
    queryKey: ['hasVotedMilestone', publicKey, viewingAddress, currentMilestone],
    queryFn: () => viewingAddress ? hasVotedMilestone(publicKey, viewingAddress, currentMilestone) : false,
    enabled: !!viewingAddress && !!startupData?.milestone_enabled && Number(myInvestment) > 0,
  });

  // ── Mutations ────────────────────────────────────────────────────────────────

  const stakeMutation = useMutation({
    mutationFn: async (name: string) => {
      const sourceAccount = await getAccount(publicKey);
      const contract = new StellarSdk.Contract(CONTRACT_ID);
      const xlmAddress = new StellarSdk.Address(TESTNET_XLM_CONTRACT);
      const account = await horizonServer.loadAccount(publicKey);
      const bal = account.balances.find(b => b.asset_type === 'native');
      if (!bal || !('balance' in bal)) throw new Error('XLM balance not found.');
      const requiredAmount = Number(stakeRequired) / 1e7;
      if (parseFloat(bal.balance) < requiredAmount) throw new Error(`Insufficient XLM. Need ${requiredAmount} XLM`);
      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, { fee: StellarSdk.BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
        .addOperation(contract.call('stake_to_become_vc', StellarSdk.Address.fromString(publicKey).toScVal(), StellarSdk.nativeToScVal(name, { type: 'string' }), xlmAddress.toScVal()))
        .setTimeout(30).build();
      const prepared = await server.prepareTransaction(transaction);
      const signedXdr = await signTransaction(prepared.toXDR(), { networkPassphrase: NETWORK_PASSPHRASE });
      const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
      const { hash: stakeHash } = await submitWithFeeBump(signedTx);
      let status = await server.getTransaction(stakeHash);
      let i = 0;
      while (status.status === 'NOT_FOUND' && i++ < 20) { await new Promise(r => setTimeout(r, 1000)); status = await server.getTransaction(stakeHash); }
      if (status.status !== 'SUCCESS') throw new Error('Transaction failed');
      return status;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vcData'] }); setCompanyName(''); trackEvent(publicKey, 'stake_vc'); alert('Successfully staked! You are now a verified VC.'); },
    onError: (e) => alert(`Failed to stake: ${e instanceof Error ? e.message : 'Unknown error'}`),
  });

  const investMutation = useMutation({
    mutationFn: async ({ founder, amount }: { founder: string; amount: string }) => {
      const sourceAccount = await getAccount(publicKey);
      const contract = new StellarSdk.Contract(CONTRACT_ID);
      const amountInStroops = Math.floor(parseFloat(amount) * 1e7);
      const xlmAddress = new StellarSdk.Address(TESTNET_XLM_CONTRACT);
      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, { fee: StellarSdk.BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
        .addOperation(contract.call('vc_invest', StellarSdk.Address.fromString(publicKey).toScVal(), StellarSdk.Address.fromString(founder).toScVal(), StellarSdk.nativeToScVal(BigInt(amountInStroops), { type: 'i128' }), xlmAddress.toScVal()))
        .setTimeout(30).build();
      const prepared = await server.prepareTransaction(transaction);
      const signedXdr = await signTransaction(prepared.toXDR(), { networkPassphrase: NETWORK_PASSPHRASE });
      const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
      const { hash: investHash } = await submitWithFeeBump(signedTx);
      let status = await server.getTransaction(investHash);
      let i = 0;
      while (status.status === 'NOT_FOUND' && i++ < 20) { await new Promise(r => setTimeout(r, 1000)); status = await server.getTransaction(investHash); }
      if (status.status !== 'SUCCESS') throw new Error('Transaction failed');
      return status;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcViewStartup'] });
      queryClient.invalidateQueries({ queryKey: ['vcData'] });
      queryClient.invalidateQueries({ queryKey: ['vcInvestment'] });
      setInvestAmount('');
      trackEvent(publicKey, 'invest', { founder: viewingAddress, amount: investAmount });
      alert('Investment successful!');
    },
    onError: () => alert('Failed to invest. Please try again.'),
  });

  const voteMilestoneMutation = useMutation({
    mutationFn: async ({ founder, approve }: { founder: string; approve: boolean }) => {
      const sourceAccount = await getAccount(publicKey);
      const contract = new StellarSdk.Contract(CONTRACT_ID);
      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, { fee: StellarSdk.BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
        .addOperation(contract.call(
          'vote_milestone',
          StellarSdk.Address.fromString(publicKey).toScVal(),
          StellarSdk.Address.fromString(founder).toScVal(),
          StellarSdk.nativeToScVal(approve, { type: 'bool' }),
        ))
        .setTimeout(30).build();
      const prepared = await server.prepareTransaction(transaction);
      const signedXdr = await signTransaction(prepared.toXDR(), { networkPassphrase: NETWORK_PASSPHRASE });
      const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
      const { hash: voteHash } = await submitWithFeeBump(signedTx);
      let status = await server.getTransaction(voteHash);
      let i = 0;
      while (status.status === 'NOT_FOUND' && i++ < 20) { await new Promise(r => setTimeout(r, 1000)); status = await server.getTransaction(voteHash); }
      if (status.status !== 'SUCCESS') throw new Error('Transaction failed');
      return status;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['hasVotedMilestone'] });
      queryClient.invalidateQueries({ queryKey: ['vcViewStartup', vars.founder] });
      alert(`Vote recorded: ${vars.approve ? 'Approved' : 'Rejected'} milestone #${currentMilestone + 1}`);
    },
    onError: (e) => alert(`Vote failed: ${e instanceof Error ? e.message : 'Unknown error'}`),
  });

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleStake = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) { alert('Please enter your company name'); return; }
    stakeMutation.mutate(companyName);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchAddress.trim()) setViewingAddress(searchAddress.trim());
  };

  const handleInvest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingAddress || !investAmount.trim()) { alert('Please enter investment amount'); return; }
    investMutation.mutate({ founder: viewingAddress, amount: investAmount });
  };

  // ── Loading ───────────────────────────────────────────────────────────────────

  if (vcLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-500 text-sm uppercase tracking-widest font-bold">Loading VC status...</p>
        </div>
      </div>
    );
  }

  // ── Not a VC yet ──────────────────────────────────────────────────────────────

  if (!vcData) {
    const stakeXLM = (Number(stakeRequired) / 1e7).toFixed(2);
    const hasEnough = (xlmBalance || 0) >= Number(stakeRequired) / 1e7;
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 mb-2">Venture Capital</div>
          <h2 className="text-4xl font-bold tracking-tighter mb-2">Become a VC</h2>
          <p className="text-zinc-500">Stake XLM to become a verified investor and fund startups on DeCo.</p>
        </div>
        <div className="grid grid-cols-3 gap-px bg-black/10">
          {[
            { n: '01', title: 'Stake once', body: 'Lock 1000 XLM into the contract. No admin approval — the stake is your credential.' },
            { n: '02', title: 'Browse startups', body: 'Search any founder address or browse the full list. View project details and community votes.' },
            { n: '03', title: 'Invest & vote', body: 'Send XLM to a startup. For milestone-enabled startups, vote to release each funding tranche.' },
          ].map(s => (
            <div key={s.n} className="bg-white p-5">
              <div className="text-[10px] font-bold tracking-widest text-zinc-300 mb-2">{s.n}</div>
              <div className="text-[11px] font-bold uppercase tracking-widest mb-1">{s.title}</div>
              <p className="text-xs text-zinc-500 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Required Stake</div>
              <div className="text-3xl font-bold tracking-tighter">{stakeXLM} XLM</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Your Balance</div>
              <div className={`text-3xl font-bold tracking-tighter ${hasEnough ? 'text-black' : 'text-red-600'}`}>
                {(xlmBalance || 0).toFixed(2)} XLM
              </div>
            </div>
          </div>
          <form onSubmit={handleStake} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest mb-2">Company / Fund Name</label>
              <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="form-input" placeholder="Your VC firm or investment company name" />
            </div>
            <button type="submit" disabled={stakeMutation.isPending || !hasEnough} className="btn btn-primary w-full py-3">
              {stakeMutation.isPending ? 'Processing...' : !hasEnough ? `Insufficient Balance (need ${stakeXLM} XLM)` : `Stake ${stakeXLM} XLM to Become VC`}
            </button>
          </form>
          {!hasEnough && (
            <div className="mt-4 p-4 border border-black/10 bg-zinc-50 text-sm text-zinc-600">
              Get testnet XLM at <a href="https://friendbot.stellar.org" target="_blank" rel="noopener noreferrer" className="underline font-medium">friendbot.stellar.org</a>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── VC Dashboard ──────────────────────────────────────────────────────────────

  const isMilestoneStartup = startupData?.milestone_enabled;
  const totalMilestonesCount = Number(startupData?.total_milestones || 1);
  const allMilestonesReleased = currentMilestone >= totalMilestonesCount;
  const hasInvested = Number(myInvestment) > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 mb-2">VC Dashboard</div>
        <h2 className="text-4xl font-bold tracking-tighter mb-1">{vcData.company_name}</h2>
        <p className="text-zinc-500">Browse startups, invest, and vote on milestone releases. All activity is on-chain and transparent.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Your Stake</div>
          <div className="text-3xl font-bold tracking-tighter">{(Number(vcData.stake_amount) / 1e7).toFixed(2)} <span className="text-lg text-zinc-400">XLM</span></div>
          <span className="badge badge-primary mt-2">Staked</span>
        </div>
        <div className="card">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Total Invested</div>
          <div className="text-3xl font-bold tracking-tighter">{(Number(vcData.total_invested) / 1e7).toFixed(2)} <span className="text-lg text-zinc-400">XLM</span></div>
          <span className="badge badge-success mt-2">Deployed</span>
        </div>
      </div>

      {allStartups.length > 0 && !viewingAddress && (
        <div className="card">
          <div className="text-[11px] font-bold uppercase tracking-widest mb-4">Browse Startups</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {allStartups.slice(0, 6).map((address: string) => (
              <BrowseStartupButton key={address} address={address} onClick={() => setViewingAddress(address)} />
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="text-[11px] font-bold uppercase tracking-widest mb-4">Search by Address</div>
        <form onSubmit={handleSearch} className="flex gap-3">
          <input type="text" value={searchAddress} onChange={(e) => setSearchAddress(e.target.value)} className="form-input flex-1 font-mono text-sm" placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" />
          <button type="submit" className="btn btn-primary px-6">Search</button>
        </form>
      </div>

      {viewingAddress && startupData && startupData.exists && (
        <div className="space-y-4">
          {/* Startup info */}
          <div className="card">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Startup</div>
                <h3 className="text-2xl font-bold tracking-tight">{startupMetadata?.project_name || 'Loading...'}</h3>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                <span className="badge badge-success">Active</span>
                {isMilestoneStartup && <span className="badge badge-primary">Milestone Vesting</span>}
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Description</div>
                <p className="text-zinc-700">{startupMetadata?.description || '—'}</p>
              </div>
              {startupMetadata?.project_url && (
                <div className="pt-3 border-t border-black/5">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Project URL</div>
                  <a href={startupMetadata.project_url} target="_blank" rel="noopener noreferrer" className="underline font-medium">{startupMetadata.project_url} →</a>
                </div>
              )}
              <div className="pt-3 border-t border-black/5 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Funding Goal</div>
                  <div className="text-xl font-bold">{(Number(startupData.funding_goal) / 1e7).toFixed(2)} XLM</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Total Funded</div>
                  <div className="text-xl font-bold">{(Number(startupData.total_allocated) / 1e7).toFixed(2)} XLM</div>
                </div>
              </div>
              {isMilestoneStartup && (
                <div className="pt-3 border-t border-black/5">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Milestone Progress</div>
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
                    <span>{currentMilestone} / {totalMilestonesCount} released</span>
                    <span>{(Number(startupData.escrowed_funds) / 1e7).toFixed(2)} XLM in escrow</span>
                  </div>
                  <div className="h-1 w-full bg-zinc-100">
                    <div className="h-1 bg-black transition-all" style={{ width: `${totalMilestonesCount > 0 ? (currentMilestone / totalMilestonesCount) * 100 : 0}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Invest */}
          <div className="card">
            <div className="text-[11px] font-bold uppercase tracking-widest mb-2">Invest in this Startup</div>
            {isMilestoneStartup && (
              <p className="text-xs text-zinc-500 mb-4">This startup uses milestone vesting. Your funds will be held in escrow and released in {totalMilestonesCount} tranches as you and other investors vote to approve each milestone.</p>
            )}
            <form onSubmit={handleInvest} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest mb-2">Amount (XLM)</label>
                <input type="number" step="0.01" value={investAmount} onChange={(e) => setInvestAmount(e.target.value)} className="form-input" placeholder="1000.00" />
              </div>
              <button type="submit" disabled={investMutation.isPending} className="btn btn-primary w-full py-3">
                {investMutation.isPending ? 'Processing...' : isMilestoneStartup ? 'Invest (Escrowed)' : 'Invest Now'}
              </button>
            </form>
          </div>

          {/* Message founder */}
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] font-bold uppercase tracking-widest">Direct Message</div>
              {viewingAddress && getUnread(viewingAddress) > 0 && (
                <span className="bg-black text-white text-[10px] font-bold px-2 py-0.5">
                  {getUnread(viewingAddress)} new
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mb-4">Have a question for the founder? Send them a message directly.</p>
            <button
              onClick={() => setChatOpen(true)}
              className="btn btn-outline w-full py-3"
            >
              {viewingAddress && getUnread(viewingAddress) > 0
                ? `Message Founder (${getUnread(viewingAddress)} unread)`
                : 'Message Founder'}
            </button>
          </div>

          {/* Milestone voting — only shown if this VC invested and milestones are enabled */}
          {isMilestoneStartup && hasInvested && !allMilestonesReleased && (
            <div className="card">
              <div className="text-[11px] font-bold uppercase tracking-widest mb-2">Vote on Milestone #{currentMilestone + 1}</div>
              <div className="mb-4 text-sm text-zinc-500">
                Your investment: <span className="font-bold text-black">{(Number(myInvestment) / 1e7).toFixed(2)} XLM</span>
              </div>
              {alreadyVotedMilestone ? (
                <div className="p-4 border border-black/10 bg-zinc-50 text-sm text-zinc-600 text-center">
                  You have already voted on milestone #{currentMilestone + 1}.
                </div>
              ) : (
                <>
                  <p className="text-xs text-zinc-500 mb-4">
                    Vote to approve or reject the founder's progress on milestone #{currentMilestone + 1}. Once a majority of investors approve, the founder can release the tranche.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => viewingAddress && voteMilestoneMutation.mutate({ founder: viewingAddress, approve: true })}
                      disabled={voteMilestoneMutation.isPending}
                      className="btn btn-primary py-3"
                    >
                      {voteMilestoneMutation.isPending ? 'Voting...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => viewingAddress && voteMilestoneMutation.mutate({ founder: viewingAddress, approve: false })}
                      disabled={voteMilestoneMutation.isPending}
                      className="btn btn-outline py-3"
                    >
                      {voteMilestoneMutation.isPending ? 'Voting...' : 'Reject'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {isMilestoneStartup && hasInvested && allMilestonesReleased && (
            <div className="card text-center py-8">
              <div className="text-[11px] font-bold uppercase tracking-widest mb-2">All Milestones Complete</div>
              <p className="text-zinc-500 text-sm">All funding tranches have been released to the founder.</p>
            </div>
          )}
        </div>
      )}

      {viewingAddress && startupData && !startupData.exists && (
        <div className="card text-center py-12">
          <div className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Startup Not Found</div>
          <p className="text-zinc-500 text-sm">No application found for this address.</p>
        </div>
      )}

      {chatOpen && viewingAddress && (
        <ChatBox
          myAddress={publicKey}
          otherAddress={viewingAddress}
          otherLabel="Founder"
          onClose={() => setChatOpen(false)}
          onRead={() => clearUnread(viewingAddress)}
        />
      )}
    </div>
  );
};
