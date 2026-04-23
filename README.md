# DeCo — Decentralized Combinator

A startup accelerator built on Stellar Soroban. No middlemen, no committees, no fees.

**Live app:** https://frontend-eight-navy-19.vercel.app  
**Contract:** `CDEIL2ZNURMZP66QIWTLZ5SPG4MDVT6UFWTPLSDE6B2R3N6UJEMV7KND`  
**Network:** Stellar Testnet  
**GitHub:** https://github.com/neelpote/deco-combinator

---

## What is this

DeCo lets founders apply for funding, lets the community vote on applications, and lets VCs invest directly — all through a Rust smart contract on Stellar. No platform takes a cut. No one can override the rules.

I built this because traditional accelerators are closed. A small group decides who gets in, the process is opaque, and geography matters more than it should. With DeCo, the contract is the only authority.

---

## How it works

Founders submit their project details. The metadata goes to IPFS and only a hash is stored on-chain. A 30-day voting window opens automatically.

Anyone with a Stellar wallet can vote yes or no. One vote per wallet, enforced by the contract.

VCs stake 1000 XLM to join — no admin approval needed. After staking they can invest in any startup. Founders can either take funds directly or set up milestone-based vesting where funds release in tranches as VCs approve progress.

---

## Tech stack

- Smart contract: Rust + Soroban SDK on Stellar Testnet
- Frontend: React + TypeScript + Vite
- Styling: Tailwind CSS
- Wallet: Freighter
- Metadata: IPFS via Pinata
- Database: Supabase (analytics + chat)
- Hosting: Vercel

---

## Contract details

| | |
|---|---|
| Contract ID | `CDEIL2ZNURMZP66QIWTLZ5SPG4MDVT6UFWTPLSDE6B2R3N6UJEMV7KND` |
| Admin | `GDKIJJIKXLOM2NRMPNQZUUYK24ZPVFC6426GZAEP3KUK6KEJLACCWNMX` |
| XLM Token | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |
| VC Stake Required | 1000 XLM |
| Voting Period | 30 days |

[View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CDEIL2ZNURMZP66QIWTLZ5SPG4MDVT6UFWTPLSDE6B2R3N6UJEMV7KND)

---

## Running locally

You need Rust, Node 18+, and the Stellar CLI installed.

```bash
# Run contract tests
cargo test --manifest-path contract/Cargo.toml

# Run frontend
cd frontend
npm install
cp .env.example .env
npm run dev
```

Environment variables needed:

```
VITE_CONTRACT_ID=CDEIL2ZNURMZP66QIWTLZ5SPG4MDVT6UFWTPLSDE6B2R3N6UJEMV7KND
VITE_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
VITE_HORIZON_URL=https://horizon-testnet.stellar.org
VITE_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
VITE_XLM_TOKEN_CONTRACT=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
```

---

## Security

Full security review is in [SECURITY.md](SECURITY.md). The short version:

- Every state-changing function calls `require_auth()` on the signer
- Funds are held by the contract address, not an admin wallet
- No upgrade mechanism — contract is immutable once deployed
- Frontend never touches private keys, all signing goes through Freighter
- Supabase RLS enabled on all tables

---

## Monitoring Dashboard

The metrics dashboard is live inside the app — hit the Metrics tab after opening the app. It shows daily active wallets, total sessions, on-chain startup and VC counts, messages sent, and a 7-day DAU chart. Updates every 30 seconds from Supabase.

Vercel handles deployment monitoring (uptime, build logs, function errors).

---

## Data Indexing

Two layers:

**On-chain via Soroban RPC** — all core state (startups, VCs, votes, investments, milestones) is read directly from the contract. No indexer needed for the main flows.

**Off-chain via Supabase** — three tables track social and analytics data:

| Table | What it stores |
|---|---|
| `wallet_sessions` | One row per wallet per day, used for DAU |
| `page_events` | Feature usage events (apply, invest, vote, stake) |
| `messages` | Founder ↔ VC direct messages |

Supabase project: `https://cmitzlpyzkehsnshuhxl.supabase.co`

---

## User Feedback

Feedback collected via Google Form from real users who tested the app.

**[View form responses](https://docs.google.com/spreadsheets/d/1hsT7-U5rW9-prYaEd7xFJ3QcrYO-N1i27WeDCymYJ7k/edit?usp=sharing)**

### Table 1 — All Users (5 from Level 5 + 25 from Level 6)

| User Name | User Email | User Wallet Address | User Feedback |
|-----------|------------|---------------------|---------------|
| Karan Malhotra *(L5)* | karan.malhotra.blr@gmail.com | `GBASPEHFT2Z6ANA5HBKJSAJXQR3NKTBG6L7U4FIKXBT7NR6YTDAG27SM` | No notification when a VC invests in your startup |
| Priya Nair *(L5)* | priya.nair.mum@gmail.com | `GAEJZTWGMZCDGYWOSOVEVT5XTP6WHAK2GLJLG57ZUCJRKHTD4BOVOBF3` | Metrics tab shows DAU but no weekly or monthly trend |
| Rahul Gupta *(L5)* | rahul.gupta.del@gmail.com | `GBFMIBZ4NFYE4Y5FDHZTGMCZ2QVRPUSQUBNVWBOT2AKE5XAQGDNIZZPI` | Voter entry |
| Kavya Reddy *(L5)* | kavya.reddy.hyd@gmail.com | `GCIYAHMBKQEV7RR7HZBRBNAEPMRJYAYRSTX6BXL3W6HKSWSQZXSQSMG6` | Mobile layout breaks on the VC dashboard |
| Nisha Agarwal *(L5)* | nisha.agarwal.pune@gmail.com | `GCBABJJ5V3KOO6KFOE2KY3YHPBOZT6NIO57MMXZ3XRT3KDXQBN55D7NL` | N/A |
| Rahul Desai | rahul.desai.dev@gmail.com | `GDR3PZAVF33YOH63PZUJNYM6YSQG6LYW2GYJT62CV7OCCAD634HDDNA2` | Submission portal goes blank for a second |
| Sneha Kulkarni | sneha.kulkarni.web3@gmail.com | `GAAHDEV3ZYDI2ZJUCGFKADKFS7V4M2BANFHTOOZ6VW64ZRPDNC2A6CSN` | No way to see all startups you've voted on |
| Mihail Popescu | mihail.popescu.ro@gmail.com | `GAYYMURQCKEXJ2JM4VW5QAQ7VUJFET5GKXVYQNG5K6ENAZPR5H46HVIY` | Just fix the submit bug |
| Tanvi Bhatt | tanvi.bhatt.stellar@gmail.com | `GBCB3XXG4ZGZ5MRNY2WB7N4A6NMKU27YA4UZLAUKOK5BBHMNONONRRLMI` | Nope |
| James Okafor | james.okafor.ng@gmail.com | `GABF4LPTE2KW24XX457KRBV72SQG3WVVMFAFWXG2DL3PN7XD2XX6BEJ4` | Voting page shows "Voting Closed" but doesn't explain what happens next |
| Divya Menon | divya.menon.blr@gmail.com | `GAFOVWKIF5EEFEXRUSOPJQ3ZJ7UCPHS6ICRAGRAD63OLFFLMQ2IYXF32` | Add a back button in about section |
| Siddharth Rao | siddharth.rao.hyd@gmail.com | `GD3FCM2X25AA56AL62P27R3XOD35U67ASXIW2PZATTMVYD7WWSCLPSGO` | Founder entry |
| Fatima Al-Rashid | fatima.alrashid.uae@gmail.com | `GC2AR3REV6HSXC2IASQZAQ5VJXTCT766COG7A7UHR5ZUSJK7EXKNLNNS` | Voter entry |
| Luca Ferretti | luca.ferretti.milan@gmail.com | `GB6KQMHTV4VKZRW4ZQYQKRJXOL7VNAEAXT2HIO7FFG7MAGTZ7R6VWECQ` | Great! |
| Ananya Singh | ananya.singh.del@gmail.com | `GC4RCWZ62EH6G36B3SNVTSBIBDY4FRYIRY4AHITUE3H6LNH776HN3XYD` | N/A |
| Kwame Asante | kwame.asante.gh@gmail.com | `GBSFO3XICLUTMFSGW6WGEBMF4VSLW4LDWEFU3QY4WSHDAOVLJDGEZLKF` | Simple works best |
| Pooja Iyer | pooja.iyer.chennai@gmail.com | `GDQG5X6K3RGGSNHOOXHLTTHVJBFDFUTUOH77BT7DUBEQXNQJUULG4GJO` | VC browse list only shows 6 startups, rest are hidden with no show more |
| Yusuf Adeyemi | yusuf.adeyemi.lag@gmail.com | `GCWCQ327OQF73WQQZVDGNAIHHUEZ3EC22XB2MZAH4IBGEBQVKEJTSOQC` | Voter entry |
| Riya Sharma | riya.sharma.jpr@gmail.com | `GDC4GCUMIB5U2XTEB42FRGBOJCSGFPBE3R25EEUCEA7MN2PD2PRFY332` | Nope |
| Aryan Mehta | aryan.mehta.surat@gmail.com | `GB7F4YVEMREOBONP7UYHKR7RCSID6EVBTDELO5I6EEYNC7MNVP2CTM7D` | Funding goal input has no validation, someone could enter 0 |
| Aiko Tanaka | aiko.tanaka.tokyo@gmail.com | `GAMLGYUBK6PB327WY5QIE5RHRFUFNS56G4EXLW43DCGJTCID4T2KOBTF` | Milestone toggle has no explanation of what it means until you turn it on |
| Carlos Mendoza | carlos.mendoza.mx@gmail.com | `GDOLFVKYH3UD3U36HM7X5EGQIWXPSWHVEWVK3DVZBU26W3IG2KUDQPPS` | After voting, the page just shows an alert popup |
| Priya Nambiar | priya.nambiar.kochi@gmail.com | `GCG4PH5CNRVFDUVI676PFN5ZQ7CWLQPQFUEN5ATWQJFUZ6QKLMGN5FIA` | I wasn't able to submit (check console) |
| Oluwaseun Adebayo | oluwaseun.adebayo.abj@gmail.com | `GCUV4EU3MFNV467W7TT6GT6GT4XLUSX7ENHDROPEQXQG24FK4VFX6RYK` | Voter entry |
| Sofia Andreou | sofia.andreou.ath@gmail.com | `GDC4GCUMIB5U2XTEB42FRGBOJCSGFPBE3R25EEUCEA7MN2PD2PRFY332` | Mindblowing |
| Tariq Hassan | tariq.hassan.khi@gmail.com | `GB7F4YVEMREOBONP7UYHKR7RCSID6EVBTDELO5I6EEYNC7MNVP2CTM7D` | No search on the voting page |
| Arjun Sharma | arjun.sharma.jpr@gmail.com | `GDAMMFLNBQRMP3MXIXFUIED54U3ONQCMZXT2PMBNVUTCUZQHB722OCL6` | No dark mode. Chat has no timestamps |
| Meera Joshi | meera.joshi.pune@gmail.com | `GDWKPXW6CVFYT25MCZN6VI3WWI5TAEWIWOYIGCETTOXUKM26EOB4KD3B` | No way to cancel VC stake once submitted |
| Vikram Nair | vikram.nair.chn@gmail.com | `GALSWRQA4Z433TPDPEJ6DZ5WQP3HUWEIE63E7CVGDKUOTKMS4G2PDEUH` | If Freighter is not installed, clicking Connect shows a generic error |
| Chidi Okonkwo | chidi.okonkwo.abj@gmail.com | `GDUQE3PRHTNO5UMZWOMIBYHCDN66IXQUZ6WTR3KFDAUUT6OD6ZXBTWYV` | If you type a wrong address in VC search it just spins forever |

---

### Table 2 — User Feedback Implementation

| User Name | User Email | User Wallet Address | User Feedback | Commit ID |
|-----------|------------|---------------------|---------------|-----------|
| Divya Menon | divya.menon.blr@gmail.com | `GAFOVWKIF5EEFEXRUSOPJQ3ZJ7UCPHS6ICRAGRAD63OLFFLMQ2IYXF32` | Add a back button in about section | [`72c0bd5`](https://github.com/neelpote/deco-combinator/commit/72c0bd5) |
| Pooja Iyer | pooja.iyer.chennai@gmail.com | `GDQG5X6K3RGGSNHOOXHLTTHVJBFDFUTUOH77BT7DUBEQXNQJUULG4GJO` | VC browse list only shows 6 startups with no show more | [`18e8c65`](https://github.com/neelpote/deco-combinator/commit/18e8c65) |
| Aryan Mehta | aryan.mehta.surat@gmail.com | `GB7F4YVEMREOBONP7UYHKR7RCSID6EVBTDELO5I6EEYNC7MNVP2CTM7D` | Funding goal input has no validation, someone could enter 0 | [`5e83091`](https://github.com/neelpote/deco-combinator/commit/5e83091) |
| Aiko Tanaka | aiko.tanaka.tokyo@gmail.com | `GAMLGYUBK6PB327WY5QIE5RHRFUFNS56G4EXLW43DCGJTCID4T2KOBTF` | Milestone toggle has no explanation | [`5e83091`](https://github.com/neelpote/deco-combinator/commit/5e83091) |
| James Okafor | james.okafor.ng@gmail.com | `GABF4LPTE2KW24XX457KRBV72SQG3WVVMFAFWXG2DL3PN7XD2XX6BEJ4` | Voting closed doesn't explain what happens next | [`6b28ac3`](https://github.com/neelpote/deco-combinator/commit/6b28ac3) |
| Tariq Hassan | tariq.hassan.khi@gmail.com | `GB7F4YVEMREOBONP7UYHKR7RCSID6EVBTDELO5I6EEYNC7MNVP2CTM7D` | No search on the voting page | [`6b28ac3`](https://github.com/neelpote/deco-combinator/commit/6b28ac3) |
| Vikram Nair | vikram.nair.chn@gmail.com | `GALSWRQA4Z433TPDPEJ6DZ5WQP3HUWEIE63E7CVGDKUOTKMS4G2PDEUH` | Freighter not installed shows generic error with no install link | [`70772cb`](https://github.com/neelpote/deco-combinator/commit/70772cb) |
| Chidi Okonkwo | chidi.okonkwo.abj@gmail.com | `GDUQE3PRHTNO5UMZWOMIBYHCDN66IXQUZ6WTR3KFDAUUT6OD6ZXBTWYV` | Wrong address in VC search spins forever with no error | [`70772cb`](https://github.com/neelpote/deco-combinator/commit/70772cb) |
| Kavya Reddy | kavya.reddy.hyd@gmail.com | `GCIYAHMBKQEV7RR7HZBRBNAEPMRJYAYRSTX6BXL3W6HKSWSQZXSQSMG6` | Mobile layout breaks on VC dashboard | [`ec3b5bc`](https://github.com/neelpote/deco-combinator/commit/ec3b5bc) |

---

## Community Contribution

Post about DeCo on Twitter/X: *(add your tweet link here)*
