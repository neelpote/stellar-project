import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as StellarSdk from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';
import { CONTRACT_ID, NETWORK_PASSPHRASE } from '../config';
import { server, getStartupStatus, getAllStartups, getAccount, submitWithFeeBump } from '../stellar';
import { useIPFSMetadata } from '../hooks/useIPFSMetadata';

const timeRemaining = (endTime: number | bigint) => {
  const now = Math.floor(Date.now() / 1000);
  const end = typeof endTime === 'bigint' ? Number(endTime) : endTime;
  const diff = end - now;
  if (diff <= 0) return 'Ended';
  const d = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  if (d > 0) return `${d}d ${h}h left`;
  const m = Math.floor((diff % 3600) / 60);
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
};

const isActive = (endTime: number | bigint) => {
  const now = Math.floor(Date.now() / 1000);
  return now < (typeof endTime === 'bigint' ? Number(endTime) : endTime);
};

const StartupCard = ({ address, onClick }: { address: string; onClick: () => void }) => {
  const { data: startup } = useQuery({
    queryKey: ['startupCard', address],
    queryFn: () => getStartupStatus(address),
    staleTime: 10000,
  });
  const { data: meta } = useIPFSMetadata(startup?.ipfs_cid);

  if (!startup) {
    return (
      <div className="card animate-pulse space-y-3">
        <div className="h-4 bg-zinc-100 w-3/4"></div>
        <div className="h-3 bg-zinc-100 w-full"></div>
        <div className="h-3 bg-zinc-100 w-1/2"></div>
      </div>
    );
  }

  // Hide cards where metadata loaded but has no project name
  if (meta !== undefined && !meta?.project_name) return null;

  const total = Number(startup.yes_votes) + Number(startup.no_votes);
  const pct = total > 0 ? Math.round((Number(startup.yes_votes) / total) * 100) : 0;
  const active = isActive(startup.voting_end_time);

  return (
    <div onClick={onClick} className="card cursor-pointer">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1 min-w-0 pr-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-1">
            {active ? 'Voting Open' : 'Voting Closed'}
          </div>
          <h3 className="text-lg font-bold tracking-tight truncate">
            {meta?.project_name || '—'}
          </h3>
          <p className="text-sm text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
            {meta?.description || ''}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xl font-bold tracking-tighter">
            {(Number(startup.funding_goal) / 1e7).toFixed(0)}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">XLM Goal</div>
        </div>
      </div>

      {/* Vote bar */}
      <div className="mb-3">
        <div className="h-1 w-full bg-zinc-100">
          <div className="h-1 bg-black transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-[11px] font-bold">
            <span className="text-black">{Number(startup.yes_votes)}</span>
            <span className="text-zinc-400 ml-1">Yes</span>
          </span>
          <span className="text-[11px] font-bold">
            <span className="text-black">{Number(startup.no_votes)}</span>
            <span className="text-zinc-400 ml-1">No</span>
          </span>
          {total > 0 && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              {pct}% approval
            </span>
          )}
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
          {timeRemaining(startup.voting_end_time)}
        </span>
      </div>
    </div>
  );
};

const FilteredStartupCard = ({ address, search, filter, onClick }: { address: string; search: string; filter: 'all' | 'open' | 'closed'; onClick: () => void }) => {
  const { data: startup } = useQuery({ queryKey: ['startupCard', address], queryFn: () => getStartupStatus(address), staleTime: 10000 });
  const { data: meta } = useIPFSMetadata(startup?.ipfs_cid);
  if (!startup) return null;
  if (meta !== undefined && !meta?.project_name) return null;
  const active = isActive(startup.voting_end_time);
  if (filter === 'open' && !active) return null;
  if (filter === 'closed' && active) return null;
  if (search && meta?.project_name && !meta.project_name.toLowerCase().includes(search.toLowerCase())) return null;
  return <StartupCard address={address} onClick={onClick} />;
};

interface PublicVotingViewProps { publicKey: string; }

export const PublicVotingView = ({ publicKey }: PublicVotingViewProps) => {
  const [viewingAddress, setViewingAddress] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');
  const queryClient = useQueryClient();

  const { data: allStartups = [] } = useQuery({
    queryKey: ['allStartups'],
    queryFn: getAllStartups,
    refetchInterval: 30000,
  });

  const { data: startupData, isLoading } = useQuery({
    queryKey: ['votingStartup', viewingAddress],
    queryFn: () => viewingAddress ? getStartupStatus(viewingAddress) : null,
    enabled: !!viewingAddress,
    refetchInterval: (data) => {
      if (!data || !data.voting_end_time) return false;
      return isActive(data.voting_end_time) ? 5000 : false;
    },
  });

  const { data: metadata, isLoading: metaLoading } = useIPFSMetadata(startupData?.ipfs_cid);

  const { data: hasVoted } = useQuery({
    queryKey: ['hasVoted', publicKey, viewingAddress],
    queryFn: async () => {
      if (!viewingAddress) return false;
      try {
        const contract = new StellarSdk.Contract(CONTRACT_ID);
        const sourceAccount = await getAccount(publicKey);
        const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
          fee: '100', networkPassphrase: NETWORK_PASSPHRASE,
        })
          .addOperation(contract.call(
            'has_voted',
            StellarSdk.Address.fromString(publicKey).toScVal(),
            StellarSdk.Address.fromString(viewingAddress).toScVal()
          ))
          .setTimeout(30).build();
        const sim = await server.simulateTransaction(tx);
        if (StellarSdk.rpc.Api.isSimulationSuccess(sim)) {
          const r = sim.result?.retval;
          if (r) return StellarSdk.scValToNative(r);
        }
        return false;
      } catch { return false; }
    },
    enabled: !!viewingAddress && !!publicKey,
  });

  const voteMutation = useMutation({
    mutationFn: async ({ founder, voteYes }: { founder: string; voteYes: boolean }) => {
      const sourceAccount = await getAccount(publicKey);
      const contract = new StellarSdk.Contract(CONTRACT_ID);
      const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call(
          'vote',
          StellarSdk.Address.fromString(publicKey).toScVal(),
          StellarSdk.Address.fromString(founder).toScVal(),
          StellarSdk.xdr.ScVal.scvBool(voteYes)
        ))
        .setTimeout(30).build();
      const prepared = await server.prepareTransaction(tx);
      const signedXdr = await signTransaction(prepared.toXDR(), { networkPassphrase: NETWORK_PASSPHRASE });
      const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
      const { hash } = await submitWithFeeBump(signedTx);
      let status = await server.getTransaction(hash);
      let i = 0;
      while (status.status === 'NOT_FOUND' && i++ < 20) {
        await new Promise(r => setTimeout(r, 1000));
        status = await server.getTransaction(hash);
      }
      if (status.status !== 'SUCCESS') throw new Error('Transaction failed');
      return status;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['votingStartup'] });
      queryClient.invalidateQueries({ queryKey: ['hasVoted'] });
      queryClient.invalidateQueries({ queryKey: ['allStartups'] });
      alert('Vote submitted successfully!');
    },
    onError: () => alert('Failed to submit vote. Please try again.'),
  });

  if (viewingAddress) {
    const total = Number(startupData?.yes_votes ?? 0) + Number(startupData?.no_votes ?? 0);
    const pct = total > 0 ? Math.round((Number(startupData!.yes_votes) / total) * 100) : 0;
    const active = startupData ? isActive(startupData.voting_end_time) : false;

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <button
          onClick={() => setViewingAddress(null)}
          className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 hover:text-black transition-colors"
        >
          ← Back
        </button>

        {isLoading ? (
          <div className="card flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
          </div>
        ) : startupData ? (
          <>
            {/* Project info */}
            <div className="card space-y-5">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 mb-2">
                    {active ? 'Voting Open' : 'Voting Closed'}
                  </div>
                  <h2 className="text-3xl font-bold tracking-tighter">
                    {metaLoading ? '—' : (metadata?.project_name || '—')}
                  </h2>
                  <div className="text-xs font-mono text-zinc-400 mt-2">
                    {viewingAddress.slice(0, 8)}...{viewingAddress.slice(-8)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold tracking-tighter">
                    {(Number(startupData.funding_goal) / 1e7).toFixed(0)}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">XLM Goal</div>
                </div>
              </div>

              {metaLoading ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-3 bg-zinc-100 w-full" />
                  <div className="h-3 bg-zinc-100 w-4/5" />
                  <div className="h-3 bg-zinc-100 w-3/5" />
                </div>
              ) : metadata ? (
                <div className="space-y-4 pt-4 border-t border-black/5">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Description</div>
                    <p className="text-sm text-zinc-700 leading-relaxed">{metadata.description}</p>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Project URL</div>
                    <a href={metadata.project_url} target="_blank" rel="noopener noreferrer"
                      className="text-sm font-medium underline">
                      {metadata.project_url} →
                    </a>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Team</div>
                    <p className="text-sm text-zinc-700 leading-relaxed">{metadata.team_info}</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 border border-black/10 bg-zinc-50 text-sm text-zinc-500">
                  Unable to load metadata from IPFS
                </div>
              )}
            </div>

            {/* Voting panel */}
            <div className="card space-y-5">
              <div className="text-[11px] font-bold uppercase tracking-widest">Community Votes</div>

              <div className="grid grid-cols-2 gap-4">
                <div className="card">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Yes</div>
                  <div className="text-3xl font-bold tracking-tighter">{Number(startupData.yes_votes)}</div>
                </div>
                <div className="card">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">No</div>
                  <div className="text-3xl font-bold tracking-tighter">{Number(startupData.no_votes)}</div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">
                  <span>Approval</span>
                  <span>{total > 0 ? `${pct}%` : 'No votes yet'}</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-100">
                  <div className="h-1.5 bg-black transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
              </div>

              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-center">
                {timeRemaining(startupData.voting_end_time)}
              </div>

              {active ? (
                hasVoted ? (
                  <div className="p-4 border border-black/10 bg-zinc-50 text-center">
                    <div className="text-[11px] font-bold uppercase tracking-widest mb-1">Vote Recorded</div>
                    <p className="text-xs text-zinc-500">You've already voted on this application.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => voteMutation.mutate({ founder: viewingAddress, voteYes: true })}
                      disabled={voteMutation.isPending}
                      className="btn btn-primary py-3"
                    >
                      {voteMutation.isPending ? '...' : 'Vote Yes'}
                    </button>
                    <button
                      onClick={() => voteMutation.mutate({ founder: viewingAddress, voteYes: false })}
                      disabled={voteMutation.isPending}
                      className="btn btn-outline py-3"
                    >
                      {voteMutation.isPending ? '...' : 'Vote No'}
                    </button>
                  </div>
                )
              ) : (
                <div className="p-4 border border-black/10 bg-zinc-50 text-center">
                  <div className="text-[11px] font-bold uppercase tracking-widest mb-1">Voting Ended</div>
                  <p className="text-xs text-zinc-500">The 30-day voting window has closed. VCs can still invest in this startup regardless of the vote outcome. The community vote is advisory — it signals interest but does not block funding.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="card text-center py-12">
            <div className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Application not found</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 mb-2">DAO Governance</div>
        <h2 className="text-4xl font-bold tracking-tighter mb-2">Vote on Startups</h2>
        <p className="text-zinc-500">Browse applications and cast your vote. Every wallet gets one vote per startup.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Applications</div>
          <div className="text-3xl font-bold tracking-tighter">{allStartups.length}</div>
        </div>
        <div className="card">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Voting Period</div>
          <div className="text-3xl font-bold tracking-tighter">30 Days</div>
        </div>
        <div className="card">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Network</div>
          <div className="text-3xl font-bold tracking-tighter">Stellar</div>
        </div>
      </div>

      {allStartups.length > 0 ? (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by project name..."
              className="form-input flex-1"
            />
            <div className="flex gap-2">
              {(['all', 'open', 'closed'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 text-[11px] font-bold uppercase tracking-widest border transition-all ${filter === f ? 'bg-black text-white border-black' : 'border-black/20 text-zinc-500 hover:border-black hover:text-black'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allStartups.map((address: string) => (
              <FilteredStartupCard
                key={address}
                address={address}
                search={search}
                filter={filter}
                onClick={() => setViewingAddress(address)}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="card text-center py-16">
          <div className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-2">No Applications Yet</div>
          <p className="text-sm text-zinc-500">Be the first to submit an application from the Founders tab.</p>
        </div>
      )}

      <div className="card">
        <div className="text-[11px] font-bold uppercase tracking-widest mb-5">How Voting Works</div>
        <div className="grid grid-cols-3 gap-6">
          {[
            { n: '1', title: 'Browse', desc: 'Click any startup card to view the full application' },
            { n: '2', title: 'Review', desc: 'Read the description, team info, and funding goal' },
            { n: '3', title: 'Vote', desc: 'Cast Yes or No — one vote per wallet, on-chain' },
          ].map(s => (
            <div key={s.n} className="flex gap-3">
              <div className="w-6 h-6 bg-black text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                {s.n}
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-widest mb-1">{s.title}</div>
                <p className="text-xs text-zinc-500 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
