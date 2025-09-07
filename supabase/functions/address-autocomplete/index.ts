// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import GetAddressClient from "https://esm.sh/getaddress-api@2.0.0"; // Import the client

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Replace with your frontend origin in production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function userClient(authHeader: string | null) {
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const token =
    (authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : "") || "";
  return createClient(url, anon, {
    global: { headers: { Authorization: token ? `Bearer ${token}` : "" } },
    auth: { persistSession: false },
  });
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const user = userClient(req.headers.get("authorization"));

    // 1) Authenticate and authorize caller
    const { data: authUser } = await user.auth.getUser();
    if (!authUser?.user?.id) {
      throw new Error("Not signed in or no auth user ID.");
    }

    const { data: me, error: meErr } = await user
      .from("profiles")
      .select("id, role, org_id")
      .eq("id", authUser.user.id)
      .single();

    if (meErr) throw new Error("Profile lookup failed: " + meErr.message);
    if (!me || !me.org_id) {
      throw new Error("Access denied (org_id must be set).");
    }

    // 2) Initialize GetAddressClient with secret key
    const getAddressApiKey = Deno.env.get("GETADDRESS_API_KEY");
    if (!getAddressApiKey) {
      throw new Error("GETADDRESS_API_KEY environment variable not set.");
    }
    const getAddressApi = new GetAddressClient(getAddressApiKey);

    // 3) Parse body and determine operation
    const body = await req.json().catch(() => ({}));
    const { op, query, id: addressId } = body;

    let resultData: any;
    let status = 200;

    switch (op) {
      case "autocomplete":
        if (!query) throw new Error("Query is required for autocomplete.");
        const autocompleteResult = await getAddressApi.autocomplete(query);
        if (autocompleteResult.isSuccess) {
          resultData = autocompleteResult.toSuccess().suggestions;
        } else {
          const failed = autocompleteResult.toFailed();
          throw new Error(`Autocomplete failed: ${failed.message} (${failed.status})`);
        }
        break;

      case "get":
        if (!addressId) throw new Error("Address ID is required for getting a full address.");
        const addressResult = await getAddressApi.get(addressId);
        if (addressResult.isSuccess) {
          resultData = addressResult.toSuccess();
        } else {
          const failed = addressResult.toFailed();
          throw new Error(`Get address failed: ${failed.message} (${failed.status})`);
        }
        break;

      default:
        throw new Error("Invalid operation specified. Must be 'autocomplete' or 'get'.");
    }

    return new Response(
      JSON.stringify(resultData),
      { status, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (e) {
    console.error("DEBUG: address-autocomplete function error", e);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
});