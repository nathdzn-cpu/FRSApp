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
    const { companyName, fullName, email, contactNumber, password, fleetSize } = body;

    if (!companyName || !fullName || !email || !password || !fleetSize) {
      throw new Error("Missing required sign-up fields.");
    }

    // 1. Generate a unique 5-digit org ID for internal reference
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

    // 2. Create the organisation, including the new fleet_size field
    // The `organisation_key` is generated automatically by a postgres function
    const { data: newOrg, error: orgError } = await admin
      .from('orgs')
      .insert({ 
        name: companyName, 
        display_id,
        fleet_size: fleetSize,
        contact_number: contactNumber
      })
      .select('id, organisation_key')
      .single();

    if (orgError) throw new Error(`Failed to create organisation: ${orgError.message}`);
    if (!newOrg || !newOrg.organisation_key) throw new Error("Failed to retrieve new organisation key.");

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

    // The `handle_new_user` trigger creates a profile. We update it with admin details.
    await new Promise(resolve => setTimeout(resolve, 200)); // Small delay for trigger

    const { error: profileError } = await admin
      .from('profiles')
      .update({
        org_id: newOrg.id,
        full_name: fullName,
        phone: contactNumber,
        role: 'admin',
        company_name: companyName,
      })
      .eq('id', newUserId);

    if (profileError) {
      // Rollback user and org
      await admin.auth.admin.deleteUser(newUserId);
      await admin.from('orgs').delete().eq('id', newOrg.id);
      throw new Error(`Failed to update profile: ${profileError.message}`);
    }
    
    // 4. Return the organisation key to the user instead of logging them in
    return new Response(
      JSON.stringify({ organisation_key: newOrg.organisation_key }),
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