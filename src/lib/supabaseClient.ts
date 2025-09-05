import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hrastslmlkkfwsdsbbcn.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY; // Using VITE_ prefix for Vite environment variables

if (!supabaseKey) {
  console.error("SUPABASE_KEY is not set in environment variables. Please create a .env.local file.");
}

export const supabase = createClient(supabaseUrl, supabaseKey || 'YOUR_ANON_KEY_HERE'); // Fallback for development if key is missing