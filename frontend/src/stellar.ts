import * as StellarSdk from '@stellar/stellar-sdk';
import { CONTRACT_ID, SOROBAN_RPC_URL, NETWORK_PASSPHRASE } from './config';

const server = new StellarSdk.SorobanRpc.Server(SOROBAN_RPC_URL);

// Parse a Soroban Option<struct> from raw XDR map entries
// Option::Some is encoded as scvMap [{ key: scvSymbol("Some"), val: <inner> }]
// Option::None is encoded as scvMap [{ key: scvSymbol("None"), val: scvVoid }]
const parseOptionMap = (scVal: StellarSdk.xdr.ScVal): any => {
  const switchName = scVal.switch().name;

  if (switchName === 'scvVoid') return null;

  if (switchName === 'scvMap') {
    const entries = scVal.map() ?? [];
    if (entries.length === 0) return null;

    const firstKey = entries[0].key();
    if (firstKey.switch().name === 'scvSymbol') {
      const sym = firstKey.sym().toString();
      if (sym === 'None') return null;
      if (sym === 'Some') {
        // inner value is the struct map
        return parseStructMap(entries[0].val());
      }
    }
    // Not an Option wrapper — parse as struct directly
    return parseStructMap(scVal);
  }

  // Primitive fallback
  try { return StellarSdk.scValToNative(scVal); } catch { return null; }
};

// Parse a Soroban struct (scvMap of field entries) into a plain JS object
const parseStructMap = (scVal: StellarSdk.xdr.ScVal): any => {
  if (scVal.switch().name !== 'scvMap') {
    try { return StellarSdk.scValToNative(scVal); } catch { return null; }
  }

  const entries = scVal.map() ?? [];
  const result: Record<string, any> = {};

  for (const entry of entries) {
    const key = entry.key();
    const val = entry.val();
    let fieldName: string;

    if (key.switch().name === 'scvSymbol') {
      fieldName = key.sym().toString();
    } else if (key.switch().name === 'scvString') {
      fieldName = key.str().toString();
    } else {
      continue;
    }

    try {
      result[fieldName] = StellarSdk.scValToNative(val);
    } catch {
      // nested struct or option
      result[fieldName] = parseOptionMap(val);
    }
  }

  return result;
};

export const getStartupStatus = async (founderAddress: string) => {
  try {
    if (!founderAddress) return null;
    try { StellarSdk.StrKey.decodeEd25519PublicKey(founderAddress); } catch { return null; }

    const contract = new StellarSdk.Contract(CONTRACT_ID);
    const sourceAccount = await server.getAccount(founderAddress);

    const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: '100', networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call('get_startup_status', StellarSdk.Address.fromString(founderAddress).toScVal()))
      .setTimeout(30).build();

    const simulated = await server.simulateTransaction(transaction);

    if (StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulated)) {
      // Access raw XDR to avoid SDK parsing bugs with Option<T>
      const raw = (simulated as any).result?.retval;
      if (!raw) return null;
      return parseOptionMap(raw);
    }

    return null;
  } catch (error) {
    console.error('Error fetching startup status:', error);
    return null;
  }
};

export const getAdmin = async () => {
  try {
    const contract = new StellarSdk.Contract(CONTRACT_ID);
    const dummyAccount = await server.getAccount('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF');

    const transaction = new StellarSdk.TransactionBuilder(dummyAccount, {
      fee: '100', networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call('get_admin'))
      .setTimeout(30).build();

    const simulated = await server.simulateTransaction(transaction);

    if (StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulated)) {
      const raw = (simulated as any).result?.retval;
      if (!raw) return null;
      try { return StellarSdk.scValToNative(raw); } catch { return parseOptionMap(raw); }
    }

    return null;
  } catch (error) {
    console.error('Error fetching admin:', error);
    return null;
  }
};

export const getAllStartups = async () => {
  try {
    const contract = new StellarSdk.Contract(CONTRACT_ID);
    const dummyAccount = await server.getAccount('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF');

    const transaction = new StellarSdk.TransactionBuilder(dummyAccount, {
      fee: '100', networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call('get_all_startups'))
      .setTimeout(30).build();

    const simulated = await server.simulateTransaction(transaction);

    if (StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulated)) {
      const raw = (simulated as any).result?.retval;
      if (!raw) return [];
      try {
        const addresses = StellarSdk.scValToNative(raw);
        return addresses || [];
      } catch { return []; }
    }

    return [];
  } catch (error) {
    console.error('Error fetching all startups:', error);
    return [];
  }
};

export const getVCStakeRequired = async () => {
  try {
    const contract = new StellarSdk.Contract(CONTRACT_ID);
    const dummyAccount = await server.getAccount('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF');

    const transaction = new StellarSdk.TransactionBuilder(dummyAccount, {
      fee: '100', networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call('get_vc_stake_required'))
      .setTimeout(30).build();

    const simulated = await server.simulateTransaction(transaction);

    if (StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulated)) {
      const raw = (simulated as any).result?.retval;
      if (!raw) return '0';
      try { return StellarSdk.scValToNative(raw); } catch { return '0'; }
    }

    return '0';
  } catch (error) {
    console.error('Error fetching VC stake required:', error);
    return '0';
  }
};

export const getVCData = async (vcAddress: string) => {
  try {
    const contract = new StellarSdk.Contract(CONTRACT_ID);
    const dummyAccount = await server.getAccount('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF');

    const transaction = new StellarSdk.TransactionBuilder(dummyAccount, {
      fee: '100', networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call('get_vc_data', StellarSdk.Address.fromString(vcAddress).toScVal()))
      .setTimeout(30).build();

    const simulated = await server.simulateTransaction(transaction);

    if (StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulated)) {
      const raw = (simulated as any).result?.retval;
      if (!raw) return null;
      return parseOptionMap(raw);
    }

    return null;
  } catch (error) {
    console.error('Error fetching VC data:', error);
    return null;
  }
};

export const getAllVCs = async () => {
  try {
    const contract = new StellarSdk.Contract(CONTRACT_ID);
    const dummyAccount = await server.getAccount('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF');

    const transaction = new StellarSdk.TransactionBuilder(dummyAccount, {
      fee: '100', networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call('get_all_vcs'))
      .setTimeout(30).build();

    const simulated = await server.simulateTransaction(transaction);

    if (StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulated)) {
      const raw = (simulated as any).result?.retval;
      if (!raw) return [];
      try {
        const addresses = StellarSdk.scValToNative(raw);
        return addresses || [];
      } catch { return []; }
    }

    return [];
  } catch (error) {
    console.error('Error fetching all VCs:', error);
    return [];
  }
};

export { server };
