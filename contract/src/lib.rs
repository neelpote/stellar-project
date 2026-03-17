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
    pub exists: bool, // replaces Option<T> — always return a struct
}

#[derive(Clone)]
#[contracttype]
pub struct VCData {
    pub vc_address: Address,
    pub company_name: String,
    pub stake_amount: i128,
    pub total_invested: i128,
    pub exists: bool, // replaces Option<T>
}

#[contracttype]
pub enum DataKey {
    Admin,
    VCStakeRequired,
    Startup(Address),
    VCData(Address),
    Vote(Address, Address),
    AllStartups,
    AllVCs,
}

// ─── Contract ─────────────────────────────────────────────────────────────────

#[contract]
pub struct DeCo;

#[contractimpl]
impl DeCo {
    /// Initialize contract
    pub fn init(env: Env, admin: Address, vc_stake_required: i128) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::VCStakeRequired, &vc_stake_required);
    }

    /// Founder applies with IPFS CID
    pub fn apply(env: Env, founder: Address, ipfs_cid: String, funding_goal: i128) {
        founder.require_auth();

        if env.storage().instance().has(&DataKey::Startup(founder.clone())) {
            panic!("already applied");
        }

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
        };

        env.storage().instance().set(&DataKey::Startup(founder.clone()), &data);

        let mut all: Vec<Address> = env.storage().instance()
            .get(&DataKey::AllStartups)
            .unwrap_or(Vec::new(&env));
        all.push_back(founder);
        env.storage().instance().set(&DataKey::AllStartups, &all);
    }

    /// Community vote
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

    /// Admin approves startup
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

    /// VC stakes to become verified
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

    /// VC invests in approved startup
    pub fn vc_invest(env: Env, vc: Address, founder: Address, amount: i128, xlm_token: Address) {
        vc.require_auth();

        if !env.storage().instance().has(&DataKey::VCData(vc.clone())) {
            panic!("not a verified vc");
        }

        let mut startup: StartupData = env.storage().instance()
            .get(&DataKey::Startup(founder.clone()))
            .expect("startup not found");

        token::Client::new(&env, &xlm_token)
            .transfer(&vc, &env.current_contract_address(), &amount);

        startup.total_allocated += amount;
        startup.unlocked_balance += amount;
        env.storage().instance().set(&DataKey::Startup(founder.clone()), &startup);

        let mut vc_data: VCData = env.storage().instance()
            .get(&DataKey::VCData(vc.clone()))
            .expect("vc not found");
        vc_data.total_invested += amount;
        env.storage().instance().set(&DataKey::VCData(vc), &vc_data);
    }

    /// Founder claims funds
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

    // ─── Read functions — NO Option<T>, always return concrete types ──────────

    /// Returns startup data. Check `exists` field to know if it was found.
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
            })
    }

    /// Returns admin address
    pub fn get_admin(env: Env) -> Address {
        env.storage().instance()
            .get(&DataKey::Admin)
            .expect("admin not set")
    }

    /// Returns all startup addresses
    pub fn get_all_startups(env: Env) -> Vec<Address> {
        env.storage().instance()
            .get(&DataKey::AllStartups)
            .unwrap_or(Vec::new(&env))
    }

    /// Returns VC data. Check `exists` field.
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

    /// Returns all VC addresses
    pub fn get_all_vcs(env: Env) -> Vec<Address> {
        env.storage().instance()
            .get(&DataKey::AllVCs)
            .unwrap_or(Vec::new(&env))
    }

    /// Returns required VC stake
    pub fn get_vc_stake_required(env: Env) -> i128 {
        env.storage().instance()
            .get(&DataKey::VCStakeRequired)
            .expect("stake not set")
    }

    /// Check if address has voted for a startup
    pub fn has_voted(env: Env, voter: Address, founder: Address) -> bool {
        env.storage().instance().has(&DataKey::Vote(voter, founder))
    }

    /// Check if address is a verified VC
    pub fn is_vc(env: Env, vc: Address) -> bool {
        env.storage().instance().has(&DataKey::VCData(vc))
    }
}
