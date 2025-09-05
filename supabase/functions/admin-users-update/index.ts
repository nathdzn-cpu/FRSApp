// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { requireAdminTenant } from "../_shared/requireAdminTenant.ts";

serve(async (req) => {
  try {
    const me = await requireAdminTenant(req.headers.get('authorization'));
    const admin = adminClient();
    const body = await req.json().catch(() => ({}));
    const { id, changes } = body as { id: string; changes: Record<string, any> };
    if (!id || !changes) throw new Error('Missing id/changes');

    const { data: before, error: bErr } = await admin
      .from('profiles').select('*').eq('id', id).eq('tenant_id', me.tenant_id).single();
    if (bErr) throw new Error('User not found in tenant');

    const { data: updated, error: uErr } = await admin
      .from('profiles').update(changes).eq('id', id).eq('tenant_id', me.tenant_id).select().single();
    if (uErr) throw new Error(uErr.message);

    await admin.from('audit_logs').insert({
      tenant_id: me.tenant_id, actor_id: me.id, entity: 'profiles', entity_id: id,
      action: 'update', before, after: updated
    });

    return new Response(JSON.stringify({ ok: true, profile: updated }), { headers: { "Content-Type": "application/json" }});
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), { status: 400, headers: { "Content-Type": "application/json" }});
  }
});