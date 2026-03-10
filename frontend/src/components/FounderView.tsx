import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import * as StellarSdk from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';
import { CONTRACT_ID, NETWORK_PASSPHRASE, TESTNET_XLM_CONTRACT } from '../config';
import { server, getAllVCs } from '../stellar';
import { useStartupStatus } from '../hooks/useStartupStatus';
import { useIPFSMetadata } from '../hooks/useIPFSMetadata';
import { uploadToIPFS } from '../ipfs';

interface FounderViewProps {
  publicKey: string;
}

export const FounderView = ({ publicKey }: FounderViewProps) => {
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [projectUrl, setProjectUrl] = useState('');
  const [teamInfo, setTeamInfo] = useState('');
  const [fundingGoal, setFundingGoal] = useState('');
  const queryClient = useQueryClient();
  const { data: startupData, isLoading } = useStartupStatus(publicKey);
  const { data: metadata, isLoading: metadataLoading } = useIPFSMetadata(startupData?.ipfs_cid);

  // Check for available VCs
  const { data: allVCs = [] } = useQuery({
    queryKey: ['allVCs'],
    queryFn: getAllVCs,
    refetchInterval: 30000,
  });

  // Safety check for valid public key
  if (!publicKey || typeof publicKey !== 'string' || publicKey.length < 50) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="text-6xl mb-4 neon-pink">⚠️</div>
          <h3 className="text-2xl font-bold cyber-subtitle mb-2">Invalid Wallet Connection</h3>
          <p className="text-cyber-text-dim">
            Please disconnect and reconnect your Freighter wallet.
          </p>
        </div>
      </div>
    );
  }

  const applyMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      desc: string;
      url: string;
      team: string;
      goal: string;
    }) => {
      try {
        console.log('Starting application submission...');
        console.log('Public key:', publicKey);
        
        // Validate public key
        if (!publicKey || typeof publicKey !== 'string') {
          throw new Error('Invalid public key: ' + publicKey);
        }
        
        // Step 1: Upload metadata to IPFS
        console.log('Uploading to IPFS...');
        const ipfsCid = await uploadToIPFS({
          project_name: data.name,
          description: data.desc,
          project_url: data.url,
          team_info: data.team,
        });
        console.log('IPFS upload successful, CID:', ipfsCid);

        // Step 2: Submit to blockchain with CID
        console.log('Getting account for:', publicKey);
        const sourceAccount = await server.getAccount(publicKey);
        console.log('Account retrieved successfully');
        
        console.log('Creating contract with ID:', CONTRACT_ID);
        const contract = new StellarSdk.Contract(CONTRACT_ID);
        console.log('Contract created successfully');

        const goalInStroops = Math.floor(parseFloat(data.goal) * 1e7);
        console.log('Funding goal in stroops:', goalInStroops);

        console.log('Creating address from public key...');
        const founderAddress = StellarSdk.Address.fromString(publicKey);
        console.log('Address created successfully');

        console.log('Creating transaction...');
        const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
          fee: StellarSdk.BASE_FEE,
          networkPassphrase: NETWORK_PASSPHRASE,
        })
          .addOperation(
            contract.call(
              'apply',
              founderAddress.toScVal(),
              StellarSdk.nativeToScVal(ipfsCid, { type: 'string' }),
              StellarSdk.nativeToScVal(BigInt(goalInStroops), { type: 'i128' })
            )
          )
          .setTimeout(30)
          .build();
        console.log('Transaction created successfully');

        console.log('Preparing transaction...');
        const prepared = await server.prepareTransaction(transaction);
        console.log('Transaction prepared successfully');
        
        const xdr = prepared.toXDR();
        console.log('Getting XDR for signing...');
        
        const signedXdr = await signTransaction(xdr, {
          networkPassphrase: NETWORK_PASSPHRASE,
        });
        console.log('Transaction signed successfully');

        const signedTx = StellarSdk.TransactionBuilder.fromXDR(
          signedXdr,
          NETWORK_PASSPHRASE
        );
        console.log('Signed transaction created from XDR');

        console.log('Submitting transaction...');
        const result = await server.sendTransaction(signedTx);
        console.log('Transaction submitted, hash:', result.hash);
        
        let status = await server.getTransaction(result.hash);
        while (status.status === 'NOT_FOUND') {
          await new Promise(resolve => setTimeout(resolve, 1000));
          status = await server.getTransaction(result.hash);
        }

        if (status.status === 'SUCCESS') {
          console.log('Transaction successful!');
          return status;
        } else {
          console.error('Transaction failed with status:', status.status);
          throw new Error('Transaction failed');
        }
      } catch (error) {
        console.error('Detailed error in applyMutation:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['startupStatus'] });
      setProjectName('');
      setDescription('');
      setProjectUrl('');
      setTeamInfo('');
      setFundingGoal('');
      alert('🎉 Application submitted successfully! Metadata stored on IPFS.');
    },
    onError: (error) => {
      console.error('Application error:', error);
      alert('❌ Failed to submit application. Please check your Pinata API keys in .env file.');
    },
  });

  const claimMutation = useMutation({
    mutationFn: async () => {
      const sourceAccount = await server.getAccount(publicKey);
      const contract = new StellarSdk.Contract(CONTRACT_ID);

      const xlmAddress = new StellarSdk.Address(TESTNET_XLM_CONTRACT);

      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          contract.call(
            'claim_funds',
            StellarSdk.Address.fromString(publicKey).toScVal(),
            xlmAddress.toScVal()
          )
        )
        .setTimeout(30)
        .build();

      const prepared = await server.prepareTransaction(transaction);
      const xdr = prepared.toXDR();
      const signedXdr = await signTransaction(xdr, {
        networkPassphrase: NETWORK_PASSPHRASE,
      });

      const signedTx = StellarSdk.TransactionBuilder.fromXDR(
        signedXdr,
        NETWORK_PASSPHRASE
      );

      const result = await server.sendTransaction(signedTx);
      
      let status = await server.getTransaction(result.hash);
      while (status.status === 'NOT_FOUND') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        status = await server.getTransaction(result.hash);
      }

      if (status.status === 'SUCCESS') {
        return status;
      } else {
        throw new Error('Transaction failed');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['startupStatus'] });
      alert('🎉 Funds claimed successfully!');
    },
    onError: (error) => {
      console.error('Claim error:', error);
      alert('❌ Failed to claim funds. Please try again.');
    },
  });

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !description.trim() || !projectUrl.trim() || !teamInfo.trim() || !fundingGoal.trim()) {
      alert('Please fill in all fields');
      return;
    }
    applyMutation.mutate({
      name: projectName,
      desc: description,
      url: projectUrl,
      team: teamInfo,
      goal: fundingGoal,
    });
  };

  const handleClaim = () => {
    claimMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="cyber-loading w-16 h-16 mx-auto mb-4"></div>
          <p className="text-cyber-text-dim text-lg">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="cyber-card p-8 mb-8 hover-glow">
        <h2 className="text-4xl font-bold cyber-title mb-2 glitch" data-text="Founder Dashboard">🚀 Founder Dashboard</h2>
        <p className="text-cyber-text-dim text-lg">
          Apply for funding, track milestones, and claim your allocated funds
        </p>
      </div>

      {!startupData ? (
        <div className="space-y-6">
          {/* Demo Mode Banner */}
      {!import.meta.env.VITE_PINATA_JWT && !import.meta.env.VITE_PINATA_API_KEY && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-yellow-400 text-xl">🎭</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Demo Mode:</strong> IPFS storage is simulated using browser storage. 
                For production use, configure Pinata IPFS credentials.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Application Form */}
          <div className="cyber-card p-8 hover-glow">
            <h3 className="text-2xl font-bold cyber-subtitle mb-4 flex items-center">
              <span className="text-3xl mr-3 neon-blue">📝</span>
              Apply to DeCo Accelerator
            </h3>
            <p className="text-cyber-text-dim mb-6">
              Submit your startup for funding consideration. Your project details will be stored on IPFS for optimal on-chain efficiency.
            </p>
            <form onSubmit={handleApply} className="space-y-6">
              <div>
                <label className="block text-cyber-text font-semibold mb-2 text-lg cyber-subtitle">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="cyber-input w-full text-lg"
                  placeholder="e.g., DeFi Protocol, NFT Marketplace"
                />
              </div>

              <div>
                <label className="block text-cyber-text font-semibold mb-2 text-lg cyber-subtitle">
                  Project Description *
                </label>
                <p className="text-sm text-cyber-text-dim mb-2">
                  Describe your project, problem you're solving, and your solution
                </p>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  className="cyber-input w-full text-lg resize-none"
                  placeholder="Tell us about your project, the problem you're solving, your unique value proposition, and why you should be funded..."
                />
              </div>

              <div>
                <label className="block text-cyber-text font-semibold mb-2 text-lg cyber-subtitle">
                  Project URL *
                </label>
                <p className="text-sm text-cyber-text-dim mb-2">
                  Link to your GitHub, pitch deck, website, or demo
                </p>
                <input
                  type="text"
                  value={projectUrl}
                  onChange={(e) => setProjectUrl(e.target.value)}
                  className="cyber-input w-full text-lg"
                  placeholder="https://github.com/yourproject or https://yourproject.com"
                />
              </div>

              <div>
                <label className="block text-cyber-text font-semibold mb-2 text-lg cyber-subtitle">
                  Team Information *
                </label>
                <p className="text-sm text-cyber-text-dim mb-2">
                  Tell us about your team, experience, and relevant background
                </p>
                <textarea
                  value={teamInfo}
                  onChange={(e) => setTeamInfo(e.target.value)}
                  rows={4}
                  className="cyber-input w-full text-lg resize-none"
                  placeholder="Founder names, roles, experience, previous projects, relevant skills..."
                />
              </div>

              <div>
                <label className="block text-cyber-text font-semibold mb-2 text-lg cyber-subtitle">
                  Funding Goal (XLM) *
                </label>
                <p className="text-sm text-cyber-text-dim mb-2">
                  How much funding are you requesting?
                </p>
                <input
                  type="number"
                  step="0.01"
                  value={fundingGoal}
                  onChange={(e) => setFundingGoal(e.target.value)}
                  className="cyber-input w-full text-lg"
                  placeholder="10000.00"
                />
              </div>

              <button
                type="submit"
                disabled={applyMutation.isPending}
                className="cyber-btn w-full px-8 py-4 text-lg font-bold hover-lift"
              >
                {applyMutation.isPending ? (
                  <span className="flex items-center justify-center">
                    <div className="cyber-loading mr-3"></div>
                    Uploading to IPFS & Submitting...
                  </span>
                ) : (
                  '🚀 Submit Application (IPFS + Blockchain)'
                )}
              </button>
            </form>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="cyber-card p-6 hover-glow hover-lift">
              <span className="text-4xl mb-3 block neon-blue">⚡</span>
              <h4 className="text-lg font-bold cyber-subtitle mb-2">Fast Application</h4>
              <p className="text-cyber-text-dim text-sm">
                Submit your application in seconds using blockchain technology
              </p>
            </div>
            <div className="cyber-card p-6 hover-glow hover-lift">
              <span className="text-4xl mb-3 block neon-green">🎯</span>
              <h4 className="text-lg font-bold cyber-subtitle mb-2">Milestone-Based</h4>
              <p className="text-cyber-text-dim text-sm">
                Receive funding progressively as you hit your milestones
              </p>
            </div>
            <div className="cyber-card p-6 hover-glow hover-lift">
              <span className="text-4xl mb-3 block neon-pink">🔐</span>
              <h4 className="text-lg font-bold cyber-subtitle mb-2">Transparent & Secure</h4>
              <p className="text-cyber-text-dim text-sm">
                All transactions are recorded on the Stellar blockchain
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Status Overview */}
          <div className="cyber-card p-8 mb-8 hover-glow hover-lift">
            <h3 className="text-2xl font-bold cyber-subtitle mb-4 flex items-center">
              <span className="text-3xl mr-3 neon-green">✅</span>
              Application Status: {startupData.approved ? 'Approved' : 'Under Review'}
            </h3>
            {metadataLoading ? (
              <div className="cyber-card p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-6 bg-cyber-surface rounded w-3/4"></div>
                  <div className="h-4 bg-cyber-surface rounded w-full"></div>
                  <div className="h-4 bg-cyber-surface rounded w-2/3"></div>
                </div>
              </div>
            ) : metadata ? (
              <div className="cyber-card p-6 space-y-4">
                <div>
                  <div className="text-sm text-cyber-text-dim mb-1 cyber-subtitle">Project Name</div>
                  <div className="text-xl font-bold text-cyber-primary">{metadata.project_name}</div>
                </div>
                <div className="pt-4 border-t border-cyber-border">
                  <div className="text-sm text-cyber-text-dim mb-1 cyber-subtitle">Description</div>
                  <p className="text-cyber-text">{metadata.description}</p>
                </div>
                <div className="pt-4 border-t border-cyber-border">
                  <div className="text-sm text-cyber-text-dim mb-1 cyber-subtitle">Project URL</div>
                  <a
                    href={metadata.project_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyber-primary hover:text-cyber-secondary font-semibold hover:underline neon-blue"
                  >
                    View Project →
                  </a>
                </div>
                <div className="pt-4 border-t border-cyber-border">
                  <div className="text-sm text-cyber-text-dim mb-1 cyber-subtitle">Team</div>
                  <p className="text-cyber-text">{metadata.team_info}</p>
                </div>
                <div className="pt-4 border-t border-cyber-border">
                  <div className="text-sm text-cyber-text-dim mb-1 cyber-subtitle">Funding Goal</div>
                  <div className="text-xl font-bold neon-green">
                    {(Number(startupData.funding_goal) / 1e7).toFixed(2)} XLM
                  </div>
                </div>
                <div className="pt-4 border-t border-cyber-border">
                  <div className="text-sm text-cyber-text-dim mb-1 cyber-subtitle">IPFS CID</div>
                  <p className="text-xs font-mono text-cyber-text-dim break-all bg-cyber-surface p-2 rounded">
                    {startupData.ipfs_cid}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-cyber-warning/20 border-2 border-cyber-warning/50 rounded-xl p-6">
                <p className="text-cyber-warning">⚠️ Unable to load project metadata from IPFS</p>
              </div>
            )}
          </div>

          {/* Funding Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="cyber-card p-6 hover-glow hover-lift">
              <div className="flex items-center justify-between mb-4">
                <span className="text-4xl neon-blue">💰</span>
                <span className="bg-cyber-primary/20 text-cyber-primary text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  ALLOCATED
                </span>
              </div>
              <div className="text-cyber-text-dim text-sm font-medium mb-1 cyber-subtitle">Total Allocated</div>
              <div className="text-3xl font-bold text-cyber-text">
                {(Number(startupData.total_allocated) / 1e7).toFixed(2)}
                <span className="text-lg text-cyber-text-dim ml-2">XLM</span>
              </div>
              <p className="text-cyber-text-dim text-xs mt-2">Your total funding pool</p>
            </div>

            <div className="cyber-card p-6 hover-glow hover-lift">
              <div className="flex items-center justify-between mb-4">
                <span className="text-4xl neon-green">🔓</span>
                <span className="bg-cyber-accent/20 text-cyber-accent text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  UNLOCKED
                </span>
              </div>
              <div className="text-cyber-text-dim text-sm font-medium mb-1 cyber-subtitle">Unlocked for Claiming</div>
              <div className="text-3xl font-bold neon-green">
                {(Number(startupData.unlocked_balance) / 1e7).toFixed(2)}
                <span className="text-lg text-cyber-text-dim ml-2">XLM</span>
              </div>
              <p className="text-cyber-text-dim text-xs mt-2">Ready to withdraw</p>
            </div>

            <div className="cyber-card p-6 hover-glow hover-lift">
              <div className="flex items-center justify-between mb-4">
                <span className="text-4xl neon-pink">✅</span>
                <span className="bg-cyber-secondary/20 text-cyber-secondary text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  CLAIMED
                </span>
              </div>
              <div className="text-cyber-text-dim text-sm font-medium mb-1 cyber-subtitle">Already Claimed</div>
              <div className="text-3xl font-bold text-cyber-text">
                {(Number(startupData.claimed_balance) / 1e7).toFixed(2)}
                <span className="text-lg text-cyber-text-dim ml-2">XLM</span>
              </div>
              <p className="text-cyber-text-dim text-xs mt-2">Funds in your wallet</p>
            </div>
          </div>

          {/* Claim Section */}
          <div className="cyber-card p-8 hover-glow">
            <h3 className="text-2xl font-bold cyber-subtitle mb-4 flex items-center">
              <span className="text-3xl mr-3 neon-green">💸</span>
              Claim Your Funds
            </h3>
            <p className="text-cyber-text-dim mb-6">
              Your application has been approved! VCs can now invest in your startup. 
              Once VCs invest, funds will be available for claiming here.
            </p>
            <div className="cyber-card p-6 mb-6 bg-gradient-to-r from-cyber-accent/10 to-cyber-primary/10 border-cyber-accent">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-cyber-text-dim mb-1 cyber-subtitle">Available to Claim</div>
                  <div className="text-3xl font-bold neon-green">
                    {(
                      (Number(startupData.unlocked_balance) -
                        Number(startupData.claimed_balance)) /
                      1e7
                    ).toFixed(2)}{' '}
                    XLM
                  </div>
                </div>
                <span className="text-5xl neon-green">💵</span>
              </div>
            </div>
            <button
              onClick={handleClaim}
              disabled={
                claimMutation.isPending ||
                Number(startupData.unlocked_balance) <=
                  Number(startupData.claimed_balance)
              }
              className="cyber-btn w-full px-8 py-4 text-lg font-bold hover-lift"
            >
              {claimMutation.isPending ? (
                <span className="flex items-center justify-center">
                  <div className="cyber-loading mr-3"></div>
                  Processing Claim...
                </span>
              ) : Number(startupData.unlocked_balance) <= Number(startupData.claimed_balance) ? (
                '⏳ No Funds Available to Claim'
              ) : (
                '💸 Claim Funds Now'
              )}
            </button>
            
            {/* Info message when no funds available */}
            {Number(startupData.unlocked_balance) <= Number(startupData.claimed_balance) && (
              <div className="mt-4 p-4 bg-cyber-primary/10 border border-cyber-primary/30 rounded-lg">
                <div className="flex items-start">
                  <span className="text-2xl mr-3 mt-1">💡</span>
                  <div>
                    <div className="font-semibold text-cyber-primary mb-2">How to Get Funds</div>
                    <div className="text-sm text-cyber-text-dim space-y-1">
                      <div>1. Your application is approved ✅</div>
                      <div>2. VCs need to invest in your startup through the VC dashboard</div>
                      <div>3. Once VCs invest, funds become available to claim here</div>
                      <div>4. Share your founder address with potential VCs: <span className="font-mono text-xs bg-cyber-surface px-2 py-1 rounded">{publicKey}</span></div>
                      <div className="pt-2 border-t border-cyber-primary/20">
                        <span className="font-semibold">VCs in system: </span>
                        <span className={allVCs.length > 0 ? "text-cyber-accent" : "text-cyber-warning"}>
                          {allVCs.length > 0 ? `${allVCs.length} verified VCs available` : "No VCs registered yet"}
                        </span>
                      </div>
                      <div className="pt-3 border-t border-cyber-primary/20">
                        <button
                          onClick={() => {
                            // Navigate to VC view
                            const event = new CustomEvent('navigate-to-vc');
                            window.dispatchEvent(event);
                          }}
                          className="w-full px-4 py-2 bg-cyber-secondary/20 text-cyber-secondary border border-cyber-secondary rounded-lg hover:bg-cyber-secondary/30 font-medium text-sm transition-all"
                        >
                          💼 Become a VC & Invest in Startups
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
