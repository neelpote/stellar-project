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

    client.apply(&founder, &String::from_str(&env, "QmTest"), &10_000_0000000i128);

    let s = client.get_startup_status(&founder);
    assert!(s.exists);
    assert_eq!(s.funding_goal, 10_000_0000000i128);
    assert!(!s.approved);
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

    client.apply(&founder, &String::from_str(&env, "QmTest"), &10_000_0000000i128);
    client.vote(&vc_addr, &founder, &true);

    let s = client.get_startup_status(&founder);
    assert_eq!(s.yes_votes, 1);
    assert_eq!(s.no_votes, 0);
}

#[test]
fn test_approve() {
    let (env, contract_id, admin, founder, _vc) = setup_env();
    let client = DeCoClient::new(&env, &contract_id);

    client.apply(&founder, &String::from_str(&env, "QmTest"), &10_000_0000000i128);
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

    client.apply(&founder, &String::from_str(&env, "QmTest"), &10_000_0000000i128);
    assert_eq!(client.get_all_startups().len(), 1);
}

#[test]
fn test_has_voted() {
    let (env, contract_id, _admin, founder, vc_addr) = setup_env();
    let client = DeCoClient::new(&env, &contract_id);

    client.apply(&founder, &String::from_str(&env, "QmTest"), &10_000_0000000i128);
    assert!(!client.has_voted(&vc_addr, &founder));
    client.vote(&vc_addr, &founder, &true);
    assert!(client.has_voted(&vc_addr, &founder));
}
