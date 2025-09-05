import { supabase } from './supabaseClient';

export async function callFn<T=any>(name: string, payload?: any): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
    },
    body: payload ? JSON.stringify(payload) : undefined
  });
  const json = await res.json();
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error || `Function ${name} failed`);
  }
  return json;
}