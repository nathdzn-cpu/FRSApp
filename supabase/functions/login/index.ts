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
    const { orgKey, username, password } = await req.json();

    if (!orgKey || !username || !password) {
      throw new Error("Organisation key, username, and password are required.");
    }

    let emailToLogin = username;

    // If username is not an email, we need to find the email from the profile
    if (!username.includes('@')) {
      // 1. Find org_id from organisation_key
      const { data: org, error: orgError } = await admin
        .from('orgs')
        .select('id')
        .eq('organisation_key', orgKey)
        .single();

      if (orgError || !org) {
        throw new Error("Invalid organisation key.");
      }

      // 2. Find user's email from username (full_name) and org_id
      const { data: profile, error: profileError } = await admin
        .from('profiles')
        .select('user_id')
        .eq('org_id', org.id)
        .eq('full_name', username)
        .single();

      if (profileError || !profile) {
        if (profileError && profileError.code === 'PGRST116' && profileError.details.includes('multiple rows')) {
            throw new Error("Multiple users found with that name in this organisation. Please use email to log in.");
        }
        throw new Error("Invalid username or password.");
      }

      // 3. Get email from auth.users using user_id
      const { data: authUser, error: authUserError } = await admin.auth.admin.getUserById(profile.user_id);
      if (authUserError || !authUser.user) {
        throw new Error("Could not find authentication profile for this user.");
      }
      emailToLogin = authUser.user.email;
    }

    // 4. Sign in
    const { data: sessionData, error: sessionError } = await admin.auth.signInWithPassword({
      email: emailToLogin,
      password,
    });

    if (sessionError) {
      throw new Error("Invalid username or password.");
    }

    // 5. Update active session token to enforce single-session
    if (sessionData.session) {
      await admin
        .from('profiles')
        .update({ active_session_token: sessionData.session.access_token })
        .eq('id', sessionData.session.user.id);
    }

    return new Response(
      JSON.stringify(sessionData),
      { headers: { "Content-Type": "application/json", ...corsHeaders } },
    );

  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
});