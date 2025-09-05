import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { callFn } from "@/lib/callFunction";

export default function UsersDebug() {
  const [me, setMe] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [log, setLog] = useState<string>("");

  useEffect(() => {
    (async () => {
      setErr(null);
      const { data: auth } = await supabase.auth.getUser();
      const { data: profile, error } = await supabase.from("profiles").select("id, role, tenant_id, full_name").single();
      if (error) setErr(error.message);
      setMe({ authUser: auth.user, profile });
    })();
  }, []);

  async function create(kind: "driver" | "office") {
    setErr(null);
    setLog("Working…");
    try {
      const stamp = Math.random().toString(36).slice(2, 6);
      const full_name = kind === "driver" ? `Driver Test ${stamp}` : `Office Test ${stamp}`;
      const email = `${kind}.${stamp}@example.test`;
      const tempPassword = "TempPassword!123";

      const payload: any = { kind, email, tempPassword, full_name, phone: "07000000000" };
      if (kind === "driver") {
        // OPTIONAL: deliberately omit truck_reg/trailer_no to prove it's optional
      }

      const res: any = await callFn("admin-users-create", payload);
      setLog(JSON.stringify(res, null, 2));
    } catch (e: any) {
      setErr(e.message || String(e));
      setLog("");
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Admin → Users Debug</h1>
      {err && <p style={{ color: "crimson" }}>Error: {err}</p>}
      <section style={{ marginTop: 12 }}>
        <h3>Me</h3>
        <pre style={{ background: "#f7f7f7", padding: 12 }}>
{JSON.stringify(me, null, 2)}
        </pre>
      </section>

      <section style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button onClick={() => create("driver")}>Create TEST Driver</button>
        <button onClick={() => create("office")}>Create TEST Office</button>
      </section>

      <section style={{ marginTop: 12 }}>
        <h3>Last result</h3>
        <pre style={{ background: "#f7f7f7", padding: 12, minHeight: 120 }}>
{log || "—"}
        </pre>
      </section>

      <p style={{ opacity: 0.7, marginTop: 12 }}>
        This page proves your JWT (admin), tenant_id, and the Edge Function wiring. Any failure shows the exact error.
      </p>
    </main>
  );
}