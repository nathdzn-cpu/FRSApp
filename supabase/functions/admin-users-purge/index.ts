import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { requireAdminTenant } from "../_shared/requireAdminTenant.ts";

serve(async (req) => {
  try {
    const me = await requireAdminTenant(req.headers.get('authorization'));
    const admin = adminClient();

    const { data: targets, error: listErr } = await admin
      .from('profiles').select('id').eq('tenant_id', me.tenant_id).neq('role', 'admin');
    if (listErr) throw new Error(listErr.message);

    for (const t of targets ?? []) {
      await admin.auth.admin.deleteUser(t.id).catch(() => {});
    }
    const { data: del, error: delErr } = await admin
      .from('profiles').delete().eq('tenant_id', me.tenant_id).neq('role','admin').select('id');
    if (delErr) throw new Error(delErr.message);

    return new Response(JSON.stringify({ ok: true, removed: del?.length ?? 0 }), { headers: { "Content-Type": "application/json" }});
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), { status: 400, headers: { "Content-Type": "application/json" }});
  }
});