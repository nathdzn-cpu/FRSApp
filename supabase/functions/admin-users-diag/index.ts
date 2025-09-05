import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { requireAdminTenant } from "../_shared/requireAdminTenant.ts";

serve(async (req) => {
  try {
    const me = await requireAdminTenant(req.headers.get('authorization'));
    const admin = adminClient();

    const id = crypto.randomUUID();

    const { data: ins, error: iErr } = await admin
      .from('profiles').insert({ id, tenant_id: me.tenant_id, full_name: 'Diag User', role: 'driver' })
      .select('id, tenant_id, full_name, role').single();
    if (iErr) throw new Error('INSERT failed: ' + iErr.message);

    const { data: read, error: rErr } = await admin
      .from('profiles').select('id, tenant_id, full_name, role').eq('id', id).single();
    if (rErr) throw new Error('SELECT failed: ' + rErr.message);

    const { data: del, error: dErr } = await admin
      .from('profiles').delete().eq('id', id).select('id').single();
    if (dErr) throw new Error('DELETE failed: ' + dErr.message);

    return new Response(JSON.stringify({ ok: true, created: ins, read, deleted: del }), { headers: { "Content-Type": "application/json" }});
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), { status: 400, headers: { "Content-Type": "application/json" }});
  }
});