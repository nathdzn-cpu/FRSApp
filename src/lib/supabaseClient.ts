import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_KEY; // Changed from VITE_SUPABASE_ANON_KEY to VITE_SUPABASE_KEY

if (!url) {
  throw new Error('VITE_SUPABASE_URL is missing — check .env.local placement and spelling');
}
if (!anon) {
  throw new Error('VITE_SUPABASE_KEY is missing — check .env.local placement and spelling'); // Updated error message
}

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});