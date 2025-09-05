import React from 'react';

export default function EnvDebug() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return (
    <main style={{padding:24,fontFamily:'system-ui'}}>
      <h1>Env Debug</h1>
      <p><b>VITE_SUPABASE_URL:</b> {url ? url : '⛔ undefined'}</p>
      <p><b>VITE_SUPABASE_ANON_KEY length:</b> {anon ? anon.length : '⛔ undefined'}</p>
      <pre style={{background:'#f7f7f7',padding:12}}>
        {JSON.stringify(import.meta.env, null, 2)}
      </pre>
      <p style={{opacity:.7}}>If any value shows as undefined, Vite isn't picking up .env.local.</p>
    </main>
  );
}