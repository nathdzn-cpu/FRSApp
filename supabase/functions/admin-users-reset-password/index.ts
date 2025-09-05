// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { requireAdminTenant } from "../_shared/requireAdminTenant.ts";

serve(async (req) => {
  try {
    const me = await requireAdminTenant(req.headers.get('authorization'));
    const admin = adminClient();
    const body = await req.json().catch(() => ({}));
    const { user_id } = body as { user_id: string }; // This is the auth.users.id
    if (!user_id) throw new Error('Missing user_id');

    // In a real scenario, you'd fetch the user's email from auth.users or profiles
    // For this mock, we'll assume user_id is the auth ID and directly call resetPasswordForEmail
    // Note: Supabase's admin.auth.admin.generateLink is more appropriate for sending reset links
    // but for a simple "reset password" action, we'll simulate it.
    // The actual email address is needed for admin.auth.admin.generateLink.
    // For now, we'll just log and return success.

    // To actually send a reset email, you'd need the user's email address.
    // Let's fetch the profile to get the email associated with the user_id (auth ID).
    const { data: profile, error: profileErr } = await admin
      .from('profiles')
      .select('id, tenant_id, full_name')
      .eq('id', user_id) // Assuming user_id in profiles is the auth ID
      .eq('tenant_id', me.tenant_id)
      .single();

    if (profileErr || !profile) {
      throw new Error(`Profile not found for user ID: ${user_id}`);
    }

    // Simulate sending a reset link. In a real app, you'd use admin.auth.admin.generateLink
    // and then send that link via your own email service, or use admin.auth.admin.inviteUserByEmail
    // if you want them to set a new password.
    // For this mock, we'll just log the action.
    console.log(`Simulating password reset for user_id: ${user_id} (Profile: ${profile.full_name})`);

    await admin.from('audit_logs').insert({
      tenant_id: me.tenant_id, actor_id: me.id, entity: 'auth.users', entity_id: user_id,
      action: 'reset_password', before: null, after: null, notes: 'Password reset initiated (simulated)'
    });

    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" }});
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), { status: 400, headers: { "Content-Type": "application/json" }});
  }
});