import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hrastslmlkkfwsdsbbcn.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY; // Using VITE_ prefix for Vite environment variables

if (!supabaseKey) {
  console.error("SUPABASE_KEY is not set in environment variables. Please create a .env.local file.");
  // You might want to render a friendly message in the UI or handle this more gracefully
  // For now, we'll proceed, but operations requiring auth will fail.
}

export const supabase = createClient(supabaseUrl, supabaseKey || 'YOUR_ANON_KEY_HERE'); // Fallback for development if key is missing