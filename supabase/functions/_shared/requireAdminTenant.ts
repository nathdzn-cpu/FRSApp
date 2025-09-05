// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const url = Deno.env.get('SUPABASE_URL')!;
const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? ''; // optional

export async function requireAdminTenant(authHeader: string | null) {
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Missing bearer token');
  const token = authHeader.substring('Bearer '.length);

  // Use a client with the caller's JWT to read their profile
  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });

  const { data: me, error } = await userClient
    .from('profiles')
    .select('id, tenant_id, role')
    .single();

  if (error) throw new Error('Not signed in or profile missing');
  if (me.role !== 'admin') throw new Error('Access denied');
  return me as { id: string; tenant_id: string; role: 'admin' };
}