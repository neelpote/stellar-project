#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::Address as _,
    token::StellarAssetClient,
    Address, Env, String,
};

fn setup_env() -> (Env, Address, Address, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let founder = Address::generate(&env);
    let vc_addr = Address::generate(&env);

    // Deploy mock XLM token
    let xlm = env.register_stellar_asset_contract_v2(admin.clone()).address();
    let asset = StellarAssetClient::new(&env, &xlm);
    asset.mint(&vc_addr, &10_000_0000000i128);
    asset.mint(&founder, &1_000_0000000i128);

    // Deploy DeCo contract
    let contract_id = env.register_contract(None, DeCo);
    let client = DeCoClient::new(&env, &contract_id);
    client.init(&admin, &1_000_0000000i128);

    (env, contract_id, admin, founder, vc_addr)
}

#[test]
fn test_apply_and_get_status() {
    let (env, contract_id, _admin, founder, _vc) = setup_env();
    let client = DeCoClient::new(&env, &contract_id);

    client.apply(&founder, &String::from_str(&env, "QmTest"), &10_000_0000000i128, &false, &1u32);

    let s = client.get_startup_status(&founder);
    assert!(s.exists);
    assert_eq!(s.funding_goal, 10_000_0000000i128);
    assert!(!s.approved);
    assert!(!s.milestone_enabled);
    assert_eq!(s.total_milestones, 1);
    assert_eq!(s.current_milestone, 0);
    assert_eq!(s.escrowed_funds, 0);
}

#[test]
fn test_nonexistent_returns_exists_false() {
    let (env, contract_id, _admin, founder, _vc) = setup_env();
    let client = DeCoClient::new(&env, &contract_id);
    let s = client.get_startup_status(&founder);
    assert!(!s.exists);
}

#[test]
fn test_vote() {
    let (env, contract_id, _admin, founder, vc_addr) = setup_env();
    let client = DeCoClient::new(&env, &contract_id);

    client.apply(&founder, &String::from_str(&env, "QmTest"), &10_000_0000000i128, &false, &1u32);
    client.vote(&vc_addr, &founder, &true);

    let s = client.get_startup_status(&founder);
    assert_eq!(s.yes_votes, 1);
    assert_eq!(s.no_votes, 0);
}

#[test]
fn test_approve() {
    let (env, contract_id, admin, founder, _vc) = setup_env();
    let client = DeCoClient::new(&env, &contract_id);

    client.apply(&founder, &String::from_str(&env, "QmTest"), &10_000_0000000i128, &false, &1u32);
    client.approve_application(&admin, &founder);

    let s = client.get_startup_status(&founder);
    assert!(s.approved);
}

#[test]
fn test_stake_become_vc() {
    let (env, contract_id, admin, _founder, vc_addr) = setup_env();
    let xlm = env.register_stellar_asset_contract_v2(admin.clone()).address();
    StellarAssetClient::new(&env, &xlm).mint(&vc_addr, &10_000_0000000i128);

    let client = DeCoClient::new(&env, &contract_id);
    client.stake_to_become_vc(&vc_addr, &String::from_str(&env, "Test Fund"), &xlm);

    let vc_data = client.get_vc_data(&vc_addr);
    assert!(vc_data.exists);
    assert_eq!(vc_data.stake_amount, 1_000_0000000i128);
    assert!(client.is_vc(&vc_addr));
}

#[test]
fn test_get_all_startups() {
    let (env, contract_id, _admin, founder, _vc) = setup_env();
    let client = DeCoClient::new(&env, &contract_id);

    client.apply(&founder, &String::from_str(&env, "QmTest"), &10_000_0000000i128, &false, &1u32);
    assert_eq!(client.get_all_startups().len(), 1);
}

#[test]
fn test_has_voted() {
    let (env, contract_id, _admin, founder, vc_addr) = setup_env();
    let client = DeCoClient::new(&env, &contract_id);

    client.apply(&founder, &String::from_str(&env, "QmTest"), &10_000_0000000i128, &false, &1u32);
    assert!(!client.has_voted(&vc_addr, &founder));
    client.vote(&vc_addr, &founder, &true);
    assert!(client.has_voted(&vc_addr, &founder));
}

#[test]
fn test_milestone_invest_and_vote() {
    let (env, contract_id, admin, founder, vc_addr) = setup_env();
    let xlm = env.register_stellar_asset_contract_v2(admin.clone()).address();
    let asset = StellarAssetClient::new(&env, &xlm);
    asset.mint(&vc_addr, &100_000_0000000i128);

    let client = DeCoClient::new(&env, &contract_id);

    // Founder applies with 2 milestones
    client.apply(&founder, &String::from_str(&env, "QmMilestone"), &10_000_0000000i128, &true, &2u32);

    let s = client.get_startup_status(&founder);
    assert!(s.milestone_enabled);
    assert_eq!(s.total_milestones, 2);

    // VC stakes
    client.stake_to_become_vc(&vc_addr, &String::from_str(&env, "Test Fund"), &xlm);

    // VC invests — funds should go to escrow
    let invest_amount = 2_000_0000000i128;
    client.vc_invest(&vc_addr, &founder, &invest_amount, &xlm);

    let s2 = client.get_startup_status(&founder);
    assert_eq!(s2.escrowed_funds, invest_amount);
    assert_eq!(s2.unlocked_balance, 0); // not in unlocked — it's escrowed
    assert_eq!(s2.total_allocated, invest_amount);

    // VC votes to approve milestone 0
    client.vote_milestone(&vc_addr, &founder, &true);
    assert!(client.has_voted_milestone(&vc_addr, &founder, &0u32));

    // Release milestone 0
    client.release_milestone(&founder, &xlm);

    let s3 = client.get_startup_status(&founder);
    assert_eq!(s3.current_milestone, 1);
    // Half of total_allocated released (2 milestones)
    let expected_tranche = invest_amount / 2;
    assert_eq!(s3.escrowed_funds, invest_amount - expected_tranche);
}

#[test]
fn test_direct_invest_no_milestone() {
    let (env, contract_id, admin, founder, vc_addr) = setup_env();
    let xlm = env.register_stellar_asset_contract_v2(admin.clone()).address();
    let asset = StellarAssetClient::new(&env, &xlm);
    asset.mint(&vc_addr, &100_000_0000000i128);

    let client = DeCoClient::new(&env, &contract_id);

    client.apply(&founder, &String::from_str(&env, "QmDirect"), &5_000_0000000i128, &false, &1u32);
    client.stake_to_become_vc(&vc_addr, &String::from_str(&env, "Direct Fund"), &xlm);

    let invest_amount = 1_000_0000000i128;
    client.vc_invest(&vc_addr, &founder, &invest_amount, &xlm);

    let s = client.get_startup_status(&founder);
    assert_eq!(s.unlocked_balance, invest_amount);
    assert_eq!(s.escrowed_funds, 0);
}
