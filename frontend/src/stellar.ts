import * as StellarSdk from '@stellar/stellar-sdk';
import { CONTRACT_ID, SOROBAN_RPC_URL, NETWORK_PASSPHRASE, HORIZON_URL } from './config';

// Horizon for account loading (stable JSON API)
const horizon = new StellarSdk.Horizon.Server(HORIZON_URL);

// Soroban RPC for write ops (prepareTransaction, sendTransaction, getTransaction)
export const server = new StellarSdk.rpc.Server(SOROBAN_RPC_URL);

// ─── Account helper ───────────────────────────────────────────────────────────
export const getAccount = async (address: string): Promise<StellarSdk.Account> => {
  const acc = await horizon.loadAccount(address);
  return new StellarSdk.Account(acc.accountId(), acc.sequenceNumber());
};

// ─── Simulate via raw JSON-RPC (most reliable, no SDK parsing issues) ─────────
const DUMMY = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
let _id = 1;

const simulate = async (txXdr: string): Promise<any> => {
  const res = await fetch(SOROBAN_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: _id++,
      method: 'simulateTransaction',
      params: { transaction: txXdr },
    }),
  });
  const json = await res.json();
  const xdr = json?.result?.results?.[0]?.xdr;
  if (!xdr) return null;
  // SDK v14 scValToNative handles structs correctly
  const scVal = StellarSdk.xdr.ScVal.fromXDR(xdr, 'base64');
  return StellarSdk.scValToNative(scVal);
};

const buildTx = async (source: string, op: StellarSdk.xdr.Operation): Promise<string> => {
  const account = await getAccount(source);
  return new StellarSdk.TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(30)
    .build()
    .toXDR();
};

// ─── Read functions ───────────────────────────────────────────────────────────

export const getStartupStatus = async (founderAddress: string) => {
  try {
    if (!founderAddress) return null;
    StellarSdk.StrKey.decodeEd25519PublicKey(founderAddress); // throws if invalid

    const contract = new StellarSdk.Contract(CONTRACT_ID);
    const txXdr = await buildTx(
      founderAddress,
      contract.call('get_startup_status', StellarSdk.Address.fromString(founderAddress).toScVal())
    );
    const result = await simulate(txXdr);
    // Contract returns exists:false when not found
    if (!result || result.exists === false) return null;
    return result;
  } catch (error) {
    console.error('Error fetching startup status:', error);
    return null;
  }
};

export const getAdmin = async (): Promise<string | null> => {
  try {
    const contract = new StellarSdk.Contract(CONTRACT_ID);
    const txXdr = await buildTx(DUMMY, contract.call('get_admin'));
    return await simulate(txXdr);
  } catch (error) {
    console.error('Error fetching admin:', error);
    return null;
  }
};

export const getAllStartups = async (): Promise<string[]> => {
  try {
    const contract = new StellarSdk.Contract(CONTRACT_ID);
    const txXdr = await buildTx(DUMMY, contract.call('get_all_startups'));
    return (await simulate(txXdr)) ?? [];
  } catch (error) {
    console.error('Error fetching all startups:', error);
    return [];
  }
};

export const getVCStakeRequired = async (): Promise<string> => {
  try {
    const contract = new StellarSdk.Contract(CONTRACT_ID);
    const txXdr = await buildTx(DUMMY, contract.call('get_vc_stake_required'));
    return (await simulate(txXdr))?.toString() ?? '0';
  } catch (error) {
    console.error('Error fetching VC stake required:', error);
    return '0';
  }
};

export const getVCData = async (vcAddress: string) => {
  try {
    const contract = new StellarSdk.Contract(CONTRACT_ID);
    const txXdr = await buildTx(
      DUMMY,
      contract.call('get_vc_data', StellarSdk.Address.fromString(vcAddress).toScVal())
    );
    const result = await simulate(txXdr);
    if (!result || result.exists === false) return null;
    return result;
  } catch (error) {
    console.error('Error fetching VC data:', error);
    return null;
  }
};

export const getAllVCs = async (): Promise<string[]> => {
  try {
    const contract = new StellarSdk.Contract(CONTRACT_ID);
    const txXdr = await buildTx(DUMMY, contract.call('get_all_vcs'));
    return (await simulate(txXdr)) ?? [];
  } catch (error) {
    console.error('Error fetching all VCs:', error);
    return [];
  }
};
