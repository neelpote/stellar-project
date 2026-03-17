import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import * as StellarSdk from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';
import { CONTRACT_ID, NETWORK_PASSPHRASE } from '../config';
import { server, getStartupStatus, getAccount } from '../stellar';
import { verifyAdmin, EXPECTED_ADMIN } from '../adminTest';
import { useIPFSMetadata } from '../hooks/useIPFSMetadata';

interface AdminViewProps {
  publicKey: string;
}

export const AdminView = ({ publicKey }: AdminViewProps) => {
  const [approveAddress, setApproveAddress] = useState('');
  const [reviewAddress, setReviewAddress] = useState('');
  const [adminDebug, setAdminDebug] = useState<any>(null);

  const checkAdminStatus = async () => {
    const result = await verifyAdmin(publicKey);
    setAdminDebug(result);
    if (!result.isAdmin) {
      alert(`Admin Verification Failed!\n\nYour wallet: ${publicKey}\nExpected admin: ${result.adminAddress || EXPECTED_ADMIN.address}\n\nPlease import the admin secret key: ${EXPECTED_ADMIN.secret}`);
    } else {
      alert('Admin verification successful!');
    }
  };

  const { data: reviewData } = useQuery({
    queryKey: ['reviewStartup', reviewAddress],
    queryFn: () => reviewAddress ? getStartupStatus(reviewAddress) : null,
    enabled: !!reviewAddress,
  });

  const { data: reviewMetadata } = useIPFSMetadata(reviewData?.ipfs_cid);

  const approveApplicationMutation = useMutation({
    mutationFn: async (founder: string) => {
      if (!founder || founder.trim().length === 0) throw new Error('Founder address is required');
      try { StellarSdk.StrKey.decodeEd25519PublicKey(founder); } catch { throw new Error('Invalid Stellar address format'); }
      try { StellarSdk.StrKey.decodeEd25519PublicKey(publicKey); } catch { throw new Error('Invalid admin address format'); }

      const startupStatus = await getStartupStatus(founder);
      if (!startupStatus) throw new Error('Startup application not found. The founder must submit an application first.');
      if (startupStatus.approved) throw new Error('This application has already been approved.');

      const sourceAccount = await getAccount(publicKey);
      const contract = new StellarSdk.Contract(CONTRACT_ID);
      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, { fee: StellarSdk.BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
        .addOperation(contract.call('approve_application', StellarSdk.Address.fromString(publicKey).toScVal(), StellarSdk.Address.fromString(founder).toScVal()))
        .setTimeout(30).build();

      const prepared = await server.prepareTransaction(transaction);
      const signedXdr = await signTransaction(prepared.toXDR(), { networkPassphrase: NETWORK_PASSPHRASE });
      const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
      const result = await server.sendTransaction(signedTx);

      let status = await server.getTransaction(result.hash);
      while (status.status === 'NOT_FOUND') { await new Promise(r => setTimeout(r, 1000)); status = await server.getTransaction(result.hash); }
      if (status.status !== 'SUCCESS') throw new Error(`Transaction failed: ${status.status}`);
      return status;
    },
    onSuccess: () => { setApproveAddress(''); alert('Application approved successfully!'); },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to approve application: ${msg}`);
    },
  });

  const handleApproveApplication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!approveAddress.trim()) { alert('Please enter founder address'); return; }
    approveApplicationMutation.mutate(approveAddress);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 mb-2">Admin Dashboard</div>
        <h2 className="text-4xl font-bold tracking-tighter mb-2">Manage Applications</h2>
        <p className="text-zinc-500">Review community votes and approve startup applications.</p>
      </div>

      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Connected As</div>
            <div className="text-xs font-mono">{publicKey}</div>
            {adminDebug && (
              <div className="text-xs text-zinc-400 mt-1">Expected: {adminDebug.adminAddress || EXPECTED_ADMIN.address}</div>
            )}
          </div>
          <button onClick={checkAdminStatus} className="btn btn-outline px-4 py-2 text-xs">
            Verify Admin
          </button>
        </div>
      </div>

      <div className="card">
        <div className="text-[11px] font-bold uppercase tracking-widest mb-4">Review Application</div>
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={reviewAddress}
            onChange={(e) => setReviewAddress(e.target.value)}
            className="form-input flex-1 font-mono text-sm"
            placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
          />
          <button type="button" onClick={() => setReviewAddress('')} className="btn btn-outline px-4 py-2 text-xs">
            Clear
          </button>
        </div>

        {reviewData && (
          <div className="space-y-3 text-sm border-t border-black/5 pt-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Project Name</div>
              <div className="font-bold text-lg">{reviewMetadata?.project_name || 'Loading...'}</div>
            </div>
            <div className="pt-3 border-t border-black/5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Description</div>
              <p className="text-zinc-700">{reviewMetadata?.description || '—'}</p>
            </div>
            <div className="pt-3 border-t border-black/5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Project URL</div>
              {reviewMetadata?.project_url ? (
                <a href={reviewMetadata.project_url} target="_blank" rel="noopener noreferrer" className="underline font-medium">
                  {reviewMetadata.project_url} →
                </a>
              ) : <span className="text-zinc-400">—</span>}
            </div>
            <div className="pt-3 border-t border-black/5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Team</div>
              <p className="text-zinc-700">{reviewMetadata?.team_info || '—'}</p>
            </div>
            <div className="pt-3 border-t border-black/5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Funding Goal</div>
              <div className="text-xl font-bold">{(Number(reviewData.funding_goal) / 1e7).toFixed(2)} XLM</div>
            </div>
            <div className="pt-3 border-t border-black/5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Community Votes</div>
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-2xl font-bold text-green-600">{Number(reviewData.yes_votes)}</span>
                  <span className="text-xs text-zinc-400 ml-1">Yes</span>
                </div>
                <div>
                  <span className="text-2xl font-bold text-red-600">{Number(reviewData.no_votes)}</span>
                  <span className="text-xs text-zinc-400 ml-1">No</span>
                </div>
                <div className="ml-auto text-sm text-zinc-500">
                  {Number(reviewData.yes_votes) + Number(reviewData.no_votes) > 0
                    ? `${Math.round((Number(reviewData.yes_votes) / (Number(reviewData.yes_votes) + Number(reviewData.no_votes))) * 100)}% approval`
                    : 'No votes yet'}
                </div>
              </div>
            </div>
            {reviewData.approved && (
              <div className="pt-3 border-t border-black/5">
                <span className="badge badge-success">Already Approved</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <div className="text-[11px] font-bold uppercase tracking-widest mb-4">Approve Application</div>
        <form onSubmit={handleApproveApplication} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest mb-2">Founder Address</label>
            <input
              type="text"
              value={approveAddress}
              onChange={(e) => setApproveAddress(e.target.value)}
              className="form-input font-mono text-sm"
              placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={approveApplicationMutation.isPending} className="btn btn-primary flex-1 py-3">
              {approveApplicationMutation.isPending ? 'Approving...' : 'Approve Application'}
            </button>
            {reviewAddress && (
              <button type="button" onClick={() => setApproveAddress(reviewAddress)} className="btn btn-outline px-4 py-3 text-xs">
                Use Reviewed
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { title: 'Community Driven', desc: 'Approve based on community votes and project quality' },
          { title: 'Decentralized Funding', desc: 'VCs invest directly — no admin control over funds' },
          { title: 'Transparent Process', desc: 'All approvals recorded on the blockchain' },
        ].map((item) => (
          <div key={item.title} className="card">
            <div className="text-[11px] font-bold uppercase tracking-widest mb-2">{item.title}</div>
            <p className="text-xs text-zinc-500 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
