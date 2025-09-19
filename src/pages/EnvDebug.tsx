import React from 'react';

export default function EnvDebug() {
  return (
    <div className="w-full">
      <main style={{padding:24,fontFamily:'system-ui'}}>
        <h1>Env Debug</h1>
        <p><b>VITE_SUPABASE_URL:</b> {import.meta.env.VITE_SUPABASE_URL || '⛔ undefined'}</p>
        <p><b>VITE_SUPABASE_ANON_KEY length:</b> {import.meta.env.VITE_SUPABASE_ANON_KEY?.length || '⛔ undefined'}</p>
        <pre style={{background:'#f7f7f7',padding:12}}>
          {JSON.stringify(import.meta.env, null, 2)}
        </pre>
        <p style={{opacity:.7}}>If any value shows as undefined, Vite isn't picking up .env.local.</p>
      </main>
    </div>
  );
}