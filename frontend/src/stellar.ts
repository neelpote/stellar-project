import * as StellarSdk from '@stellar/stellar-sdk';
import { CONTRACT_ID, SOROBAN_RPC_URL, NETWORK_PASSPHRASE } from './config';

export const server = new StellarSdk.SorobanRpc.Server(SOROBAN_RPC_URL);

// ─── Raw RPC helper ───────────────────────────────────────────────────────────
// The SDK v12 crashes parsing Option<T> XDR responses.
// We call the Soroban JSON-RPC directly and decode the base64 XDR ourselves.

let _rpcId = 1;

const rpcSimulate = async (xdrBase64: string): Promise<StellarSdk.xdr.ScVal | null> => {
  const res = await fetch(SOROBAN_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: _rpcId++,
      method: 'simulateTransaction',
      params: { transaction: xdrBase64 },
    }),
  });

  const json = await res.json();
  const results = json?.result?.results;
  if (!results || results.length === 0) return null;

  const xdr = results[0]?.xdr;
  if (!xdr) return null;

  // Decode the base64 XDR ScVal directly
  return StellarSdk.xdr.ScVal.fromXDR(xdr, 'base64');
};

// ─── Option<T> parser ─────────────────────────────────────────────────────────
// Soroban encodes Option::Some(x) as scvMap [{ key: sym("Some"), val: x }]
// and Option::None as scvVoid or scvMap [{ key: sym("None"), val: void }]

const unwrapOption = (scVal: StellarSdk.xdr.ScVal): StellarSdk.xdr.ScVal | null => {
  if (scVal.switch().value === StellarSdk.xdr.ScValType.scvVoid().value) return null;

  if (scVal.switch().value === StellarSdk.xdr.ScValType.scvMap().value) {
    const entries = scVal.map() ?? [];
    if (entries.length === 0) return null;
    const key = entries[0].key();
    if (key.switch().value === StellarSdk.xdr.ScValType.scvSymbol().value) {
      const sym = key.sym().toString();
      if (sym === 'None') return null;
      if (sym === 'Some') return entries[0].val();
    }
  }
  return scVal; // not an Option wrapper, return as-is
};

const scValToNativeSafe = (scVal: StellarSdk.xdr.ScVal): any => {
  try {
    return StellarSdk.scValToNative(scVal);
  } catch {
    return null;
  }
};

// ─── Build a simulation transaction XDR ──────────────────────────────────────

const buildSimTx = async (
  sourceAddress: string,
  operation: StellarSdk.xdr.Operation
): Promise<string> => {
  const account = await server.getAccount(sourceAddress);
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();
  return tx.toXDR();
};

const DUMMY = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

// ─── Public API ───────────────────────────────────────────────────────────────

export const getStartupStatus = async (founderAddress: string) => {
  try {
    if (!founderAddress) return null;
    try { StellarSdk.StrKey.decodeEd25519PublicKey(founderAddress); } catch { return null; }

    const contract = new StellarSdk.Contract(CONTRACT_ID);
    const xdr = await buildSimTx(
      founderAddress,
      contract.call('get_startup_status', StellarSdk.Address.fromString(founderAddress).toScVal())
    );

    const raw = await rpcSimulate(xdr);
    if (!raw) return null;

    const inner = unwrapOption(raw);
    if (!inner) return null;

    return scValToNativeSafe(inner);
  } catch (error) {
    console.error('Error fetching startup status:', error);
    return null;
  }
};

export const getAdmin = async () => {
  try {
    const contract = new StellarSdk.Contract(CONTRACT_ID);
    const xdr = await buildSimTx(DUMMY, contract.call('get_admin'));
    const raw = await rpcSimulate(xdr);
    if (!raw) return null;
    return scValToNativeSafe(raw);
  } catch (error) {
    console.error('Error fetching admin:', error);
    return null;
  }
};

export const getAllStartups = async () => {
  try {
    const contract = new StellarSdk.Contract(CONTRACT_ID);
    const xdr = await buildSimTx(DUMMY, contract.call('get_all_startups'));
    const raw = await rpcSimulate(xdr);
    if (!raw) return [];
    return scValToNativeSafe(raw) ?? [];
  } catch (error) {
    console.error('Error fetching all startups:', error);
    return [];
  }
};

export const getVCStakeRequired = async () => {
  try {
    const contract = new StellarSdk.Contract(CONTRACT_ID);
    const xdr = await buildSimTx(DUMMY, contract.call('get_vc_stake_required'));
    const raw = await rpcSimulate(xdr);
    if (!raw) return '0';
    return scValToNativeSafe(raw) ?? '0';
  } catch (error) {
    console.error('Error fetching VC stake required:', error);
    return '0';
  }
};

export const getVCData = async (vcAddress: string) => {
  try {
    const contract = new StellarSdk.Contract(CONTRACT_ID);
    const xdr = await buildSimTx(
      DUMMY,
      contract.call('get_vc_data', StellarSdk.Address.fromString(vcAddress).toScVal())
    );
    const raw = await rpcSimulate(xdr);
    if (!raw) return null;
    const inner = unwrapOption(raw);
    if (!inner) return null;
    return scValToNativeSafe(inner);
  } catch (error) {
    console.error('Error fetching VC data:', error);
    return null;
  }
};

export const getAllVCs = async () => {
  try {
    const contract = new StellarSdk.Contract(CONTRACT_ID);
    const xdr = await buildSimTx(DUMMY, contract.call('get_all_vcs'));
    const raw = await rpcSimulate(xdr);
    if (!raw) return [];
    return scValToNativeSafe(raw) ?? [];
  } catch (error) {
    console.error('Error fetching all VCs:', error);
    return [];
  }
};
