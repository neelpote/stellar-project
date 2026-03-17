<div align="center">

```
██████╗ ███████╗ ██████╗ ██████╗
██╔══██╗██╔════╝██╔════╝██╔═══██╗
██║  ██║█████╗  ██║     ██║   ██║
██║  ██║██╔══╝  ██║     ██║   ██║
██████╔╝███████╗╚██████╗╚██████╔╝
╚═════╝ ╚══════╝ ╚═════╝ ╚═════╝
```

**Decentralized Combinator**

*A fully on-chain startup accelerator built on Stellar Soroban*

[![Live Demo](https://img.shields.io/badge/Live%20Demo-frontend--eight--navy--19.vercel.app-black?style=flat-square)](https://frontend-eight-navy-19.vercel.app)
[![Network](https://img.shields.io/badge/Network-Stellar%20Testnet-black?style=flat-square)](https://stellar.org)
[![Built with Rust](https://img.shields.io/badge/Contract-Rust%20%2B%20Soroban-black?style=flat-square)](https://soroban.stellar.org)
[![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript-black?style=flat-square)](https://react.dev)
[![License](https://img.shields.io/badge/License-MIT-black?style=flat-square)](LICENSE)

</div>

---

## What is DeCo?

DeCo replaces the traditional accelerator model — gatekeepers, opaque decisions, equity grabs — with a transparent, permissionless system running entirely on-chain.

Founders apply. The community votes. VCs invest. Funds vest through milestones. No middlemen. No trust required.

---

## How it works

```
  FOUNDER                COMMUNITY               VC
    │                       │                    │
    │  apply()              │                    │
    │──────────────────────▶│                    │
    │                       │  vote() × 30 days  │
    │                       │◀───────────────────│
    │                       │                    │
    │                       │   vc_invest()      │
    │◀──────────────────────────────────────────│
    │                       │                    │
    │  vote_milestone()     │                    │
    │◀──────────────────────────────────────────│
    │                       │                    │
    │  release_milestone()  │                    │
    │──────────────────────▶│                    │
```

1. **Founder applies** — project metadata stored on IPFS, only a hash goes on-chain
2. **Community votes** — 30-day open voting window, any Stellar wallet can participate
3. **VCs invest** — stake 1000 XLM once to become verified, then invest in any startup
4. **Milestones vest** — funds held in escrow, released tranche-by-tranche as VCs approve progress

---

## Features

### Smart Contract
- Community governance voting with 30-day windows
- Permissionless VC staking — no admin whitelist
- Optional milestone-based escrow vesting
- Direct fund release for non-milestone startups
- IPFS metadata — only a CID stored on-chain
- Native XLM — no custom token, no trustlines

### Frontend
- Freighter wallet integration
- React Query for all RPC calls — no rate limiting issues
- Live vote tallies and milestone progress
- VC milestone voting UI with approve/reject
- Founder dashboard with real-time escrow status
- Black/white design system, sharp corners, no gradients

---

## Contract

| Field | Value |
|---|---|
| Network | Stellar Testnet |
| Contract ID | `CDEIL2ZNURMZP66QIWTLZ5SPG4MDVT6UFWTPLSDE6B2R3N6UJEMV7KND` |
| Admin | `GDKIJJIKXLOM2NRMPNQZUUYK24ZPVFC6426GZAEP3KUK6KEJLACCWNMX` |
| XLM Token | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |
| VC Stake | 1000 XLM |
| Voting Period | 30 days |

[View on Stellar Expert →](https://stellar.expert/explorer/testnet/contract/CDEIL2ZNURMZP66QIWTLZ5SPG4MDVT6UFWTPLSDE6B2R3N6UJEMV7KND)

---

## Contract Interface

```rust
// ── Setup ─────────────────────────────────────────────────────────────────────
init(admin: Address, vc_stake_required: i128)

// ── Founder ───────────────────────────────────────────────────────────────────
apply(founder: Address, ipfs_cid: String, funding_goal: i128,
      milestone_enabled: bool, total_milestones: u32)

claim_funds(founder: Address, xlm_token: Address)
release_milestone(founder: Address, xlm_token: Address)

// ── Community ─────────────────────────────────────────────────────────────────
vote(voter: Address, founder: Address, vote_yes: bool)

// ── VC ────────────────────────────────────────────────────────────────────────
stake_to_become_vc(vc: Address, company_name: String, xlm_token: Address)
vc_invest(vc: Address, founder: Address, amount: i128, xlm_token: Address)
vote_milestone(vc: Address, founder: Address, approve: bool)

// ── Admin ─────────────────────────────────────────────────────────────────────
approve_application(admin: Address, founder: Address)

// ── Read ──────────────────────────────────────────────────────────────────────
get_startup_status(founder: Address) -> StartupData
get_vc_data(vc: Address) -> VCData
get_all_startups() -> Vec<Address>
get_all_vcs() -> Vec<Address>
has_voted(voter: Address, founder: Address) -> bool
has_voted_milestone(vc: Address, founder: Address, milestone: u32) -> bool
get_vc_investment(vc: Address, founder: Address) -> i128
get_startup_investors(founder: Address) -> Vec<Address>
get_milestone_vote_tally(founder: Address) -> (u32, u32)
```

---

## Project Structure

```
deco-stellar-accelerator/
├── contract/
│   ├── src/
│   │   ├── lib.rs          # Full contract implementation
│   │   └── test.rs         # 9 unit tests
│   └── Cargo.toml
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── FounderView.tsx       # Apply + milestone release
    │   │   ├── VCView.tsx            # Stake + invest + milestone vote
    │   │   ├── PublicVotingView.tsx  # Community voting
    │   │   ├── PublicStartupDirectory.tsx
    │   │   ├── AdminView.tsx
    │   │   └── AboutView.tsx
    │   ├── hooks/
    │   │   ├── useStartupStatus.ts
    │   │   ├── useIPFSMetadata.ts
    │   │   └── useWallet.ts
    │   ├── stellar.ts        # All RPC read functions
    │   ├── config.ts         # Contract addresses + env
    │   ├── types.ts          # TypeScript interfaces
    │   └── ipfs.ts           # Pinata upload
    └── package.json
```

---

## Local Setup

### Prerequisites

```bash
# Rust + wasm target
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown

# Stellar CLI
cargo install --locked stellar-cli

# Node.js 18+
node --version
```

### Run the contract tests

```bash
cargo test --manifest-path contract/Cargo.toml
```

### Build + deploy the contract

```bash
# Build
cargo build --manifest-path contract/Cargo.toml \
  --target wasm32-unknown-unknown --release

# Deploy
stellar contract deploy \
  --wasm contract/target/wasm32-unknown-unknown/release/deco_mvp.wasm \
  --source <YOUR_SECRET_KEY> \
  --network testnet

# Init
stellar contract invoke --id <CONTRACT_ID> \
  --source <YOUR_SECRET_KEY> --network testnet \
  -- init \
  --admin <ADMIN_PUBLIC_KEY> \
  --vc_stake_required 10000000000
```

### Run the frontend

```bash
cd frontend
npm install
cp .env.example .env   # fill in your contract ID + Pinata keys
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Environment variables

```env
VITE_CONTRACT_ID=CDEIL2ZNURMZP66QIWTLZ5SPG4MDVT6UFWTPLSDE6B2R3N6UJEMV7KND
VITE_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
VITE_HORIZON_URL=https://horizon-testnet.stellar.org
VITE_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
VITE_XLM_TOKEN_CONTRACT=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
VITE_PINATA_JWT=your_pinata_jwt          # optional — falls back to local storage
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contract | Rust, soroban-sdk |
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS |
| Data Fetching | TanStack React Query |
| Wallet | Freighter |
| Metadata | IPFS via Pinata |
| Hosting | Vercel |
| Network | Stellar Testnet |

---

## Milestone Vesting Flow

When a founder enables milestone vesting at apply time:

```
VC invests 3000 XLM  →  held in contract escrow
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
         Milestone 1     Milestone 2     Milestone 3
         1000 XLM        1000 XLM        1000 XLM
              │               │               │
         VCs vote        VCs vote        VCs vote
         approve         approve         approve
              │               │               │
         founder gets    founder gets    founder gets
         1000 XLM        1000 XLM        1000 XLM
```

- Each tranche = `total_invested / total_milestones`
- Last tranche releases all remaining funds (no dust locks)
- Majority vote required: `approve_count * 2 > total_investors`
- Founder dashboard shows live vote tally before release is enabled

---

## Roadmap

- [x] Founder application + IPFS metadata
- [x] 30-day community governance voting
- [x] Permissionless VC staking
- [x] Direct investment (non-milestone)
- [x] Milestone-based escrow vesting
- [x] VC milestone voting UI
- [x] Live vote tally before release
- [ ] Multi-sig admin
- [ ] VC reputation scoring
- [ ] Mainnet deployment (post-audit)

---

## Contributing

```bash
git checkout -b feature/your-feature
git commit -m "add: your feature"
git push origin feature/your-feature
# open a pull request
```

---

<div align="center">

Built on [Stellar Soroban](https://soroban.stellar.org) · [Live App](https://frontend-eight-navy-19.vercel.app) · [GitHub](https://github.com/neelpote/deco-stellar-accelerator)

</div>
