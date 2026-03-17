// Stellar Testnet Configuration
export const NETWORK_PASSPHRASE = import.meta.env.VITE_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015';
export const HORIZON_URL = import.meta.env.VITE_HORIZON_URL || 'https://horizon-testnet.stellar.org';
export const SOROBAN_RPC_URL = import.meta.env.VITE_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';

// Contract Configuration - NO MORE HARDCODED VALUES
export const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID || 'CBMWKDCBCZLLZRKU7WAFCGLJ4TK6AANGUSPC2GOIOFCT56WGFLIEMJUR';

// Native XLM Token Contract Address (Soroban)
export const TESTNET_XLM_CONTRACT = import.meta.env.VITE_XLM_TOKEN_CONTRACT || 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';

// Application fee in stroops (10 XLM = 100000000 stroops)
export const APPLICATION_FEE_STROOPS = import.meta.env.VITE_APPLICATION_FEE || '100000000';

// Version identifier for cache busting - Force deployment
export const APP_VERSION = 'XLM_MIGRATION_v2.0.0_PRODUCTION';

// Feature Flags
export const ENABLE_MILESTONE_SYSTEM = import.meta.env.VITE_ENABLE_MILESTONE_SYSTEM === 'true';
export const MIN_VOTE_BALANCE = Number(import.meta.env.VITE_MIN_VOTE_BALANCE) || 100;

// Type-safe configuration object
export const config = {
  network: {
    passphrase: NETWORK_PASSPHRASE,
    horizonUrl: HORIZON_URL,
    sorobanRpcUrl: SOROBAN_RPC_URL,
  },
  contracts: {
    decoContract: CONTRACT_ID,
    xlmToken: TESTNET_XLM_CONTRACT,
  },
  fees: {
    applicationFee: APPLICATION_FEE_STROOPS,
  },
  features: {
    milestoneSystem: ENABLE_MILESTONE_SYSTEM,
    minVoteBalance: MIN_VOTE_BALANCE,
  },
  app: {
    version: APP_VERSION,
  },
} as const;

// Type export for TypeScript
export type AppConfig = typeof config;
