import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://olxbvznbdxkwlozehceb.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ThqlXhZqfj96JWQ_iCAuuQ_VRYQ8fYE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const getChatId = (founderAddress: string, vcAddress: string) => {
  // Deterministic chat ID — always same regardless of who calls it
  const sorted = [founderAddress, vcAddress].sort();
  return `${sorted[0]}_${sorted[1]}`;
};
