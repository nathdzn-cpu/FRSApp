"use client";

import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';

function App() {
  const session = useSession();
  const supabase = useSupabaseClient();

  console.log("Session value:", session);

  if (session === undefined) {
    return <div>Loading session…</div>;
  }

  if (!session) {
    return (
      <div>
        <p>No session found → please log in</p>
        <button onClick={async () => {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: "test@example.com",
            password: "password123"
          });
          console.log("Login result:", data, error);
        }}>
          Test Login
        </button>
      </div>
    );
  }

  return <div>Logged in! Session: <pre>{JSON.stringify(session, null, 2)}</pre></div>;
}

export default App;