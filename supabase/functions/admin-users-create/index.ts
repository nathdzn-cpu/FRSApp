// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function adminClient() {
  const url = Deno.env.get("URL");
  const serviceKey = Deno.env.get("SERVICE_ROLE_KEY");
  if (!url || !serviceKey) throw new Error("Missing URL or SERVICE_ROLE_KEY");
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

function userClient(authHeader: string | null) {
  const url = Deno.env.get("URL")!;
  const anon = Deno.env.get("ANON_KEY")!;
  const token =
    (authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : "") || "";
  return createClient(url, anon, {
    global: { headers: { Authorization: token ? `Bearer ${token}` : "" } },
    auth: { persistSession: false },
  });
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);

serve(async (req) => {
  try {
    const admin = adminClient();
    const user = userClient(req.headers.get("authorization"));

    // 1) Caller must be signed in and an admin
const { data: authUser } = await user.auth.getUser();

if (!authUser?.user?.id) {
  throw new Error("Not signed in or no auth user ID");
}

const { data: me, error: meErr } = await user
  .from("profiles")
  .select("id, role, tenant_id")
  .eq("id", authUser.user.id)
  .single();

if (meErr) throw new Error("Profile lookup failed: " + meErr.message);
if (!me || me.role !== "admin") throw new Error("Access denied (admin only)");


    console.log("DEBUG: profile lookup", { me, meErr });

    if (meErr || !me) {
      throw new Error(
        "Not signed in or profile lookup failed: " + (meErr?.message || "none"),
      );
    }
    if (me.role !== "admin") {
      throw new Error("Access denied (admin only)");
    }

    // 2) Parse body
    const body = await req.json().catch(() => ({}));
    console.log("DEBUG: request body", body);

    const kind = body?.kind as "driver" | "office";
    if (!kind) throw new Error("Missing 'kind' (driver|office)");

    const full_name = (body?.full_name || "").trim();
    const email = (body?.email || "").trim();
    const tempPassword = (body?.tempPassword || "").trim();
    const phone = (body?.phone || "").trim();
    const dob = body?.dob ?? null;
    const truck_reg = body?.truck_reg ?? null;
    const trailer_no = body?.trailer_no ?? null;

    if (!full_name) throw new Error("full_name is required");
    if (!email) throw new Error("email is required");
    if (!tempPassword) throw new Error("tempPassword is required");
    if (!phone) throw new Error("phone is required");

    // 3) Create Auth user
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });

    console.log("DEBUG: created user", { created, cErr });

    if (cErr) throw new Error("Auth create failed: " + cErr.message);
    const authId = created.user?.id;
    if (!authId) throw new Error("Auth user id missing");

    // 4) Build profile payload
    const user_id = `${kind}_${slugify(full_name)}`;
    const profile: Record<string, any> = {
      id: authId,
      tenant_id: me.tenant_id ?? null,
      full_name,
      phone,
      role: kind,
      user_id,
    };
    if (dob) profile.dob = dob;
    if (kind === "driver") {
      profile.truck_reg = truck_reg ?? null;
      profile.trailer_no = trailer_no ?? null;
    }

    // 5) Insert profile
    const { data: ins, error: iErr } = await admin
      .from("profiles")
      .insert(profile)
      .select()
      .single();

    console.log("DEBUG: insert profile", { ins, iErr });

    if (iErr) throw new Error("Profile insert failed: " + iErr.message);

    // 6) Audit (optional)
    await admin.from("audit_logs").insert({
      tenant_id: me.tenant_id ?? null,
      actor_id: me.id,
      entity: "profiles",
      entity_id: authId,
      action: "create",
      before: null,
      after: { role: kind, full_name, user_id },
    }).catch((e) => console.log("DEBUG: audit insert failed", e.message));

    return new Response(
      JSON.stringify({ ok: true, profile: ins }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("DEBUG: function error", e);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});
