import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { requireAdminTenant } from "../_shared/requireAdminTenant.ts";

serve(async (req) => {
  try {
    const me = await requireAdminTenant(req.headers.get('authorization'));
    const admin = adminClient();
    const { id } = await req.json().catch(() => ({})) as { id: string };
    if (!id) throw new Error('Missing id');

    const { error: aErr } = await admin.auth.admin.deleteUser(id);
    if (aErr) throw new Error(`Auth delete failed: ${aErr.message}`);

    const { data: del, error: dErr } = await admin
      .from('profiles').delete().eq('id', id).eq('tenant_id', me.tenant_id).select('id');
    if (dErr) throw new Error(dErr.message);
    if (!del || del.length === 0) throw new Error('Profile deletion returned 0 rows');

    await admin.from('audit_logs').insert({
      tenant_id: me.tenant_id, actor_id: me.id, entity: 'profiles', entity_id: id,
      action: 'delete', before: { id }, after: null
    });

    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" }});
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), { status: 400, headers: { "Content-Type": "application/json" }});
  }
});