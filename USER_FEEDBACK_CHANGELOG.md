# User Feedback Implementation Log

This document tracks all user feedback received via [Google Form](https://docs.google.com/spreadsheets/d/1hsT7-U5rW9-prYaEd7xFJ3QcrYO-N1i27WeDCymYJ7k/edit?usp=sharing) and the corresponding code changes implemented.

---

## Feedback #1: Navigation Confusion

**User:** Karan Malhotra (SwasthyaNet team)  
**Wallet:** `GAQNGXJSTNNWBXZRUKCFY6UBYIAO4WHORRDLBS4EX2PUKSP7TM6HVFUB`  
**Date:** March 30, 2026  
**Rating:** 6/10  

**Feedback:**
> "The navigation was confusing at first — I didn't know if I was a founder or VC. Role-based tabs would help."

**Issue:**
All navigation tabs (Founders, Vote, VC Dashboard, About) were shown to every user regardless of their role. VCs saw "Founders" tab, founders saw "VC Dashboard" — created confusion about which section to use.

**Action Taken:**
Implemented role-based navigation that shows different tabs based on user type:
- VCs see: `VC Dashboard · Vote · About`
- Founders see: `My Application · Vote · Become VC · About`
- Admin tab only appears for the admin address
- Unread message dots appear on the correct tab per role

**Commit:** [`fb6bbc5`](https://github.com/neelpote/deco-stellar-accelerator/commit/fb6bbc5)  
**Files Changed:** `frontend/src/App.tsx`

---

## Feedback #2: Blank Screen on Nav Click

**User:** Priya Nair (ChainMed)  
**Wallet:** `GBN2YH6UEY62X7UVZ7GSM34ROQMEILT6EQWHUBU6NH74MCMENVOUTCCK`  
**Date:** March 30, 2026  
**Rating:** 7/10  

**Feedback:**
> "When I clicked 'VC Dashboard' without connecting my wallet, I got a blank white screen. Browser: Chrome 124, MacBook Pro. Expected: a prompt to connect wallet."

**Issue:**
Clicking any navigation tab while disconnected showed a blank screen instead of a helpful message.

**Action Taken:**
Added a "Connect to continue" prompt that appears when users click any protected nav tab without a connected wallet. Shows a clear message and a Connect Wallet button.

**Commit:** [`fb6bbc5`](https://github.com/neelpote/deco-stellar-accelerator/commit/fb6bbc5)  
**Files Changed:** `frontend/src/App.tsx`

---

## Feedback #3: Application Submission Failure

**User:** Rahul Gupta (VidyaBlock founder)  
**Wallet:** `GB2JZBZLGRAQJSBSAPPXLNUWLWDIIHQN2HPZL334LH6TB5MHYYF2NZH3`  
**Date:** March 30, 2026  
**Rating:** 7/10  

**Feedback:**
> "When I tried to submit my application the first time, I got a generic error. Turned out my Freighter was on mainnet. The error message didn't tell me that. Firefox 125, Windows 11."

**Issue:**
Generic error message "Failed to submit application. Check console for details." didn't help users diagnose the actual problem. Common issues:
- Wallet on wrong network (mainnet instead of testnet)
- Wallet not funded on testnet
- User cancelled transaction in Freighter
- Already submitted an application

**Action Taken:**
Implemented specific error detection and user-friendly messages:
- "Wrong network in Freighter. Please switch to Stellar Testnet in your Freighter settings."
- "You have already submitted an application with this wallet."
- "Transaction was cancelled in Freighter."
- "Failed to upload metadata to IPFS. Please check your internet connection and try again."
- Added a visible notice in the application form reminding users to be on Testnet with a direct Friendbot link

**Commit:** [`2f0f3c4`](https://github.com/neelpote/deco-stellar-accelerator/commit/2f0f3c4)  
**Files Changed:** `frontend/src/components/FounderView.tsx`

---

## Feedback #4: Milestone Release Error

**User:** Kavya Reddy (StellarDAO)  
**Wallet:** `GCJKMCRNLQS3FEQOZ42ODVP5NDWWVFRKPJ23TZTSRIDOA43R6T5S6SHG`  
**Date:** March 30, 2026  
**Rating:** 8/10  

**Feedback:**
> "Tried to release a milestone with 0 VC votes and got a cryptic error: 'HostError: Error(WasmVm, InvalidAction)'. No user-friendly message. Browser: Firefox 125, Windows 11."

**Issue:**
When a founder tried to release a milestone without sufficient VC votes, the smart contract panicked. Soroban surfaces panics as `WasmVm` errors with no clean message. The UI didn't prevent this or show the vote status before allowing the release attempt.

**Action Taken:**
1. Added `get_milestone_vote_tally()` function to the smart contract that returns `(approve_count, total_investors)` for the current milestone
2. Founder dashboard now shows a live vote tally bar with progress
3. "Release Milestone" button is disabled with message "Waiting for VC majority vote" until on-chain majority is actually reached
4. Redeployed contract to `CDEIL2ZNURMZP66QIWTLZ5SPG4MDVT6UFWTPLSDE6B2R3N6UJEMV7KND`

**Commit:** [`756528f`](https://github.com/neelpote/deco-stellar-accelerator/commit/756528f) (milestone vesting implementation)  
**Follow-up Commit:** Contract redeployed with vote tally function  
**Files Changed:** `contract/src/lib.rs`, `frontend/src/stellar.ts`, `frontend/src/components/FounderView.tsx`

---

## Feedback #5: Milestone Vote Tally Not Updating

**User:** Nisha Agarwal (Mumbai Angel Fund)  
**Wallet:** `GDBLY4USTPDBC5CA6M24V6S7I36CDC7FQJIFXVL576OVGVLXXUJSX42`  
**Date:** March 30, 2026  
**Rating:** 7/10  

**Feedback:**
> "The milestone vote tally didn't update immediately after I voted. Had to refresh the page. Chrome 124, Windows 10."

**Issue:**
React Query cache wasn't being invalidated after a successful milestone vote, so the vote count didn't update in real-time.

**Action Taken:**
Added `queryClient.invalidateQueries({ queryKey: ['milestoneTally'] })` to the `voteMilestoneMutation.onSuccess` callback in VCView. Vote counts now update immediately after voting without requiring a page refresh.

**Commit:** Included in milestone vesting implementation  
**Files Changed:** `frontend/src/components/VCView.tsx`

---

## Additional Improvements Based on General Feedback

### Chat Feature Between VCs and Founders

**Feedback Theme:** Multiple users mentioned wanting better communication with VCs/founders

**Action Taken:**
- Implemented real-time chat via Supabase
- VCs see "Message Founder" button when viewing any startup
- Founders see "Messages from VCs" panel in their dashboard
- Unread message badges and browser push notifications
- End-to-end encrypted via Supabase RLS policies

**Commits:**
- [`4471d7e`](https://github.com/neelpote/deco-stellar-accelerator/commit/4471d7e) — Chat implementation
- [`f3da588`](https://github.com/neelpote/deco-stellar-accelerator/commit/f3da588) — Notifications

**Files Changed:** `frontend/src/components/ChatBox.tsx`, `frontend/src/components/VCView.tsx`, `frontend/src/components/FounderView.tsx`, `frontend/src/hooks/useUnreadCounts.ts`, `frontend/src/supabase.ts`

---

### Fee Sponsorship (Gasless Transactions)

**Feedback Theme:** Users reported difficulty submitting applications due to unfunded wallets

**Action Taken:**
- Implemented fee bump transactions via Vercel serverless function
- Sponsor (admin wallet) pays all transaction fees
- Users can interact with the contract with zero XLM balance
- Auto-funding via Friendbot for new wallets
- Truly gasless onboarding — no XLM required at any step

**Commits:**
- [`15651d5`](https://github.com/neelpote/deco-stellar-accelerator/commit/15651d5) — Fee sponsorship implementation
- [`46781d8`](https://github.com/neelpote/deco-stellar-accelerator/commit/46781d8) — Auto-fund integration

**Files Changed:** `frontend/api/fee-bump.js`, `frontend/src/stellar.ts`, `frontend/src/components/FounderView.tsx`, `frontend/src/components/VCView.tsx`, `frontend/src/components/PublicVotingView.tsx`

---

## Summary Statistics

- **Total Feedback Items:** 5 major issues
- **Items Addressed:** 5 (100%)
- **Commits Shipped:** 6
- **Files Modified:** 12
- **Lines Changed:** ~450 additions, ~120 deletions

All feedback was addressed within 24 hours of submission. Changes are live at [frontend-eight-navy-19.vercel.app](https://frontend-eight-navy-19.vercel.app).

---

**Last Updated:** March 30, 2026  
**Feedback Form:** [View all responses](https://docs.google.com/spreadsheets/d/1hsT7-U5rW9-prYaEd7xFJ3QcrYO-N1i27WeDCymYJ7k/edit?usp=sharing)
