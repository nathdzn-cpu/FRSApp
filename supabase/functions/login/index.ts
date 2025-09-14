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
      emailToLogin = username;
    } else {
      const { data: profile, error: profileError } = await admin
        .from('profiles')
        .select('user_id')
        .eq('org_id', org.id)
        .eq('full_name', username)
        .single();

      if (profileError || !profile) {
        throw new AuthError(invalidCredsError);
      }
      
      const { data: authUser, error: authUserError } = await admin.auth.admin.getUserById(profile.user_id);
      if (authUserError || !authUser.user) {
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
      throw new AuthError(invalidCredsError);
    }

    // 4. CRITICAL FINAL VALIDATION: Ensure the successfully logged-in user belongs to the specified organisation.
    const loggedInUserId = sessionData.user.id;
    const { data: finalProfile, error: finalCheckError } = await admin
        .from('profiles')
        .select('id, org_id, full_name')
        .eq('id', loggedInUserId)
        .eq('org_id', org.id)
        .single();

    if (finalCheckError || !finalProfile) {
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

    // 6. Construct and return success response
    const successResponse = {
      success: true,
      session: sessionData.session, // Includes the token
      user: {
        id: sessionData.user.id,
        username: finalProfile.full_name,
        organisation_id: finalProfile.org_id,
        ...sessionData.user
      },
    };

    return new Response(
      JSON.stringify(successResponse),
      { 
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      },
    );

  } catch (e) {
    const error = e as AuthError | Error;
    // Use the status from AuthError, or default to 500 for unexpected server errors.
    const status = (error instanceof AuthError) ? error.status : 500;
    
    const errorResponse = {
      success: false,
      message: error.message,
    };
    
    return new Response(
      JSON.stringify(errorResponse),
      {
        status,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
});