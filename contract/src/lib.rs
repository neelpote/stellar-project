#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, token, Address, Env, String, Vec,
};

mod test;

// ─── Data Types ───────────────────────────────────────────────────────────────

#[derive(Clone)]
#[contracttype]
pub struct StartupData {
    pub ipfs_cid: String,
    pub funding_goal: i128,
    pub total_allocated: i128,
    pub unlocked_balance: i128,
    pub claimed_balance: i128,
    pub voting_end_time: u64,
    pub yes_votes: u32,
    pub no_votes: u32,
    pub approved: bool,
    pub exists: bool,
    // ── milestone vesting ──
    pub milestone_enabled: bool,
    pub total_milestones: u32,
    pub current_milestone: u32,
    pub escrowed_funds: i128,
}

#[derive(Clone)]
#[contracttype]
pub struct VCData {
    pub vc_address: Address,
    pub company_name: String,
    pub stake_amount: i128,
    pub total_invested: i128,
    pub exists: bool,
}

#[contracttype]
pub enum DataKey {
    Admin,
    VCStakeRequired,
    Startup(Address),
    VCData(Address),
    // community governance vote: (voter, founder)
    Vote(Address, Address),
    AllStartups,
    AllVCs,
    // how much a specific VC invested in a specific startup
    VCInvestment(Address, Address),
    // milestone vote: (vc, founder, milestone_index)
    MilestoneVote(Address, Address, u32),
    // list of VCs who invested in a startup (for quorum counting)
    StartupInvestors(Address),
}

// ─── Contract ─────────────────────────────────────────────────────────────────

#[contract]
pub struct DeCo;

#[contractimpl]
impl DeCo {
    // ─── Admin ────────────────────────────────────────────────────────────────

    pub fn init(env: Env, admin: Address, vc_stake_required: i128) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::VCStakeRequired, &vc_stake_required);
    }

    // ─── Founder: apply ───────────────────────────────────────────────────────

    /// Founder applies with IPFS CID.
    /// `milestone_enabled` — if true, VC funds are escrowed and released per milestone.
    /// `total_milestones`  — number of tranches (ignored / forced to 1 when milestone_enabled=false).
    pub fn apply(
        env: Env,
        founder: Address,
        ipfs_cid: String,
        funding_goal: i128,
        milestone_enabled: bool,
        total_milestones: u32,
    ) {
        founder.require_auth();

        if env.storage().instance().has(&DataKey::Startup(founder.clone())) {
            panic!("already applied");
        }

        // enforce at least 1 milestone; if escrow is off, lock to 1
        let milestones = if !milestone_enabled || total_milestones == 0 {
            1
        } else {
            total_milestones
        };

        let voting_end_time = env.ledger().timestamp() + (30 * 24 * 60 * 60);

        let data = StartupData {
            ipfs_cid,
            funding_goal,
            total_allocated: 0,
            unlocked_balance: 0,
            claimed_balance: 0,
            voting_end_time,
            yes_votes: 0,
            no_votes: 0,
            approved: false,
            exists: true,
            milestone_enabled,
            total_milestones: milestones,
            current_milestone: 0,
            escrowed_funds: 0,
        };

        env.storage().instance().set(&DataKey::Startup(founder.clone()), &data);

        let mut all: Vec<Address> = env.storage().instance()
            .get(&DataKey::AllStartups)
            .unwrap_or(Vec::new(&env));
        all.push_back(founder);
        env.storage().instance().set(&DataKey::AllStartups, &all);
    }

    // ─── Community: vote on application ──────────────────────────────────────

    pub fn vote(env: Env, voter: Address, founder: Address, vote_yes: bool) {
        voter.require_auth();

        let mut data: StartupData = env.storage().instance()
            .get(&DataKey::Startup(founder.clone()))
            .expect("startup not found");

        if env.ledger().timestamp() > data.voting_end_time {
            panic!("voting ended");
        }

        let vote_key = DataKey::Vote(voter.clone(), founder.clone());
        if env.storage().instance().has(&vote_key) {
            panic!("already voted");
        }

        env.storage().instance().set(&vote_key, &vote_yes);

        if vote_yes { data.yes_votes += 1; } else { data.no_votes += 1; }

        env.storage().instance().set(&DataKey::Startup(founder), &data);
    }

    // ─── Admin: approve application ───────────────────────────────────────────

    pub fn approve_application(env: Env, admin: Address, founder: Address) {
        admin.require_auth();

        let stored_admin: Address = env.storage().instance()
            .get(&DataKey::Admin)
            .expect("admin not set");

        if admin != stored_admin {
            panic!("not admin");
        }

        let mut data: StartupData = env.storage().instance()
            .get(&DataKey::Startup(founder.clone()))
            .expect("startup not found");

        data.approved = true;
        env.storage().instance().set(&DataKey::Startup(founder), &data);
    }

    // ─── VC: stake to join ────────────────────────────────────────────────────

    pub fn stake_to_become_vc(env: Env, vc: Address, company_name: String, xlm_token: Address) {
        vc.require_auth();

        if env.storage().instance().has(&DataKey::VCData(vc.clone())) {
            panic!("already a vc");
        }

        let stake_required: i128 = env.storage().instance()
            .get(&DataKey::VCStakeRequired)
            .expect("stake not set");

        token::Client::new(&env, &xlm_token)
            .transfer(&vc, &env.current_contract_address(), &stake_required);

        let data = VCData {
            vc_address: vc.clone(),
            company_name,
            stake_amount: stake_required,
            total_invested: 0,
            exists: true,
        };

        env.storage().instance().set(&DataKey::VCData(vc.clone()), &data);

        let mut all: Vec<Address> = env.storage().instance()
            .get(&DataKey::AllVCs)
            .unwrap_or(Vec::new(&env));
        all.push_back(vc);
        env.storage().instance().set(&DataKey::AllVCs, &all);
    }

    // ─── VC: invest ───────────────────────────────────────────────────────────

    /// Invest in a startup.
    /// - milestone_enabled=false → funds go directly to the contract's unlocked balance
    ///   (founder can claim immediately via `claim_funds`).
    /// - milestone_enabled=true  → funds are escrowed; released tranche-by-tranche
    ///   via `vote_milestone` + `release_milestone`.
    pub fn vc_invest(env: Env, vc: Address, founder: Address, amount: i128, xlm_token: Address) {
        vc.require_auth();

        if !env.storage().instance().has(&DataKey::VCData(vc.clone())) {
            panic!("not a verified vc");
        }

        if amount <= 0 {
            panic!("amount must be positive");
        }

        let mut startup: StartupData = env.storage().instance()
            .get(&DataKey::Startup(founder.clone()))
            .expect("startup not found");

        // Transfer tokens from VC → contract (always; escrow vs. unlocked differs below)
        token::Client::new(&env, &xlm_token)
            .transfer(&vc, &env.current_contract_address(), &amount);

        startup.total_allocated += amount;

        if startup.milestone_enabled {
            // ── Escrow path ──────────────────────────────────────────────────
            startup.escrowed_funds += amount;
            // do NOT touch unlocked_balance — founder cannot claim until milestone passes

            // Record this VC as an investor in this startup (for quorum)
            let invest_key = DataKey::VCInvestment(vc.clone(), founder.clone());
            let prior: i128 = env.storage().instance()
                .get(&invest_key)
                .unwrap_or(0i128);
            env.storage().instance().set(&invest_key, &(prior + amount));

            // Append to investor list if first investment
            if prior == 0 {
                let inv_key = DataKey::StartupInvestors(founder.clone());
                let mut investors: Vec<Address> = env.storage().instance()
                    .get(&inv_key)
                    .unwrap_or(Vec::new(&env));
                investors.push_back(vc.clone());
                env.storage().instance().set(&inv_key, &investors);
            }
        } else {
            // ── Direct path ──────────────────────────────────────────────────
            startup.unlocked_balance += amount;
        }

        env.storage().instance().set(&DataKey::Startup(founder.clone()), &startup);

        // Update VC's total_invested counter
        let mut vc_data: VCData = env.storage().instance()
            .get(&DataKey::VCData(vc.clone()))
            .expect("vc not found");
        vc_data.total_invested += amount;
        env.storage().instance().set(&DataKey::VCData(vc), &vc_data);
    }

    // ─── Milestone: VC votes to approve current milestone ────────────────────

    /// A VC who invested in this startup votes to approve (or reject) the current milestone.
    /// Each VC gets one vote per milestone index.
    pub fn vote_milestone(env: Env, vc: Address, founder: Address, approve: bool) {
        vc.require_auth();

        let startup: StartupData = env.storage().instance()
            .get(&DataKey::Startup(founder.clone()))
            .expect("startup not found");

        if !startup.milestone_enabled {
            panic!("milestones not enabled for this startup");
        }

        if startup.current_milestone >= startup.total_milestones {
            panic!("all milestones already released");
        }

        // Verify this VC actually invested in this startup
        let invest_key = DataKey::VCInvestment(vc.clone(), founder.clone());
        if !env.storage().instance().has(&invest_key) {
            panic!("vc did not invest in this startup");
        }

        // One vote per VC per milestone
        let mv_key = DataKey::MilestoneVote(vc.clone(), founder.clone(), startup.current_milestone);
        if env.storage().instance().has(&mv_key) {
            panic!("already voted for this milestone");
        }

        env.storage().instance().set(&mv_key, &approve);
    }

    // ─── Milestone: release tranche if quorum reached ────────────────────────

    /// Anyone can call this (typically the founder).
    /// Tallies milestone votes; if >50% of investors approved, releases one tranche.
    pub fn release_milestone(env: Env, founder: Address, xlm_token: Address) {
        let mut startup: StartupData = env.storage().instance()
            .get(&DataKey::Startup(founder.clone()))
            .expect("startup not found");

        if !startup.milestone_enabled {
            panic!("milestones not enabled for this startup");
        }

        if startup.current_milestone >= startup.total_milestones {
            panic!("all milestones already released");
        }

        if startup.escrowed_funds <= 0 {
            panic!("no escrowed funds");
        }

        // ── Tally votes ───────────────────────────────────────────────────────
        let inv_key = DataKey::StartupInvestors(founder.clone());
        let investors: Vec<Address> = env.storage().instance()
            .get(&inv_key)
            .unwrap_or(Vec::new(&env));

        let total_investors = investors.len();
        if total_investors == 0 {
            panic!("no investors");
        }

        let mut approve_count: u32 = 0;
        for i in 0..investors.len() {
            let vc = investors.get(i).unwrap();
            let mv_key = DataKey::MilestoneVote(vc, founder.clone(), startup.current_milestone);
            let voted_approve: bool = env.storage().instance()
                .get(&mv_key)
                .unwrap_or(false);
            if voted_approve {
                approve_count += 1;
            }
        }

        // Simple majority: strictly more than half
        if approve_count * 2 <= total_investors {
            panic!("milestone not approved by majority of investors");
        }

        // ── Calculate tranche ─────────────────────────────────────────────────
        // For the last milestone, release everything remaining to avoid dust locks.
        let milestones_left = startup.total_milestones - startup.current_milestone;
        let tranche = if milestones_left == 1 {
            startup.escrowed_funds
        } else {
            // integer division — remainder stays in escrow for later tranches
            startup.total_allocated / (startup.total_milestones as i128)
        };

        // Guard: never release more than what's actually escrowed
        let release_amount = if tranche > startup.escrowed_funds {
            startup.escrowed_funds
        } else {
            tranche
        };

        if release_amount <= 0 {
            panic!("nothing to release");
        }

        // ── Transfer ──────────────────────────────────────────────────────────
        token::Client::new(&env, &xlm_token)
            .transfer(&env.current_contract_address(), &founder, &release_amount);

        startup.escrowed_funds -= release_amount;
        startup.current_milestone += 1;

        env.storage().instance().set(&DataKey::Startup(founder), &startup);
    }

    // ─── Founder: claim non-escrowed funds ───────────────────────────────────

    pub fn claim_funds(env: Env, founder: Address, xlm_token: Address) {
        founder.require_auth();

        let mut data: StartupData = env.storage().instance()
            .get(&DataKey::Startup(founder.clone()))
            .expect("startup not found");

        let claimable = data.unlocked_balance - data.claimed_balance;
        if claimable <= 0 {
            panic!("no funds to claim");
        }

        token::Client::new(&env, &xlm_token)
            .transfer(&env.current_contract_address(), &founder, &claimable);

        data.claimed_balance += claimable;
        env.storage().instance().set(&DataKey::Startup(founder), &data);
    }

    // ─── Read functions ───────────────────────────────────────────────────────

    pub fn get_startup_status(env: Env, founder: Address) -> StartupData {
        env.storage().instance()
            .get(&DataKey::Startup(founder))
            .unwrap_or(StartupData {
                ipfs_cid: String::from_str(&env, ""),
                funding_goal: 0,
                total_allocated: 0,
                unlocked_balance: 0,
                claimed_balance: 0,
                voting_end_time: 0,
                yes_votes: 0,
                no_votes: 0,
                approved: false,
                exists: false,
                milestone_enabled: false,
                total_milestones: 0,
                current_milestone: 0,
                escrowed_funds: 0,
            })
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage().instance()
            .get(&DataKey::Admin)
            .expect("admin not set")
    }

    pub fn get_all_startups(env: Env) -> Vec<Address> {
        env.storage().instance()
            .get(&DataKey::AllStartups)
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_vc_data(env: Env, vc: Address) -> VCData {
        env.storage().instance()
            .get(&DataKey::VCData(vc.clone()))
            .unwrap_or(VCData {
                vc_address: vc,
                company_name: String::from_str(&env, ""),
                stake_amount: 0,
                total_invested: 0,
                exists: false,
            })
    }

    pub fn get_all_vcs(env: Env) -> Vec<Address> {
        env.storage().instance()
            .get(&DataKey::AllVCs)
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_vc_stake_required(env: Env) -> i128 {
        env.storage().instance()
            .get(&DataKey::VCStakeRequired)
            .expect("stake not set")
    }

    pub fn has_voted(env: Env, voter: Address, founder: Address) -> bool {
        env.storage().instance().has(&DataKey::Vote(voter, founder))
    }

    pub fn is_vc(env: Env, vc: Address) -> bool {
        env.storage().instance().has(&DataKey::VCData(vc))
    }

    /// Returns how much a specific VC invested in a specific startup.
    pub fn get_vc_investment(env: Env, vc: Address, founder: Address) -> i128 {
        env.storage().instance()
            .get(&DataKey::VCInvestment(vc, founder))
            .unwrap_or(0i128)
    }

    /// Returns the list of VCs who invested in a startup.
    pub fn get_startup_investors(env: Env, founder: Address) -> Vec<Address> {
        env.storage().instance()
            .get(&DataKey::StartupInvestors(founder))
            .unwrap_or(Vec::new(&env))
    }

    /// Returns whether a VC has voted on a specific milestone.
    pub fn has_voted_milestone(env: Env, vc: Address, founder: Address, milestone: u32) -> bool {
        env.storage().instance()
            .has(&DataKey::MilestoneVote(vc, founder, milestone))
    }

    /// Returns (approve_count, total_investors) for the current milestone.
    pub fn get_milestone_vote_tally(env: Env, founder: Address) -> (u32, u32) {
        let startup: StartupData = env.storage().instance()
            .get(&DataKey::Startup(founder.clone()))
            .unwrap_or(StartupData {
                ipfs_cid: String::from_str(&env, ""),
                funding_goal: 0, total_allocated: 0, unlocked_balance: 0,
                claimed_balance: 0, voting_end_time: 0, yes_votes: 0, no_votes: 0,
                approved: false, exists: false, milestone_enabled: false,
                total_milestones: 0, current_milestone: 0, escrowed_funds: 0,
            });

        let inv_key = DataKey::StartupInvestors(founder.clone());
        let investors: Vec<Address> = env.storage().instance()
            .get(&inv_key)
            .unwrap_or(Vec::new(&env));

        let total_investors = investors.len();
        let mut approve_count: u32 = 0;
        for i in 0..investors.len() {
            let vc = investors.get(i).unwrap();
            let mv_key = DataKey::MilestoneVote(vc, founder.clone(), startup.current_milestone);
            let voted_approve: bool = env.storage().instance()
                .get(&mv_key)
                .unwrap_or(false);
            if voted_approve { approve_count += 1; }
        }
        (approve_count, total_investors)
    }
}
