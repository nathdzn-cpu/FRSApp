import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY!; // Using VITE_SUPABASE_KEY for consistency with project setup

if (!supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL is missing — check .env.local placement and spelling');
}
if (!supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_KEY is missing — check .env.local placement and spelling');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});