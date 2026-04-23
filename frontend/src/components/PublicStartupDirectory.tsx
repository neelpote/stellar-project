import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStartupStatus, getAllStartups } from '../stellar';
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

const PublicStartupCard = ({ address, onClick }: { address: string; onClick: () => void }) => {
  const { data: startup } = useQuery({
    queryKey: ['startupCard', address],
    queryFn: () => getStartupStatus(address),
    staleTime: 10000,
  });
  const { data: meta } = useIPFSMetadata(startup?.ipfs_cid);

  if (!startup) {
    return (
      <div className="card animate-pulse space-y-3">
        <div className="h-4 bg-zinc-100 w-3/4" />
        <div className="h-3 bg-zinc-100 w-full" />
        <div className="h-3 bg-zinc-100 w-1/2" />
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

      <div className="h-px w-full bg-zinc-100 mb-3">
        <div className="h-px bg-black transition-all" style={{ width: `${pct}%` }} />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-[11px] font-bold">
            <span>{Number(startup.yes_votes)}</span>
            <span className="text-zinc-400 ml-1">Yes</span>
          </span>
          <span className="text-[11px] font-bold">
            <span>{Number(startup.no_votes)}</span>
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

export const PublicStartupDirectory = ({ onConnectWallet }: { onConnectWallet: () => void }) => {
  const [viewingAddress, setViewingAddress] = useState<string | null>(null);

  const { data: allStartups = [] } = useQuery({
    queryKey: ['allStartups'],
    queryFn: getAllStartups,
    refetchInterval: 30000,
  });

  const { data: startupData, isLoading } = useQuery({
    queryKey: ['publicStartup', viewingAddress],
    queryFn: () => viewingAddress ? getStartupStatus(viewingAddress) : null,
    enabled: !!viewingAddress,
    refetchInterval: 10000,
  });

  const { data: metadata, isLoading: metaLoading } = useIPFSMetadata(startupData?.ipfs_cid);

  if (viewingAddress) {
    const total = Number(startupData?.yes_votes ?? 0) + Number(startupData?.no_votes ?? 0);
    const pct = total > 0 ? Math.round((Number(startupData!.yes_votes) / total) * 100) : 0;
    const active = startupData ? isActive(startupData.voting_end_time) : false;

    return (
      <div className="space-y-6">
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
                <div className="space-y-2 animate-pulse pt-4 border-t border-black/5">
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
                <div className="p-4 border border-black/10 bg-zinc-50 text-sm text-zinc-500 mt-4">
                  Unable to load metadata from IPFS
                </div>
              )}
            </div>

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

              <div className="p-5 border border-black/10 bg-zinc-50 text-center space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-widest">Want to vote?</div>
                <p className="text-xs text-zinc-500">Connect your Freighter wallet to cast a vote on-chain.</p>
                <button onClick={onConnectWallet} className="btn btn-primary px-6 py-2">
                  Connect Wallet
                </button>
              </div>
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
    <div className="space-y-6">
      {allStartups.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allStartups.map((address: string) => (
            <PublicStartupCard
              key={address}
              address={address}
              onClick={() => setViewingAddress(address)}
            />
          ))}
        </div>
      ) : (
        <div className="card text-center py-16">
          <div className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-2">No Applications Yet</div>
          <p className="text-sm text-zinc-500">Connect your wallet and be the first to apply.</p>
        </div>
      )}

      <div className="border border-black p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest mb-1">Ready to participate?</div>
          <p className="text-sm text-zinc-500 max-w-md">
            Connect your wallet to vote on applications, apply as a founder, or stake to become a VC.
          </p>
        </div>
        <button onClick={onConnectWallet} className="btn btn-primary px-8 py-3 shrink-0">
          Connect Wallet →
        </button>
      </div>
    </div>
  );
};
