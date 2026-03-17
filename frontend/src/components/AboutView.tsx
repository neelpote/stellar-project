export const AboutView = () => {
  const steps = [
    {
      n: '01',
      title: 'Founders Apply',
      body: 'Submit your startup with a project description, team background, and funding goal. All metadata is pinned to IPFS — only a content hash lives on-chain, keeping costs near zero. Applications open a 30-day community voting window immediately.',
    },
    {
      n: '02',
      title: 'Community Votes',
      body: 'Any Stellar wallet holder can vote Yes or No on any open application. One vote per wallet, enforced on-chain. Votes are public and immutable — no backroom deals, no hidden tallies. The approval percentage is visible to everyone in real time.',
    },
    {
      n: '03',
      title: 'VCs Invest Directly',
      body: 'Verified VCs stake 1000 XLM to join the network — no admin approval, no whitelist. Once staked, they can invest any amount into any listed startup. Funds are held in the smart contract and released to founders on claim.',
    },
    {
      n: '04',
      title: 'Founders Claim Funds',
      body: 'Invested funds accumulate in the contract and are claimable at any time. Founders pull funds directly to their wallet with a single transaction. No intermediary, no delay, no fee beyond the Stellar network base fee.',
    },
  ];

  const features = [
    {
      title: 'Zero Intermediaries',
      body: 'Every step — application, voting, investment, and payout — happens directly between participants via smart contract. No platform takes a cut. No gatekeeper decides who gets funded.',
    },
    {
      title: 'On-Chain Governance',
      body: 'Voting is enforced by the Soroban contract, not by a backend server. Votes cannot be deleted, altered, or censored. The tally is computed from raw on-chain state.',
    },
    {
      title: 'IPFS Metadata',
      body: 'Project descriptions, team info, and URLs are stored on IPFS via Pinata. The contract stores only the CID — a 46-character hash — reducing on-chain storage costs by over 95%.',
    },
    {
      title: 'Native XLM',
      body: 'All staking and investment uses Stellar\'s native XLM token. No custom token, no trustlines, no bridge. Anyone with a Stellar wallet can participate immediately.',
    },
    {
      title: 'Rust Smart Contract',
      body: 'The contract is written in Rust using the Soroban SDK. Concrete return types replace all Option<T> to avoid XDR parsing issues. All state is stored in instance storage with explicit keys.',
    },
    {
      title: 'Open Source',
      body: 'The full contract and frontend are public on GitHub. Anyone can read the code, verify the logic, fork the project, or propose improvements via pull request.',
    },
  ];

  const stack = [
    {
      label: 'Smart Contract',
      items: ['Rust + Soroban SDK', 'Stellar Testnet', 'Instance storage', 'No Option<T> returns'],
    },
    {
      label: 'Frontend',
      items: ['React 18 + TypeScript', 'Vite + Tailwind CSS', 'React Query', 'Freighter Wallet API'],
    },
    {
      label: 'Infrastructure',
      items: ['IPFS via Pinata', 'Stellar Horizon API', 'Soroban RPC', 'Vercel Hosting'],
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-16">

      {/* Hero */}
      <div className="space-y-4">
        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">About DeCo</div>
        <h1 className="text-6xl font-bold tracking-tighter leading-[0.9]">
          Decentralized<br />
          <span className="italic font-serif font-light">Combinator</span>
        </h1>
        <p className="text-xl text-zinc-500 max-w-2xl leading-relaxed">
          DeCo is a fully on-chain startup accelerator built on Stellar Soroban. No platform fees,
          no gatekeepers, no opaque decisions. Founders apply, communities vote, VCs invest — all
          enforced by a single Rust smart contract.
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-px bg-black/10">
        {[
          { value: '0%', label: 'Platform Fees' },
          { value: '30 Days', label: 'Voting Period' },
          { value: '1000 XLM', label: 'VC Stake' },
          { value: '95%', label: 'Storage Savings' },
        ].map(s => (
          <div key={s.label} className="bg-white p-6 text-center">
            <div className="text-3xl font-bold tracking-tighter mb-1">{s.value}</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Mission */}
      <div className="space-y-4">
        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">Mission</div>
        <h2 className="text-3xl font-bold tracking-tighter">Merit over connections</h2>
        <div className="space-y-4 text-zinc-600 leading-relaxed max-w-3xl">
          <p>
            Traditional accelerators are closed systems. A small committee decides who gets in,
            what terms they receive, and how funds are released. The process is opaque, slow, and
            geographically biased toward a handful of cities.
          </p>
          <p>
            DeCo replaces that committee with code. The smart contract enforces every rule — who
            can apply, how votes are counted, when funds can be claimed. No human can override it,
            delay it, or take a cut from it.
          </p>
          <p>
            The result is a funding pipeline that is open to any founder with a Stellar wallet,
            evaluated by any community member who wants to participate, and funded by any VC willing
            to stake their reputation and capital on-chain.
          </p>
        </div>
      </div>

      {/* How it works */}
      <div className="space-y-8">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 mb-2">Process</div>
          <h2 className="text-3xl font-bold tracking-tighter">How DeCo works</h2>
        </div>
        <div className="space-y-px bg-black/10">
          {steps.map(s => (
            <div key={s.n} className="bg-white p-8 flex gap-8">
              <div className="text-[11px] font-bold tracking-widest text-zinc-300 shrink-0 w-8 pt-0.5">{s.n}</div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-widest mb-2">{s.title}</div>
                <p className="text-sm text-zinc-600 leading-relaxed max-w-2xl">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="space-y-8">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 mb-2">Features</div>
          <h2 className="text-3xl font-bold tracking-tighter">What makes it different</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-black/10">
          {features.map(f => (
            <div key={f.title} className="bg-white p-8">
              <div className="text-[11px] font-bold uppercase tracking-widest mb-3">{f.title}</div>
              <p className="text-sm text-zinc-600 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Who it's for */}
      <div className="space-y-8">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 mb-2">Participants</div>
          <h2 className="text-3xl font-bold tracking-tighter">Built for three groups</h2>
        </div>
        <div className="grid grid-cols-3 gap-px bg-black/10">
          {[
            {
              role: 'Founders',
              points: [
                'Apply with a single transaction',
                'No geographical restrictions',
                'Funding goal set by you',
                'Claim funds at any time',
                'Full metadata on IPFS',
              ],
            },
            {
              role: 'VCs',
              points: [
                'Stake once, invest in any startup',
                'No admin approval to join',
                'Full portfolio visibility on-chain',
                'Invest any amount you choose',
                'Withdraw stake when done',
              ],
            },
            {
              role: 'Community',
              points: [
                'Vote on any open application',
                'One vote per wallet, enforced',
                'See all votes in real time',
                'Shape which projects get funded',
                'No token required to vote',
              ],
            },
          ].map(g => (
            <div key={g.role} className="bg-white p-8">
              <div className="text-[11px] font-bold uppercase tracking-widest mb-4">{g.role}</div>
              <ul className="space-y-2">
                {g.points.map(p => (
                  <li key={p} className="flex gap-2 text-sm text-zinc-600">
                    <span className="text-black font-bold shrink-0">—</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Tech stack */}
      <div className="space-y-8">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 mb-2">Technology</div>
          <h2 className="text-3xl font-bold tracking-tighter">Stack</h2>
        </div>
        <div className="grid grid-cols-3 gap-px bg-black/10">
          {stack.map(s => (
            <div key={s.label} className="bg-white p-8">
              <div className="text-[11px] font-bold uppercase tracking-widest mb-4">{s.label}</div>
              <ul className="space-y-2">
                {s.items.map(i => (
                  <li key={i} className="flex gap-2 text-sm text-zinc-600">
                    <span className="text-black font-bold shrink-0">—</span>
                    {i}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Security */}
      <div className="space-y-6">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 mb-2">Security</div>
          <h2 className="text-3xl font-bold tracking-tighter">Trust model</h2>
        </div>
        <div className="space-y-px bg-black/10">
          {[
            {
              title: 'No Option<T> in contract returns',
              body: 'All read functions return concrete structs with an exists: bool field. This eliminates the XDR union parsing errors that plagued earlier SDK versions and makes every response predictable.',
            },
            {
              title: 'Auth enforced on every write',
              body: 'Every state-changing function calls require_auth() on the relevant signer. The contract cannot be manipulated by a third party — only the wallet that owns the action can trigger it.',
            },
            {
              title: 'Funds held in contract, not admin wallet',
              body: 'Staked XLM and invested funds are held by the contract address itself. The admin has no ability to withdraw or redirect funds. Only the rightful founder can claim their allocation.',
            },
            {
              title: 'Open source and auditable',
              body: 'The full Rust source is on GitHub. Anyone can read it, compile it, and verify the deployed wasm hash matches the source. There are no hidden functions or upgrade keys.',
            },
          ].map(s => (
            <div key={s.title} className="bg-white p-8 flex gap-8">
              <div className="shrink-0 w-1.5 bg-black self-stretch" />
              <div>
                <div className="text-[11px] font-bold uppercase tracking-widest mb-2">{s.title}</div>
                <p className="text-sm text-zinc-600 leading-relaxed max-w-2xl">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="border border-black p-12 flex flex-col md:flex-row items-center justify-between gap-8">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 mb-2">Get Started</div>
          <h2 className="text-3xl font-bold tracking-tighter">Ready to participate?</h2>
          <p className="text-zinc-500 mt-2 max-w-md">
            Connect your Freighter wallet and apply as a founder, stake to become a VC, or vote on
            open applications. Everything runs on Stellar Testnet.
          </p>
        </div>
        <div className="flex flex-col gap-3 shrink-0">
          <a
            href="https://github.com/neelpote/deco-stellar-accelerator"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary px-8 py-3"
          >
            View on GitHub →
          </a>
          <a
            href="https://stellar.org"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline px-8 py-3"
          >
            Learn About Stellar
          </a>
        </div>
      </div>

    </div>
  );
};
