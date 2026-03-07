# DeCo - Decentralized Combinator

A production-ready decentralized startup accelerator built on Stellar Soroban blockchain with professional Web3 design.

## 🚀 Live Demo
- **Frontend**: https://frontend-eight-navy-19.vercel.app
- **Contract**: `CBL6M6NXHSQJ6CJYIMV6FNEBNK3IRWLNQOFEM76FFGR6VGBRVXAPUA2V` (Stellar Testnet)
- **Native XLM Token**: `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`

## 📋 Overview

DeCo is a fully decentralized accelerator platform that enables:
- **Founders** to apply for funding with IPFS-stored metadata
- **Community** to vote on applications through DAO governance
- **VCs** to stake tokens and invest directly in approved startups
- **Admins** to oversee approvals based on community votes

## ✨ Key Features

### Smart Contract Features
- **DAO Voting System**: 7-day public voting period for each application
- **Decentralized VC Staking**: VCs stake 1000 XLM to become verified (no admin approval)
- **Direct Investment**: VCs invest directly in approved startups
- **Milestone-Based Funding**: Progressive fund release based on milestones
- **IPFS Integration**: Metadata stored on IPFS for 95% storage reduction
- **Native XLM**: Uses native XLM tokens (no trustlines needed)

### Frontend Features
- **Professional UI**: Clean, modern SaaS design inspired by Web3 platforms
- **Wallet Integration**: Seamless Freighter wallet connection
- **React Query**: All RPC calls optimized to prevent rate-limiting
- **Real-time Updates**: Live voting results and funding status
- **Mobile Responsive**: Fully responsive design for all devices
- **Transaction Feedback**: Clear success/error notifications

### Security Features
- **Reentrancy Guards**: Protection on all fund movements
- **Checked Math**: Overflow/underflow protection
- **Authorization Checks**: Role-based access control
- **Emergency Pause**: Circuit breaker mechanism
- **Sybil Resistance**: Minimum balance requirement for voting

## 📱 Screenshots

### Desktop View
![DeCo Desktop](https://via.placeholder.com/800x450/2563eb/ffffff?text=DeCo+Desktop+View)

### Mobile View
![DeCo Mobile](https://via.placeholder.com/375x667/2563eb/ffffff?text=DeCo+Mobile+View)

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│              DeCo Platform                      │
├─────────────────────────────────────────────────┤
│                                                 │
│  Frontend (React + TypeScript)                  │
│  ├── Wallet Context (Freighter)                │
│  ├── React Query (RPC Optimization)            │
│  └── Professional UI Components                │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  Stellar Soroban Smart Contract (Rust)          │
│  ├── Application Management                    │
│  ├── DAO Voting System                         │
│  ├── VC Staking & Investment                   │
│  └── Fund Distribution                         │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  External Services                              │
│  ├── IPFS (Pinata) - Metadata Storage          │
│  ├── Stellar Horizon - RPC & Transactions      │
│  └── Freighter - Wallet & Signing              │
│                                                 │
└─────────────────────────────────────────────────┘
```

## 📊 Contract Information

### Smart Contract Details
- **Network**: Stellar Testnet
- **Contract Address**: `CBL6M6NXHSQJ6CJYIMV6FNEBNK3IRWLNQOFEM76FFGR6VGBRVXAPUA2V`
- **Admin Address**: `GAZ27SJ7YFLUGO2O4JCTOWLNNXQZ5C7H5A7WFWEBALT6F6JELKJKNV44`
- **Deployment**: [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CBL6M6NXHSQJ6CJYIMV6FNEBNK3IRWLNQOFEM76FFGR6VGBRVXAPUA2V)

### Token Configuration
- **Native XLM Token**: `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`
- **Application Fee**: 10 XLM
- **VC Stake Required**: 1000 XLM
- **Voting Period**: 7 days

### Inter-Contract Calls
- **XLM Token Contract**: Native token transfers for staking, investments, and claims
- **IPFS (Pinata)**: Decentralized metadata storage
- **Stellar Horizon**: Account queries and transaction monitoring

## 🔧 Tech Stack

### Smart Contract
- **Language**: Rust
- **Framework**: soroban-sdk 21.7.0
- **Network**: Stellar Soroban (Testnet)

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: @tanstack/react-query
- **Web3**: @stellar/stellar-sdk, @stellar/freighter-api
- **Storage**: IPFS via Pinata

### DevOps
- **CI/CD**: GitHub Actions
- **Deployment**: Vercel
- **Version Control**: Git/GitHub

## 🚀 Getting Started

### Prerequisites

1. **Rust & Soroban CLI**
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   rustup target add wasm32-unknown-unknown
   cargo install --locked soroban-cli
   ```

2. **Node.js** (v18+)
   ```bash
   # Download from https://nodejs.org/
   node --version  # Should be v18 or higher
   ```

3. **Freighter Wallet**
   - Install: https://www.freighter.app/
   - Switch to Testnet in settings
   - Fund account: https://laboratory.stellar.org/#account-creator?network=test

### Smart Contract Deployment

#### 1. Build the Contract

```bash
cd contract
soroban contract build
```

#### 2. Deploy to Testnet

```bash
# Generate admin identity (first time only)
soroban keys generate admin --network testnet

# Deploy contract
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/deco_mvp.wasm \
  --source admin \
  --network testnet
```

Save the returned contract ID.

#### 3. Initialize the Contract

```bash
# Get admin address
ADMIN_ADDRESS=$(soroban keys address admin)

# Initialize contract
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source admin \
  --network testnet \
  -- \
  init \
  --admin $ADMIN_ADDRESS \
  --fee 100000000 \
  --vc_stake_required 10000000000
```

### Frontend Setup

#### 1. Install Dependencies

```bash
cd frontend
npm install
```

#### 2. Configure Environment

Create `frontend/.env`:

```env
VITE_CONTRACT_ID=YOUR_CONTRACT_ID_HERE
VITE_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
VITE_HORIZON_URL=https://horizon-testnet.stellar.org
VITE_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
VITE_XLM_TOKEN_ADDRESS=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
VITE_PINATA_API_KEY=your_pinata_api_key
VITE_PINATA_SECRET_KEY=your_pinata_secret_key
```

#### 3. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000

#### 4. Build for Production

```bash
npm run build
```

## 📖 Usage Guide

### For Founders

1. **Connect Wallet**: Click "Connect Wallet" and approve in Freighter
2. **Submit Application**:
   - Fill out project details (name, description, URL, team, funding goal)
   - Metadata automatically uploaded to IPFS
   - Pay 10 XLM application fee
3. **Wait for Voting**: 7-day public voting period begins
4. **Get Approved**: Admin reviews community votes and approves
5. **Receive Funding**: VCs invest directly in your startup
6. **Claim Funds**: Withdraw invested XLM to your wallet

### For Community Voters

1. **Connect Wallet**: Any Stellar wallet with XLM balance
2. **Browse Applications**: View all submitted startup applications
3. **Review Details**: Check project info, team, and funding goals
4. **Cast Vote**: Vote Yes or No during 7-day period
5. **Track Results**: See real-time vote counts and percentages

### For VCs (Venture Capitalists)

1. **Connect Wallet**: Ensure you have 1000+ XLM
2. **Stake to Verify**: 
   - Click "Become VC"
   - Enter company name
   - Stake 1000 XLM (fully decentralized, no admin approval)
3. **Browse Startups**: View all approved startups
4. **Invest Directly**: 
   - Select startup
   - Enter investment amount
   - Confirm transaction
5. **Track Portfolio**: Monitor all your investments

### For Admins

1. **Connect Admin Wallet**: Use the admin address
2. **Review Applications**:
   - View application details
   - Check community vote results
   - Review project quality
3. **Approve Applications**: Approve based on votes and merit
4. **Minimal Control**: System is fully decentralized after approval

## 🔐 Smart Contract Functions

### Core Functions

```rust
// Initialize contract
init(admin: Address, fee: i128, vc_stake_required: i128)

// Founder applies with IPFS metadata
apply(founder: Address, ipfs_cid: String, funding_goal: i128)

// Community votes on applications
vote(voter: Address, founder: Address, vote_yes: bool)

// Admin approves after reviewing votes
approve_application(admin: Address, founder: Address)

// VC stakes to become verified
stake_to_become_vc(vc_address: Address, company_name: String, xlm_token: Address)

// VC invests in approved startup
vc_invest(vc_address: Address, founder: Address, amount: i128, xlm_token: Address)

// Founder claims invested funds
claim_funds(founder: Address, xlm_token: Address)
```

### Query Functions

```rust
// Get all submitted applications
get_all_startups() -> Vec<Address>

// Get startup details and voting results
get_startup_status(founder: Address) -> StartupData

// Get VC information and stats
get_vc_data(vc_address: Address) -> VCData

// Check if address has voted
has_voted(voter: Address, founder: Address) -> bool

// Get VC stake requirement
get_vc_stake_required() -> i128

// Check if address is verified VC
is_vc(vc_address: Address) -> bool
```

## 🛡️ Security Considerations

### Smart Contract Security
- ✅ Reentrancy guards on all fund movements
- ✅ Checked math for overflow/underflow protection
- ✅ Authorization checks on sensitive functions
- ✅ Emergency pause mechanism
- ✅ Sybil resistance for voting

### Frontend Security
- ✅ Environment variables for sensitive data
- ✅ Input validation and sanitization
- ✅ Secure wallet connection via Freighter
- ✅ Transaction confirmation before signing
- ✅ Error handling and user feedback

### Deployment Security
- ⚠️ **Testnet Only**: DO NOT use on Mainnet without professional audit
- ⚠️ **Admin Keys**: Secure admin private keys properly
- ⚠️ **API Keys**: Keep Pinata API keys confidential

## 🐛 Troubleshooting

### Contract Build Issues

```bash
# Update Rust and clean build
rustup update
cd contract
cargo clean
cargo build --target wasm32-unknown-unknown --release
```

### Transaction Failures

- Ensure sufficient XLM balance for fees (minimum 1 XLM)
- Verify Freighter is connected to Testnet
- Check contract ID in `.env` file
- Confirm admin address matches deployed contract

### RPC Rate Limiting

- React Query automatically handles rate limiting
- Adjust `refetchInterval` in hooks if needed
- Use Stellar's public RPC or run your own node

### IPFS Upload Failures

- Verify Pinata API keys in `.env`
- Check Pinata account quota
- Ensure metadata is valid JSON

## 📈 Roadmap

### Phase 1: MVP (Completed ✅)
- [x] Smart contract with basic functionality
- [x] Frontend with wallet integration
- [x] DAO voting system
- [x] VC staking and investment
- [x] IPFS metadata storage

### Phase 2: Production Ready (Completed ✅)
- [x] Security improvements (reentrancy guards, checked math)
- [x] Professional UI redesign
- [x] React Query optimization
- [x] Comprehensive documentation
- [x] CI/CD pipeline

### Phase 3: Future Enhancements
- [ ] Milestone submission and verification
- [ ] Multi-signature admin control
- [ ] Analytics dashboard
- [ ] Reputation system for VCs
- [ ] Secondary market for investments
- [ ] Mainnet deployment (after audit)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Stellar Development Foundation** for Soroban smart contract platform
- **Freighter** for wallet integration
- **Pinata** for IPFS infrastructure
- **Vercel** for hosting and deployment

## 📞 Contact

- **GitHub**: [@neelpote](https://github.com/neelpote)
- **Repository**: [deco-stellar-accelerator](https://github.com/neelpote/deco-stellar-accelerator)

---

Built with ❤️ on Stellar Blockchain
