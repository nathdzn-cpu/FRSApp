// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function adminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const admin = adminClient();
    const body = await req.json();
    const { organisationName, fullName, email, contactNumber, password } = body;

    if (!organisationName || !fullName || !email || !password) {
      throw new Error("Missing required sign-up fields.");
    }

    // Placeholder for billing integration (e.g., Stripe)
    // In a real application, you would check for a successful payment here before proceeding.

    // 1. Generate a unique 5-digit org ID
    let display_id;
    let isUnique = false;
    let retries = 0;
    while (!isUnique && retries < 10) {
      display_id = Math.floor(10000 + Math.random() * 90000).toString();
      const { data, error } = await admin
        .from('orgs')
        .select('id')
        .eq('display_id', display_id)
        .single();
      if (!data && (!error || error.code === 'PGRST116')) {
        isUnique = true;
      } else if (error) {
        throw error;
      }
      retries++;
    }

    if (!isUnique) {
      throw new Error("Could not generate a unique organisation ID. Please try again.");
    }

    // 2. Create the organisation
    const { data: newOrg, error: orgError } = await admin
      .from('orgs')
      .insert({ name: organisationName, display_id })
      .select()
      .single();

    if (orgError) throw new Error(`Failed to create organisation: ${orgError.message}`);

    // 3. Create the admin user
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for simplicity
    });

    if (authError) {
      // Rollback org creation if user creation fails
      await admin.from('orgs').delete().eq('id', newOrg.id);
      throw new Error(`Failed to create user: ${authError.message}`);
    }

    const newUserId = authData.user.id;

    // The `handle_new_user` trigger creates a profile with default 'driver' role and null org_id.
    // We now need to update it with the correct details for the new admin.
    await new Promise(resolve => setTimeout(resolve, 200)); // Small delay for trigger

    const { data: updatedProfile, error: profileError } = await admin
      .from('profiles')
      .update({
        org_id: newOrg.id,
        full_name: fullName,
        phone: contactNumber,
        role: 'admin',
      })
      .eq('id', newUserId)
      .select()
      .single();

    if (profileError) {
      // Rollback user and org
      await admin.auth.admin.deleteUser(newUserId);
      await admin.from('orgs').delete().eq('id', newOrg.id);
      throw new Error(`Failed to update profile: ${profileError.message}`);
    }
    
    // Note: The user_orgs table is not used here, as profiles.org_id is the current source of truth for organisation membership.

    // 4. Create a session for the new user to log them in automatically
    const { data: sessionData, error: sessionError } = await admin.auth.signInWithPassword({
        email,
        password,
    });

    if (sessionError) {
        // This shouldn't happen if user creation was successful, but handle it just in case.
        throw new Error(`Failed to create session for new user: ${sessionError.message}`);
    }

    // Update profile with the new session token to enforce single session
    if (sessionData.session) {
      await admin
        .from('profiles')
        .update({ active_session_token: sessionData.session.access_token })
        .eq('id', newUserId);
    }

    return new Response(
      JSON.stringify(sessionData),
      { headers: { "Content-Type": "application/json", ...corsHeaders } },
    );

  } catch (e) {
    console.error("Sign-up function error:", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
});