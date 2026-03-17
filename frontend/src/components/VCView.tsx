import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as StellarSdk from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';
import { CONTRACT_ID, NETWORK_PASSPHRASE, TESTNET_XLM_CONTRACT, HORIZON_URL } from '../config';
import { server, getStartupStatus, getVCStakeRequired, getVCData, getAllStartups, getAccount } from '../stellar';
import { useIPFSMetadata } from '../hooks/useIPFSMetadata';

const horizonServer = new StellarSdk.Horizon.Server(HORIZON_URL);

interface VCViewProps {
  publicKey: string;
}

export const VCView = ({ publicKey }: VCViewProps) => {
  const [searchAddress, setSearchAddress] = useState('');
  const [viewingAddress, setViewingAddress] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [investAmount, setInvestAmount] = useState('');
  const queryClient = useQueryClient();

  const { data: stakeRequired = '0' } = useQuery({
    queryKey: ['vcStakeRequired'],
    queryFn: getVCStakeRequired,
  });

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

  const { data: allStartups = [] } = useQuery({
    queryKey: ['allStartups'],
    queryFn: getAllStartups,
    refetchInterval: 30000,
  });

  const { data: startupData } = useQuery({
    queryKey: ['vcViewStartup', viewingAddress],
    queryFn: () => viewingAddress ? getStartupStatus(viewingAddress) : null,
    enabled: !!viewingAddress,
  });

  const { data: startupMetadata } = useIPFSMetadata(startupData?.ipfs_cid);

  const stakeMutation = useMutation({
    mutationFn: async (name: string) => {
      const sourceAccount = await getAccount(publicKey);
      const contract = new StellarSdk.Contract(CONTRACT_ID);
      const xlmAddress = new StellarSdk.Address(TESTNET_XLM_CONTRACT);

      const account = await horizonServer.loadAccount(publicKey);
      const bal = account.balances.find(b => b.asset_type === 'native');
      if (!bal || !('balance' in bal)) throw new Error('XLM balance not found.');

      const requiredAmount = Number(stakeRequired) / 1e7;
      const availableAmount = parseFloat(bal.balance);
      if (availableAmount < requiredAmount) {
        throw new Error(`Insufficient XLM. Required: ${requiredAmount} XLM, Available: ${availableAmount} XLM`);
      }

      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call(
          'stake_to_become_vc',
          StellarSdk.Address.fromString(publicKey).toScVal(),
          StellarSdk.nativeToScVal(name, { type: 'string' }),
          xlmAddress.toScVal()
        ))
        .setTimeout(30).build();

      const prepared = await server.prepareTransaction(transaction);
      const signedXdr = await signTransaction(prepared.toXDR(), { networkPassphrase: NETWORK_PASSPHRASE });
      const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
      const result = await server.sendTransaction(signedTx);

      let status = await server.getTransaction(result.hash);
      while (status.status === 'NOT_FOUND') {
        await new Promise(r => setTimeout(r, 1000));
        status = await server.getTransaction(result.hash);
      }
      if (status.status !== 'SUCCESS') throw new Error('Transaction failed');
      return status;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcData'] });
      setCompanyName('');
      alert('Successfully staked! You are now a verified VC.');
    },
    onError: (error) => {
      alert(`Failed to stake: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  const investMutation = useMutation({
    mutationFn: async ({ founder, amount }: { founder: string; amount: string }) => {
      const sourceAccount = await getAccount(publicKey);
      const contract = new StellarSdk.Contract(CONTRACT_ID);
      const amountInStroops = Math.floor(parseFloat(amount) * 1e7);
      const xlmAddress = new StellarSdk.Address(TESTNET_XLM_CONTRACT);

      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call(
          'vc_invest',
          StellarSdk.Address.fromString(publicKey).toScVal(),
          StellarSdk.Address.fromString(founder).toScVal(),
          StellarSdk.nativeToScVal(BigInt(amountInStroops), { type: 'i128' }),
          xlmAddress.toScVal()
        ))
        .setTimeout(30).build();

      const prepared = await server.prepareTransaction(transaction);
      const signedXdr = await signTransaction(prepared.toXDR(), { networkPassphrase: NETWORK_PASSPHRASE });
      const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
      const result = await server.sendTransaction(signedTx);

      let status = await server.getTransaction(result.hash);
      while (status.status === 'NOT_FOUND') {
        await new Promise(r => setTimeout(r, 1000));
        status = await server.getTransaction(result.hash);
      }
      if (status.status !== 'SUCCESS') throw new Error('Transaction failed');
      return status;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcViewStartup'] });
      queryClient.invalidateQueries({ queryKey: ['vcData'] });
      setInvestAmount('');
      alert('Investment successful!');
    },
    onError: () => alert('Failed to invest. Please try again.'),
  });

  const handleStake = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) { alert('Please enter your company name'); return; }
    stakeMutation.mutate(companyName);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchAddress.trim()) setViewingAddress(searchAddress);
  };

  const handleInvest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingAddress || !investAmount.trim()) { alert('Please enter investment amount'); return; }
    investMutation.mutate({ founder: viewingAddress, amount: investAmount });
  };

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

  if (!vcData) {
    const stakeXLM = (Number(stakeRequired) / 1e7).toFixed(2);
    const hasEnough = (xlmBalance || 0) >= Number(stakeRequired) / 1e7;

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 mb-2">Venture Capital</div>
          <h2 className="text-4xl font-bold tracking-tighter mb-2">Become a VC</h2>
          <p className="text-zinc-500">Stake XLM to become a verified investor and fund approved startups.</p>
        </div>

        {/* Explainer */}
        <div className="grid grid-cols-3 gap-px bg-black/10">
          {[
            { n: '01', title: 'Stake once', body: 'Lock 1000 XLM into the contract. No admin approval, no whitelist — the stake is your credential.' },
            { n: '02', title: 'Browse startups', body: 'Search any founder address or browse the full list. View project details, team info, and community votes.' },
            { n: '03', title: 'Invest directly', body: 'Send any amount of XLM to a startup. Funds go straight into the contract, claimable by the founder.' },
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
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="form-input"
                placeholder="Your VC firm or investment company name"
              />
            </div>
            <button
              type="submit"
              disabled={stakeMutation.isPending || !hasEnough}
              className="btn btn-primary w-full py-3"
            >
              {stakeMutation.isPending ? 'Processing...' : !hasEnough ? `Insufficient Balance (need ${stakeXLM} XLM)` : `Stake ${stakeXLM} XLM to Become VC`}
            </button>
          </form>

          {!hasEnough && (
            <div className="mt-4 p-4 border border-black/10 bg-zinc-50 text-sm text-zinc-600">
              Get testnet XLM at <a href="https://friendbot.stellar.org" target="_blank" rel="noopener noreferrer" className="underline font-medium">friendbot.stellar.org</a>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { title: 'Direct Investment', desc: 'Invest in approved startups without intermediaries' },
            { title: 'Portfolio Tracking', desc: 'Monitor all investments in real-time on-chain' },
            { title: 'Fully Decentralized', desc: 'No admin approval needed — stake and start investing' },
          ].map((item) => (
            <div key={item.title} className="card">
              <div className="text-[11px] font-bold uppercase tracking-widest mb-2">{item.title}</div>
              <p className="text-xs text-zinc-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // VC Dashboard
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 mb-2">VC Dashboard</div>
        <h2 className="text-4xl font-bold tracking-tighter mb-1">{vcData.company_name}</h2>
        <p className="text-zinc-500">Search a founder address below or browse the startup list to invest. Funds are held in the contract and released to founders on claim — your investment is on-chain and transparent.</p>
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
              <button
                key={address}
                onClick={() => setViewingAddress(address)}
                className="text-left p-4 border border-black/10 hover:border-black transition-all"
              >
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Founder</div>
                <div className="text-xs font-mono truncate mb-2">{address}</div>
                <div className="text-[11px] font-bold uppercase tracking-widest">View Details →</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="text-[11px] font-bold uppercase tracking-widest mb-4">Search by Address</div>
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            value={searchAddress}
            onChange={(e) => setSearchAddress(e.target.value)}
            className="form-input flex-1 font-mono text-sm"
            placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
          />
          <button type="submit" className="btn btn-primary px-6">Search</button>
        </form>
      </div>

      {viewingAddress && startupData && startupData.exists && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Approved Startup</div>
                <h3 className="text-2xl font-bold tracking-tight">{startupMetadata?.project_name || 'Loading...'}</h3>
              </div>
              <span className="badge badge-success">Approved</span>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Description</div>
                <p className="text-zinc-700">{startupMetadata?.description || '—'}</p>
              </div>
              <div className="pt-3 border-t border-black/5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Project URL</div>
                {startupMetadata?.project_url ? (
                  <a href={startupMetadata.project_url} target="_blank" rel="noopener noreferrer" className="underline font-medium">
                    {startupMetadata.project_url} →
                  </a>
                ) : <span className="text-zinc-400">—</span>}
              </div>
              <div className="pt-3 border-t border-black/5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Funding Goal</div>
                <div className="text-xl font-bold">{(Number(startupData.funding_goal) / 1e7).toFixed(2)} XLM</div>
              </div>
              <div className="pt-3 border-t border-black/5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Already Funded</div>
                <div className="text-lg font-bold">{(Number(startupData.total_allocated) / 1e7).toFixed(2)} XLM</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="text-[11px] font-bold uppercase tracking-widest mb-4">Invest in this Startup</div>
            <form onSubmit={handleInvest} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest mb-2">Amount (XLM)</label>
                <input
                  type="number"
                  step="0.01"
                  value={investAmount}
                  onChange={(e) => setInvestAmount(e.target.value)}
                  className="form-input"
                  placeholder="1000.00"
                />
              </div>
              <button type="submit" disabled={investMutation.isPending} className="btn btn-primary w-full py-3">
                {investMutation.isPending ? 'Processing...' : 'Invest Now'}
              </button>
            </form>
          </div>
        </div>
      )}

      {viewingAddress && startupData && !startupData.exists && (
        <div className="card text-center py-12">
          <div className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Startup Not Found</div>
          <p className="text-zinc-500 text-sm">No application found for this address.</p>
        </div>
      )}
    </div>
  );
};
