// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { requireAdminTenant } from "../_shared/requireAdminTenant.ts";
import { slugifyName } from "../_shared/slug.ts";

serve(async (req) => {
  try {
    const me = await requireAdminTenant(req.headers.get('authorization'));
    const admin = adminClient();
    const body = await req.json().catch(() => ({}));
    const kind = body?.kind as 'driver' | 'office';

    if (!kind) throw new Error("Missing 'kind' (driver|office)");

    if (kind === 'driver') {
      const { email, tempPassword, full_name, dob, phone, truck_reg, trailer_no } = body;
      if (!email || !tempPassword || !full_name || !phone || !truck_reg) throw new Error('Missing fields');

      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email, password: tempPassword, email_confirm: true
      });
      if (cErr) throw new Error(cErr.message);
      const id = created.user?.id!;
      const user_id = `driver_${slugifyName(full_name)}`;

      const { data: ins, error: iErr } = await admin
        .from('profiles')
        .insert({
          id, tenant_id: me.tenant_id, full_name,
          dob: dob ?? null, phone, role: 'driver',
          user_id, truck_reg, trailer_no: trailer_no ?? null
        })
        .select()
        .single();
      if (iErr) throw new Error(iErr.message);

      await admin.from('audit_logs').insert({
        tenant_id: me.tenant_id, actor_id: me.id, entity: 'profiles', entity_id: id,
        action: 'create', before: null, after: { role: 'driver', full_name, user_id }
      });

      return new Response(JSON.stringify({ ok: true, profile: ins }), { headers: { "Content-Type": "application/json" }});
    }

    if (kind === 'office') {
      const { email, tempPassword, full_name, phone } = body;
      if (!email || !tempPassword || !full_name || !phone) throw new Error('Missing fields');

      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email, password: tempPassword, email_confirm: true
      });
      if (cErr) throw new Error(cErr.message);
      const id = created.user?.id!;
      const user_id = `office_${slugifyName(full_name)}`;

      const { data: ins, error: iErr } = await admin
        .from('profiles')
        .insert({ id, tenant_id: me.tenant_id, full_name, phone, role: 'office', user_id })
        .select()
        .single();
      if (iErr) throw new Error(iErr.message);

      await admin.from('audit_logs').insert({
        tenant_id: me.tenant_id, actor_id: me.id, entity: 'profiles', entity_id: id,
        action: 'create', before: null, after: { role: 'office', full_name, user_id }
      });

      return new Response(JSON.stringify({ ok: true, profile: ins }), { headers: { "Content-Type": "application/json" }});
    }

    throw new Error('Unsupported kind');
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), { status: 400, headers: { "Content-Type": "application/json" }});
  }
});