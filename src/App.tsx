"use client";

import { useState } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";

function App() {
  const session = useSession();
  const supabase = useSupabaseClient();

  const [email, setEmail] = useState("admin@admin.com");
  const [password, setPassword] = useState("1234");
  const [errorMessage, setErrorMessage] = useState("");

  if (session === undefined) {
    return <div>Loading session…</div>;
  }

  if (!session) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "250px", margin: "50px auto" }}>
        <h2>Login</h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          onClick={async () => {
            setErrorMessage("");
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) setErrorMessage(error.message);
          }}
        >
          Login
        </button>
        {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <h2>Welcome, {session.user.email}</h2>
      <pre>{JSON.stringify(session.user, null, 2)}</pre>
      <button onClick={() => supabase.auth.signOut()}>Logout</button>
    </div>
  );
}

export default App;