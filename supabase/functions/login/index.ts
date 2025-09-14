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
    const genericError = "Invalid organisation key, username, or password.";

    if (!orgKey || !username || !password) {
      throw new Error("Organisation key, username, and password are required.");
    }

    // 1. Find the organisation by its key
    const { data: org, error: orgError } = await admin
      .from('orgs')
      .select('id')
      .eq('organisation_key', orgKey)
      .single();

    if (orgError || !org) {
      throw new Error(genericError);
    }

    let emailToLogin: string | undefined;
    let userId: string | undefined;

    // 2. Find the user and their email
    if (username.includes('@')) {
      // User is logging in with email
      emailToLogin = username;
      const { data: { user }, error: userError } = await admin.auth.admin.getUserByEmail(emailToLogin);
      
      if (userError || !user) {
        // To prevent user enumeration attacks, we don't fail fast.
        // The final signInWithPassword will fail, providing a consistent response time.
      } else {
        userId = user.id;
      }

    } else {
      // User is logging in with full_name (username)
      const { data: profiles, error: profileError } = await admin
        .from('profiles')
        .select('user_id')
        .eq('org_id', org.id)
        .eq('full_name', username);

      if (profileError || !profiles || profiles.length === 0) {
        throw new Error(genericError);
      }
      if (profiles.length > 1) {
        throw new Error("Multiple users found with that name in this organisation. Please use email to log in.");
      }
      
      userId = profiles[0].user_id;
      
      const { data: authUser, error: authUserError } = await admin.auth.admin.getUserById(userId);
      if (authUserError || !authUser.user) {
        throw new Error(genericError);
      }
      emailToLogin = authUser.user.email;
    }

    if (!emailToLogin) {
        throw new Error(genericError);
    }
    
    // 3. If we have a userId, verify they belong to the specified organisation
    if (userId) {
        const { error: finalProfileError } = await admin
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .eq('org_id', org.id)
          .single();

        if (finalProfileError) {
          // This user exists but does not belong to the org matching the key.
          throw new Error(genericError);
        }
    }

    // 4. Attempt to sign in with the verified email and password
    const { data: sessionData, error: sessionError } = await admin.auth.signInWithPassword({
      email: emailToLogin,
      password,
    });

    if (sessionError) {
      throw new Error(genericError);
    }

    // This check is vital. If the user who signed in doesn't belong to the org, reject.
    // This covers the case where an email is used and the user exists, but not in this org.
    const loggedInUserId = sessionData.user.id;
    const { error: finalCheckError } = await admin
        .from('profiles')
        .select('id')
        .eq('id', loggedInUserId)
        .eq('org_id', org.id)
        .single();

    if (finalCheckError) {
        await admin.auth.signOut(); // Sign out the incorrectly logged-in user.
        throw new Error(genericError);
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