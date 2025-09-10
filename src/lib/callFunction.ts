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
  try { 
    const text = await res.text();
    if (text) {
      json = JSON.parse(text); 
    }
  } catch (e) {
    console.error(`Failed to parse JSON response from function ${name}:`, e);
  }

  if (!res.ok || json?.error) {
    const msg = json?.error || `Function ${name} failed (${res.status})`;
    throw new Error(msg);
  }
  return json as T;
}