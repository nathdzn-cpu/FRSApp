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

// Custom error for handling specific HTTP status codes
class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
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
    const invalidCredsError = "Invalid username or password.";

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
      throw new AuthError("Invalid organisation key.");
    }

    let emailToLogin: string | undefined;

    // 2. Find the user's email, strictly within the context of the given organisation if possible.
    if (username.includes('@')) {
      // If logging in with email, we can't pre-filter by org.
      // The final validation after password check becomes critical.
      emailToLogin = username;
    } else {
      // If logging in with a username (full_name), we can and must find the user within the org.
      const { data: profile, error: profileError } = await admin
        .from('profiles')
        .select('user_id')
        .eq('org_id', org.id)
        .eq('full_name', username)
        .single(); // Enforces one user per name per org.

      if (profileError || !profile) {
        // This covers cases where the username doesn't exist in this org.
        throw new AuthError(invalidCredsError);
      }
      
      const { data: authUser, error: authUserError } = await admin.auth.admin.getUserById(profile.user_id);
      if (authUserError || !authUser.user) {
        // This case indicates data inconsistency but is a necessary safeguard.
        throw new AuthError(invalidCredsError);
      }
      emailToLogin = authUser.user.email;
    }

    if (!emailToLogin) {
        throw new AuthError(invalidCredsError);
    }
    
    // 3. Attempt to sign in. This is the primary check for password validity.
    const { data: sessionData, error: sessionError } = await admin.auth.signInWithPassword({
      email: emailToLogin,
      password,
    });

    if (sessionError) {
      // This handles wrong password or if the email doesn't exist at all in auth.users.
      throw new AuthError(invalidCredsError);
    }

    // 4. CRITICAL FINAL VALIDATION: Ensure the successfully logged-in user belongs to the specified organisation.
    const loggedInUserId = sessionData.user.id;
    const { error: finalCheckError } = await admin
        .from('profiles')
        .select('id')
        .eq('id', loggedInUserId)
        .eq('org_id', org.id)
        .single();

    if (finalCheckError) {
        // The user's email and password are correct, but they do not belong to this organisation.
        // We must reject the login and invalidate the session we just created.
        await admin.auth.signOut(sessionData.session.access_token);
        throw new AuthError(invalidCredsError);
    }

    // 5. Success: Update the active session token to enforce a single-session policy.
    if (sessionData.session) {
      await admin
        .from('profiles')
        .update({ active_session_token: sessionData.session.access_token })
        .eq('id', sessionData.session.user.id);
    }

    // Return the session data on full success.
    return new Response(
      JSON.stringify(sessionData),
      { headers: { "Content-Type": "application/json", ...corsHeaders } },
    );

  } catch (e) {
    const error = e as AuthError | Error;
    const status = (error as AuthError).status || 401; // Default to 401 for any auth-related failure
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
});