import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://cmitzlpyzkehsnshuhxl.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_6B8Oq8ztr1X29usq11zM_Q_Nt5E4JIR';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const getChatId = (founderAddress: string, vcAddress: string) => {
  // Deterministic chat ID — always same regardless of who calls it
  const sorted = [founderAddress, vcAddress].sort();
  return `${sorted[0]}_${sorted[1]}`;
};

// ── Analytics helpers ─────────────────────────────────────────────────────────

// Call once when wallet connects — tracks DAU
export const trackSession = async (walletAddress: string, role: 'founder' | 'vc' | 'admin' | 'visitor') => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('wallet_sessions')
      .select('id')
      .eq('wallet_address', walletAddress)
      .eq('date', today)
      .maybeSingle();
    if (!data) {
      await supabase.from('wallet_sessions').insert({ wallet_address: walletAddress, role, date: today });
    }
  } catch { /* non-critical */ }
};

// Track feature usage events
export const trackEvent = async (walletAddress: string, event: string, metadata: Record<string, unknown> = {}) => {
  try {
    await supabase.from('page_events').insert({ wallet_address: walletAddress, event, metadata });
  } catch { /* non-critical */ }
};
