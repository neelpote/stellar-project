import * as StellarSdk from '@stellar/stellar-sdk';
import { CONTRACT_ID, SOROBAN_RPC_URL, NETWORK_PASSPHRASE, HORIZON_URL } from './config';

// Use Horizon for getAccount (stable, no XDR parsing issues)
const horizonServer = new StellarSdk.Horizon.Server(HORIZON_URL);

// Keep SorobanRpc server only for sendTransaction / getTransaction (write ops)
export const server = new StellarSdk.SorobanRpc.Server(SOROBAN_RPC_URL);

const DUMMY = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
let _rpcId = 1;

// ─── Get account via Horizon (avoids Soroban XDR parsing bug) ────────────────
const getAccount = async (address: string): Promise<StellarSdk.Account> => {
  const acc = await horizonServer.loadAccount(address);
  return new StellarSdk.Account(acc.accountId(), acc.sequenceNumber());
};

// ─── Raw JSON-RPC simulate (bypasses SDK XDR parser entirely) ────────────────
const rpcSimulate = async (txXdr: string): Promise<string | null> => {
  try {
    const res = await fetch(SOROBAN_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: _rpcId++,
        method: 'simulateTransaction',
        params: { transaction: txXdr },
      }),
    });
    const json = await res.json();
    return json?.result?.results?.[0]?.xdr ?? null;
  } catch {
    return null;
  }
};

// ─── Decode raw base64 XDR ScVal safely ──────────────────────────────────────
const decodeScVal = (xdrB64: string): any => {
  try {
    const scVal = StellarSdk.xdr.ScVal.fromXDR(xdrB64, 'base64');
    return unwrapAndConvert(scVal);
  } catch {
    return null;
  }
};

// Unwrap Option<T>: Some(x) → convert(x), None → null
const unwrapAndConvert = (scVal: StellarSdk.xdr.ScVal): any => {
  const type = scVal.switch().name;

  if (type === 'scvVoid') return null;

  if (type === 'scvMap') {
    const entries = scVal.map() ?? [];
    if (entries.length === 0) return null;

    const firstKey = entries[0].key();
    if (firstKey.switch().name === 'scvSymbol') {
      const sym = firstKey.sym().toString();
      if (sym === 'None') return null;
      if (sym === 'Some') {
        // unwrap the inner value
        try { return StellarSdk.scValToNative(entries[0].val()); } catch { return null; }
      }
    }
    // Regular struct map — convert directly
    try { return StellarSdk.scValToNative(scVal); } catch { return null; }
  }

  try { return StellarSdk.scValToNative(scVal); } catch { return null; }
};

// ─── Build simulation tx XDR ─────────────────────────────────────────────────
const buildTxXdr = async (sourceAddress: string, op: StellarSdk.xdr.Operation): Promise<string> => {
  const account = await getAccount(sourceAddress);
  return new StellarSdk.TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(30)
    .build()
    .toXDR();
};

// ─── Public read functions ────────────────────────────────────────────────────

export const getStartupStatus = async (founderAddress: string) => {
  try {
    if (!founderAddress) return null;
    try { StellarSdk.StrKey.decodeEd25519PublicKey(founderAddress); } catch { return null; }

    const contract = new StellarSdk.Contract(CONTRACT_ID);
    const txXdr = await buildTxXdr(
      founderAddress,
      contract.call('get_startup_status', StellarSdk.Address.fromString(founderAddress).toScVal())
    );
    const xdr = await rpcSimulate(txXdr);
    if (!xdr) return null;
    return decodeScVal(xdr);
  } catch (error) {
    console.error('Error fetching startup status:', error);
    return null;
  }
};

export const getAdmin = async () => {
  try {
    const contract = new StellarSdk.Contract(CONTRACT_ID);
    const txXdr = await buildTxXdr(DUMMY, contract.call('get_admin'));
    const xdr = await rpcSimulate(txXdr);
    if (!xdr) return null;
    return decodeScVal(xdr);
  } catch (error) {
    console.error('Error fetching admin:', error);
    return null;
  }
};

export const getAllStartups = async () => {
  try {
    const contract = new StellarSdk.Contract(CONTRACT_ID);
    const txXdr = await buildTxXdr(DUMMY, contract.call('get_all_startups'));
    const xdr = await rpcSimulate(txXdr);
    if (!xdr) return [];
    return decodeScVal(xdr) ?? [];
  } catch (error) {
    console.error('Error fetching all startups:', error);
    return [];
  }
};

export const getVCStakeRequired = async () => {
  try {
    const contract = new StellarSdk.Contract(CONTRACT_ID);
    const txXdr = await buildTxXdr(DUMMY, contract.call('get_vc_stake_required'));
    const xdr = await rpcSimulate(txXdr);
    if (!xdr) return '0';
    return decodeScVal(xdr) ?? '0';
  } catch (error) {
    console.error('Error fetching VC stake required:', error);
    return '0';
  }
};

export const getVCData = async (vcAddress: string) => {
  try {
    const contract = new StellarSdk.Contract(CONTRACT_ID);
    const txXdr = await buildTxXdr(
      DUMMY,
      contract.call('get_vc_data', StellarSdk.Address.fromString(vcAddress).toScVal())
    );
    const xdr = await rpcSimulate(txXdr);
    if (!xdr) return null;
    return decodeScVal(xdr);
  } catch (error) {
    console.error('Error fetching VC data:', error);
    return null;
  }
};

export const getAllVCs = async () => {
  try {
    const contract = new StellarSdk.Contract(CONTRACT_ID);
    const txXdr = await buildTxXdr(DUMMY, contract.call('get_all_vcs'));
    const xdr = await rpcSimulate(txXdr);
    if (!xdr) return [];
    return decodeScVal(xdr) ?? [];
  } catch (error) {
    console.error('Error fetching all VCs:', error);
    return [];
  }
};

// Export getAccount for use in components (uses Horizon, not Soroban RPC)
export { getAccount };
