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

class AuthError extends Error {
  status: number;
  constructor(message: string, status = 400) { // Default to 400 for client errors
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const admin = adminClient();
    const { orgKey, username, password } = await req.json();
    const invalidCredsMessage = "Invalid username or password.";

    if (!orgKey || !username || !password) {
      throw new AuthError("Organisation key, username, and password are required.", 400);
    }

    // 1. Validate the Organisation Key first.
    const { data: org, error: orgError } = await admin
      .from('orgs')
      .select('id')
      .eq('organisation_key', orgKey)
      .single();

    if (orgError || !org) {
      throw new AuthError("Invalid organisation key", 400);
    }

    let emailToLogin: string | undefined;

    // 2. Find the user's email.
    if (username.includes('@')) {
      emailToLogin = username;
    } else {
      const { data: profile, error: profileError } = await admin
        .from('profiles')
        .select('user_id')
        .eq('org_id', org.id)
        .eq('full_name', username)
        .single();

      if (profileError || !profile) {
        throw new AuthError(invalidCredsMessage, 400);
      }
      
      const { data: authUser, error: authUserError } = await admin.auth.admin.getUserById(profile.user_id);
      if (authUserError || !authUser.user) {
        throw new AuthError(invalidCredsMessage, 400);
      }
      emailToLogin = authUser.user.email;
    }

    if (!emailToLogin) {
        throw new AuthError(invalidCredsMessage, 400);
    }
    
    // 3. Attempt to sign in.
    const { data: sessionData, error: sessionError } = await admin.auth.signInWithPassword({
      email: emailToLogin,
      password,
    });

    if (sessionError) {
      throw new AuthError(sessionError.message, 400);
    }

    // 4. Final validation: Ensure the logged-in user belongs to the specified organisation.
    const loggedInUserId = sessionData.user.id;
    const { data: userProfile, error: finalCheckError } = await admin
        .from('profiles')
        .select('id, org_id, role')
        .eq('id', loggedInUserId)
        .eq('org_id', org.id)
        .single();

    if (finalCheckError || !userProfile) {
        await admin.auth.signOut(sessionData.session.access_token);
        throw new AuthError(invalidCredsMessage, 400);
    }

    // 5. Success: Update active session token (only for non-customers).
    if (sessionData.session) {
      // Only enforce single session for non-customer accounts
      if (userProfile.role !== 'customer') {
        await admin
          .from('profiles')
          .update({ active_session_token: sessionData.session.access_token })
          .eq('id', sessionData.session.user.id);
      }
    }

    // 6. Return the full Supabase auth data on success.
    return new Response(
      JSON.stringify(sessionData),
      { 
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      },
    );

  } catch (e) {
    const error = e as AuthError | Error;
    const status = (error instanceof AuthError) ? error.status : 500;
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
});