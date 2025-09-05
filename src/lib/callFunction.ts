import { supabase } from "./supabaseClient";

export async function callFn<T = any>(name: string, payload?: any): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
    },
    body: payload ? JSON.stringify(payload) : undefined
  });

  let json: any = {};
  try { json = await res.json(); } catch {}

  if (!res.ok || json?.ok === false) {
    const msg = json?.error || `Function ${name} failed (${res.status})`;
    throw new Error(msg);
  }
  return json as T;
}