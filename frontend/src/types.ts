export interface StartupData {
  ipfs_cid: string;
  funding_goal: string;
  total_allocated: string;
  unlocked_balance: string;
  claimed_balance: string;
  voting_end_time: number | bigint;
  yes_votes: number | bigint;
  no_votes: number | bigint;
  approved: boolean;
  exists: boolean;
  // milestone vesting
  milestone_enabled: boolean;
  total_milestones: number;
  current_milestone: number;
  escrowed_funds: string;
}

export interface ProjectMetadata {
  project_name: string;
  description: string;
  project_url: string;
  team_info: string;
  timestamp: number;
}

export interface StartupWithMetadata extends StartupData {
  metadata?: ProjectMetadata;
  metadataLoading?: boolean;
  metadataError?: boolean;
}

export interface VCData {
  vc_address: string;
  company_name: string;
  stake_amount: string;
  total_invested: string;
  exists: boolean;
}

export interface WalletState {
  publicKey: string | null;
  isConnected: boolean;
}
