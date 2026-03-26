import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import * as StellarSdk from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';
import { CONTRACT_ID, NETWORK_PASSPHRASE, TESTNET_XLM_CONTRACT } from '../config';
import { server, getAllVCs, getAccount, getMilestoneVoteTally } from '../stellar';
import { useStartupStatus } from '../hooks/useStartupStatus';
import { useIPFSMetadata } from '../hooks/useIPFSMetadata';
import { uploadToIPFS } from '../ipfs';
import { ChatBox } from './ChatBox';
import { useUnreadCounts, requestNotificationPermission } from '../hooks/useUnreadCounts';

interface FounderViewProps {
  publicKey: string;
}

export const FounderView = ({ publicKey }: FounderViewProps) => {
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [projectUrl, setProjectUrl] = useState('');
  const [teamInfo, setTeamInfo] = useState('');
  const [fundingGoal, setFundingGoal] = useState('');
  const [milestoneEnabled, setMilestoneEnabled] = useState(false);
  const [totalMilestones, setTotalMilestones] = useState('3');
  const [chatWithVC, setChatWithVC] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { data: startupData, isLoading } = useStartupStatus(publicKey);
  const { data: metadata, isLoading: metadataLoading } = useIPFSMetadata(startupData?.ipfs_cid);
  const { data: allVCs = [] } = useQuery({ queryKey: ['allVCs'], queryFn: getAllVCs, refetchInterval: 30000 });

  const { totalUnread, getUnread, clearUnread } = useUnreadCounts(publicKey, allVCs);

  // Request browser notification permission once
  useEffect(() => { requestNotificationPermission(); }, []);

  // Milestone vote tally for the founder's own startup
  const { data: voteTally = [0, 0] } = useQuery({
    queryKey: ['milestoneTally', publicKey],
    queryFn: () => getMilestoneVoteTally(publicKey),
    enabled: !!startupData?.milestone_enabled,
    refetchInterval: 15000,
  });

  if (!publicKey || typeof publicKey !== 'string' || publicKey.length < 50) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Invalid Wallet</div>
          <p className="text-zinc-500">Please disconnect and reconnect your Freighter wallet.</p>
        </div>
      </div>
    );
  }

  const applyMutation = useMutation({
    mutationFn: async (data: { name: string; desc: string; url: string; team: string; goal: string; milestoneEnabled: boolean; totalMilestones: number }) => {
      // Pre-flight: verify account exists on testnet
      let sourceAccount;
      try {
        sourceAccount = await getAccount(publicKey);
      } catch {
        throw new Error('loadAccount failed — wallet not funded on testnet');
      }

      const ipfsCid = await uploadToIPFS({ project_name: data.name, description: data.desc, project_url: data.url, team_info: data.team });
      const contract = new StellarSdk.Contract(CONTRACT_ID);
      const goalInStroops = Math.floor(parseFloat(data.goal) * 1e7);
      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, { fee: StellarSdk.BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
        .addOperation(contract.call(
          'apply',
          StellarSdk.Address.fromString(publicKey).toScVal(),
          StellarSdk.nativeToScVal(ipfsCid, { type: 'string' }),
          StellarSdk.nativeToScVal(BigInt(goalInStroops), { type: 'i128' }),
          StellarSdk.nativeToScVal(data.milestoneEnabled, { type: 'bool' }),
          StellarSdk.nativeToScVal(data.totalMilestones, { type: 'u32' }),
        ))
        .setTimeout(30).build();
      const prepared = await server.prepareTransaction(transaction);
      const signedXdr = await signTransaction(prepared.toXDR(), { networkPassphrase: NETWORK_PASSPHRASE });
      if (!signedXdr) throw new Error('User declined the transaction in Freighter');
      const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
      const result = await server.sendTransaction(signedTx);
      let status = await server.getTransaction(result.hash);
      let attempts = 0;
      while (status.status === 'NOT_FOUND' && attempts < 30) {
        await new Promise(r => setTimeout(r, 1000));
        status = await server.getTransaction(result.hash);
        attempts++;
      }
      if (status.status !== 'SUCCESS') throw new Error(`Transaction failed with status: ${status.status}`);
      return status;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['startupStatus'] });
      setProjectName(''); setDescription(''); setProjectUrl(''); setTeamInfo(''); setFundingGoal('');
      alert('Application submitted successfully!');
    },
    onError: (error) => {
      console.error('Application error:', error);
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('already applied')) {
        alert('You have already submitted an application with this wallet.');
      } else if (msg.includes('404') || msg.includes('not found') || msg.includes('loadAccount')) {
        alert('Your wallet is not funded on Stellar Testnet.\n\nGet free testnet XLM at:\nhttps://friendbot.stellar.org/?addr=' + publicKey);
      } else if (msg.includes('User declined') || msg.includes('rejected')) {
        alert('Transaction was cancelled in Freighter.');
      } else if (msg.includes('Network') || msg.includes('passphrase')) {
        alert('Wrong network in Freighter. Please switch to Stellar Testnet in your Freighter settings.');
      } else if (msg.includes('IPFS') || msg.includes('Pinata') || msg.includes('upload')) {
        alert('Failed to upload metadata to IPFS. Please check your internet connection and try again.');
      } else {
        alert('Failed to submit application.\n\nError: ' + msg);
      }
    },
  });

  const claimMutation = useMutation({
    mutationFn: async () => {
      const sourceAccount = await getAccount(publicKey);
      const contract = new StellarSdk.Contract(CONTRACT_ID);
      const xlmAddress = new StellarSdk.Address(TESTNET_XLM_CONTRACT);
      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, { fee: StellarSdk.BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
        .addOperation(contract.call('claim_funds', StellarSdk.Address.fromString(publicKey).toScVal(), xlmAddress.toScVal()))
        .setTimeout(30).build();
      const prepared = await server.prepareTransaction(transaction);
      const signedXdr = await signTransaction(prepared.toXDR(), { networkPassphrase: NETWORK_PASSPHRASE });
      const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
      const result = await server.sendTransaction(signedTx);
      let status = await server.getTransaction(result.hash);
      while (status.status === 'NOT_FOUND') { await new Promise(r => setTimeout(r, 1000)); status = await server.getTransaction(result.hash); }
      if (status.status !== 'SUCCESS') throw new Error('Transaction failed');
      return status;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['startupStatus'] }); alert('Funds claimed successfully!'); },
    onError: () => alert('Failed to claim funds. Please try again.'),
  });

  const releaseMilestoneMutation = useMutation({
    mutationFn: async () => {
      const sourceAccount = await getAccount(publicKey);
      const contract = new StellarSdk.Contract(CONTRACT_ID);
      const xlmAddress = new StellarSdk.Address(TESTNET_XLM_CONTRACT);
      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, { fee: StellarSdk.BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
        .addOperation(contract.call('release_milestone', StellarSdk.Address.fromString(publicKey).toScVal(), xlmAddress.toScVal()))
        .setTimeout(30).build();
      const prepared = await server.prepareTransaction(transaction);
      const signedXdr = await signTransaction(prepared.toXDR(), { networkPassphrase: NETWORK_PASSPHRASE });
      const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
      const result = await server.sendTransaction(signedTx);
      let status = await server.getTransaction(result.hash);
      while (status.status === 'NOT_FOUND') { await new Promise(r => setTimeout(r, 1000)); status = await server.getTransaction(result.hash); }
      if (status.status !== 'SUCCESS') throw new Error('Transaction failed');
      return status;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['startupStatus'] }); queryClient.invalidateQueries({ queryKey: ['milestoneTally'] }); alert('Milestone released! Funds transferred to your wallet.'); },
    onError: (e) => alert(`Failed to release milestone: ${e instanceof Error ? e.message : 'Unknown error'}`),
  });

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !description.trim() || !projectUrl.trim() || !teamInfo.trim() || !fundingGoal.trim()) { alert('Please fill in all fields'); return; }
    const milestones = milestoneEnabled ? Math.max(1, parseInt(totalMilestones) || 3) : 1;
    applyMutation.mutate({ name: projectName, desc: description, url: projectUrl, team: teamInfo, goal: fundingGoal, milestoneEnabled, totalMilestones: milestones });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-500 text-sm uppercase tracking-widest font-bold">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const availableToClaim = (Number(startupData?.unlocked_balance || 0) - Number(startupData?.claimed_balance || 0)) / 1e7;
  const escrowedXLM = Number(startupData?.escrowed_funds || 0) / 1e7;
  const isMilestone = startupData?.milestone_enabled;
  const currentMilestone = Number(startupData?.current_milestone || 0);
  const totalMilestonesCount = Number(startupData?.total_milestones || 1);
  const allMilestonesReleased = currentMilestone >= totalMilestonesCount;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 mb-2">Founder Dashboard</div>
        <h2 className="text-4xl font-bold tracking-tighter mb-2">
          {startupData ? 'Your Application' : 'Apply for Funding'}
        </h2>
        <p className="text-zinc-500">
          {startupData ? 'Track your application status and claim funds.' : 'Submit your startup for community review and VC investment.'}
        </p>
      </div>

      {!startupData ? (
        <>
          <div className="grid grid-cols-3 gap-px bg-black/10">
            {[
              { n: '01', title: 'Apply', body: 'Fill in your project details. Metadata is stored on IPFS — only a hash goes on-chain.' },
              { n: '02', title: 'Community votes', body: 'Your application enters a 30-day public voting window. Any Stellar wallet can vote.' },
              { n: '03', title: 'Receive funding', body: 'Verified VCs invest directly. Choose direct payout or milestone-based escrow.' },
            ].map(s => (
              <div key={s.n} className="bg-white p-5">
                <div className="text-[10px] font-bold tracking-widest text-zinc-300 mb-2">{s.n}</div>
                <div className="text-[11px] font-bold uppercase tracking-widest mb-1">{s.title}</div>
                <p className="text-xs text-zinc-500 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="text-[11px] font-bold uppercase tracking-widest mb-6">Application Form</div>
            <div className="p-3 border border-black/10 bg-zinc-50 text-xs text-zinc-500 mb-5">
              Make sure your Freighter wallet is set to <span className="font-bold text-black">Stellar Testnet</span> and funded.
              Get free testnet XLM at{' '}
              <a href={`https://friendbot.stellar.org/?addr=${publicKey}`} target="_blank" rel="noopener noreferrer" className="underline font-medium text-black">
                friendbot.stellar.org
              </a>
            </div>
            <form onSubmit={handleApply} className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest mb-2">Project Name *</label>
                <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} className="form-input" placeholder="e.g., DeFi Protocol, NFT Marketplace" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest mb-2">Description *</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="form-input resize-none" placeholder="Describe your project, the problem you're solving, and your unique value proposition..." />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest mb-2">Project URL *</label>
                <input type="text" value={projectUrl} onChange={(e) => setProjectUrl(e.target.value)} className="form-input" placeholder="https://github.com/yourproject" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest mb-2">Team Information *</label>
                <textarea value={teamInfo} onChange={(e) => setTeamInfo(e.target.value)} rows={4} className="form-input resize-none" placeholder="Founder names, roles, experience, previous projects..." />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest mb-2">Funding Goal (XLM) *</label>
                <input type="number" step="0.01" value={fundingGoal} onChange={(e) => setFundingGoal(e.target.value)} className="form-input" placeholder="10000.00" />
              </div>
              <div className="border border-black/10 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-widest">Milestone-Based Vesting</div>
                    <p className="text-xs text-zinc-500 mt-1">Funds held in escrow and released in tranches as VCs approve milestones.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMilestoneEnabled(!milestoneEnabled)}
                    className={`w-12 h-6 relative transition-colors ${milestoneEnabled ? 'bg-black' : 'bg-zinc-200'}`}
                    aria-pressed={milestoneEnabled}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white transition-all ${milestoneEnabled ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
                {milestoneEnabled && (
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest mb-2">Number of Milestones</label>
                    <input
                      type="number"
                      min="2"
                      max="10"
                      value={totalMilestones}
                      onChange={(e) => setTotalMilestones(e.target.value)}
                      className="form-input w-32"
                    />
                    <p className="text-xs text-zinc-400 mt-1">Funds released in {totalMilestones} equal tranches after VC majority vote.</p>
                  </div>
                )}
              </div>
              <button type="submit" disabled={applyMutation.isPending} className="btn btn-primary w-full py-3">
                {applyMutation.isPending ? 'Uploading to IPFS & Submitting...' : 'Submit Application'}
              </button>
            </form>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="card">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Status</div>
                <h3 className="text-2xl font-bold tracking-tight">{startupData.approved ? 'Approved' : 'Under Review'}</h3>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                <span className={`badge ${startupData.approved ? 'badge-success' : 'badge-warning'}`}>
                  {startupData.approved ? 'Approved' : 'Pending'}
                </span>
                {isMilestone && <span className="badge badge-primary">Milestone Vesting</span>}
              </div>
            </div>
            {metadataLoading ? (
              <div className="animate-pulse space-y-3"><div className="h-4 bg-zinc-100 rounded w-3/4"></div><div className="h-4 bg-zinc-100 rounded w-full"></div></div>
            ) : metadata ? (
              <div className="space-y-4 text-sm">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Project Name</div>
                  <div className="font-bold text-lg">{metadata.project_name}</div>
                </div>
                <div className="pt-3 border-t border-black/5">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Description</div>
                  <p className="text-zinc-700">{metadata.description}</p>
                </div>
                <div className="pt-3 border-t border-black/5">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Project URL</div>
                  <a href={metadata.project_url} target="_blank" rel="noopener noreferrer" className="underline font-medium">View Project →</a>
                </div>
                <div className="pt-3 border-t border-black/5">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Funding Goal</div>
                  <div className="text-xl font-bold">{(Number(startupData.funding_goal) / 1e7).toFixed(2)} XLM</div>
                </div>
                <div className="pt-3 border-t border-black/5">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">IPFS CID</div>
                  <p className="text-xs font-mono text-zinc-400 break-all bg-zinc-50 p-2">{startupData.ipfs_cid}</p>
                </div>
                <div className="pt-3 border-t border-black/5">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">Community Votes</div>
                  {(() => {
                    const yes = Number(startupData.yes_votes);
                    const no = Number(startupData.no_votes);
                    const total = yes + no;
                    const pct = total > 0 ? Math.round((yes / total) * 100) : 0;
                    return (
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                          <span>{yes} Yes · {no} No</span>
                          <span>{total > 0 ? `${pct}% approval` : 'No votes yet'}</span>
                        </div>
                        <div className="h-1 w-full bg-zinc-100">
                          <div className="h-1 bg-black transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <div className="p-4 border border-black/10 bg-zinc-50 text-sm text-zinc-600">Unable to load project metadata from IPFS</div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Allocated', value: (Number(startupData.total_allocated) / 1e7).toFixed(2) },
              { label: isMilestone ? 'In Escrow' : 'Unlocked', value: isMilestone ? escrowedXLM.toFixed(2) : (Number(startupData.unlocked_balance) / 1e7).toFixed(2) },
              { label: 'Claimed', value: (Number(startupData.claimed_balance) / 1e7).toFixed(2) },
            ].map((item) => (
              <div key={item.label} className="card">
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">{item.label}</div>
                <div className="text-2xl font-bold tracking-tighter">{item.value} <span className="text-sm text-zinc-400">XLM</span></div>
              </div>
            ))}
          </div>

          {isMilestone ? (
            <div className="card">
              <div className="text-[11px] font-bold uppercase tracking-widest mb-4">Milestone Vesting</div>
              <div className="mb-4">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">
                  <span>Progress</span>
                  <span>{currentMilestone} / {totalMilestonesCount} released</span>
                </div>
                <div className="h-2 w-full bg-zinc-100">
                  <div
                    className="h-2 bg-black transition-all"
                    style={{ width: `${totalMilestonesCount > 0 ? (currentMilestone / totalMilestonesCount) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Current Milestone</div>
                  <div className="font-bold">{allMilestonesReleased ? 'Complete' : `#${currentMilestone + 1}`}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Escrowed</div>
                  <div className="font-bold">{escrowedXLM.toFixed(2)} XLM</div>
                </div>
              </div>
              {!allMilestonesReleased ? (
                <>
                  {(() => {
                    const [approveCount, totalInvestors] = voteTally as [number, number];
                    const majorityReached = totalInvestors > 0 && approveCount * 2 > totalInvestors;
                    return (
                      <>
                        <div className="p-4 border border-black/10 bg-zinc-50 mb-4">
                          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">VC Votes for Milestone #{currentMilestone + 1}</div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>{approveCount} approved · {totalInvestors - approveCount} rejected</span>
                            <span className="font-bold">{totalInvestors > 0 ? `${approveCount} / ${totalInvestors}` : 'No investors yet'}</span>
                          </div>
                          <div className="h-1 w-full bg-zinc-100">
                            <div className="h-1 bg-black transition-all" style={{ width: `${totalInvestors > 0 ? (approveCount / totalInvestors) * 100 : 0}%` }} />
                          </div>
                          {!majorityReached && totalInvestors > 0 && (
                            <p className="text-xs text-zinc-500 mt-2">Need majority ({Math.ceil(totalInvestors / 2) + (totalInvestors % 2 === 0 ? 1 : 0)} votes) to release.</p>
                          )}
                        </div>
                        <button
                          onClick={() => releaseMilestoneMutation.mutate()}
                          disabled={releaseMilestoneMutation.isPending || escrowedXLM <= 0 || !majorityReached}
                          className="btn btn-primary w-full py-3"
                        >
                          {releaseMilestoneMutation.isPending
                            ? 'Processing...'
                            : !majorityReached
                            ? 'Waiting for VC majority vote'
                            : `Release Milestone #${currentMilestone + 1}`}
                        </button>
                      </>
                    );
                  })()}
                </>
              ) : (
                <div className="p-4 border border-black/10 bg-zinc-50 text-sm text-zinc-600 text-center">
                  All milestones released. Funding complete.
                </div>
              )}
            </div>
          ) : (
            <div className="card">
              <div className="text-[11px] font-bold uppercase tracking-widest mb-4">Claim Funds</div>
              <div className="flex justify-between items-center mb-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Available to Claim</div>
                <div className="text-2xl font-bold">{availableToClaim.toFixed(2)} XLM</div>
              </div>
              <button
                onClick={() => claimMutation.mutate()}
                disabled={claimMutation.isPending || availableToClaim <= 0}
                className="btn btn-primary w-full py-3"
              >
                {claimMutation.isPending ? 'Processing...' : availableToClaim <= 0 ? 'No Funds Available' : 'Claim Funds'}
              </button>
              {availableToClaim <= 0 && (
                <div className="mt-4 p-4 border border-black/10 bg-zinc-50 text-sm text-zinc-600 space-y-1">
                  <div className="font-bold text-black text-[11px] uppercase tracking-widest mb-2">How to Get Funds</div>
                  <div>1. VCs need to invest through the VC dashboard</div>
                  <div>2. Once invested, funds appear here to claim</div>
                  <div className="pt-2 border-t border-black/5">
                    VCs in system: <span className="font-bold">{allVCs.length > 0 ? `${allVCs.length} verified` : 'None yet'}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VC Messages */}
          {allVCs.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="text-[11px] font-bold uppercase tracking-widest">Messages from VCs</div>
                {totalUnread > 0 && (
                  <span className="bg-black text-white text-[10px] font-bold px-2 py-0.5">{totalUnread} unread</span>
                )}
              </div>
              <div className="space-y-2">
                {allVCs.slice(0, 10).map((vc: string) => {
                  const unread = getUnread(vc);
                  return (
                    <button
                      key={vc}
                      onClick={() => setChatWithVC(chatWithVC === vc ? null : vc)}
                      className="w-full text-left p-3 border border-black/10 hover:border-black transition-all flex justify-between items-center"
                    >
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-0.5">VC</div>
                        <div className="text-xs font-mono">{vc.slice(0, 8)}...{vc.slice(-6)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {unread > 0 && (
                          <span className="w-5 h-5 bg-black text-white text-[10px] font-bold flex items-center justify-center">
                            {unread}
                          </span>
                        )}
                        <div className="text-[11px] font-bold uppercase tracking-widest">
                          {chatWithVC === vc ? 'Close' : 'Open →'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {chatWithVC && (
        <ChatBox
          myAddress={publicKey}
          otherAddress={chatWithVC}
          otherLabel="VC"
          onClose={() => setChatWithVC(null)}
          onRead={() => clearUnread(chatWithVC)}
        />
      )}
    </div>
  );
};
