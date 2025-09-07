// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { v4 as uuidv4 } from "https://esm.sh/uuid@9.0.1";

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Replace with your frontend origin in production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS',
};

function adminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

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
    const admin = adminClient();
    const user = userClient(req.headers.get("authorization"));

    // 1) Authenticate and authorize caller
    const { data: authUser } = await user.auth.getUser();
    if (!authUser?.user?.id) {
      throw new Error("Not signed in or no auth user ID.");
    }

    const { data: me, error: meErr } = await user
      .from("profiles")
      .select("id, role, org_id, full_name")
      .eq("id", authUser.user.id)
      .single();

    if (meErr) throw new Error("Profile lookup failed: " + meErr.message);
    if (!me || !me.org_id) {
      throw new Error("Access denied (org_id must be set).");
    }

    // 2) Parse body and determine operation
    const body = await req.json().catch(() => ({}));
    const { op, id, name, line_1, line_2, town_or_city, county, postcode, favourite, updates, searchTerm, org_id: body_org_id, actor_role } = body;

    // Ensure org_id from body matches user's org_id
    if (body_org_id && body_org_id !== me.org_id) {
      throw new Error("Organization ID mismatch. User can only manage addresses in their own organization.");
    }
    const effective_org_id = me.org_id;

    // Ensure actor_role matches authenticated user's role for audit logging
    if (actor_role && actor_role !== me.role) {
      throw new Error("Actor role mismatch. Provided role does not match authenticated user's role.");
    }

    const currentTimestamp = new Date().toISOString();
    const formattedCurrentTimestamp = new Date(currentTimestamp).toLocaleString('en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    let resultData: any;
    let status = 200;

    switch (op) {
      case "read_all":
        if (!['admin', 'office'].includes(me.role)) {
          throw new Error("Access denied (admin or office role required to read all saved addresses).");
        }
        let query = admin
          .from("saved_addresses")
          .select("*")
          .eq("org_id", effective_org_id)
          .order("favourite", { ascending: false }) // Favourites first
          .order("name", { ascending: true });

        if (searchTerm) {
          const searchPattern = `%${searchTerm.toLowerCase()}%`;
          query = query.or(`name.ilike.${searchPattern},line_1.ilike.${searchPattern},town_or_city.ilike.${searchPattern},postcode.ilike.${searchPattern}`);
        }

        const { data: readData, error: readError } = await query;
        if (readError) throw readError;
        resultData = readData;
        break;

      case "search_autocomplete":
        // Accessible by all roles for autocomplete
        let searchQuery = admin
          .from("saved_addresses")
          .select("*")
          .eq("org_id", effective_org_id)
          .order("favourite", { ascending: false }) // Favourites first
          .order("name", { ascending: true })
          .limit(6); // Max 6 suggestions

        if (searchTerm) {
          const searchPattern = `%${searchTerm.toLowerCase()}%`;
          searchQuery = searchQuery.or(`name.ilike.${searchPattern},line_1.ilike.${searchPattern},postcode.ilike.${searchPattern}`);
        }

        const { data: searchData, error: searchError } = await searchQuery;
        if (searchError) throw searchError;
        resultData = searchData;
        break;

      case "create":
        if (!['admin', 'office'].includes(me.role)) {
          throw new Error("Access denied (admin or office role required to create saved addresses).");
        }
        if (!line_1 || !town_or_city || !postcode) throw new Error("Missing required fields: line_1, town_or_city, postcode.");

        const newAddress = {
          id: uuidv4(),
          org_id: effective_org_id,
          name: name || null,
          line_1,
          line_2: line_2 || null,
          town_or_city,
          county: county || null,
          postcode: postcode.toUpperCase(), // Ensure postcode is uppercase
          favourite: favourite ?? false,
          created_at: currentTimestamp,
        };
        const { data: createData, error: createError } = await admin
          .from("saved_addresses")
          .insert(newAddress)
          .select()
          .single();
        if (createError) throw createError;

        // Log to job_progress_log (general event)
        const { error: progressLogErrorCreate } = await admin
          .from('job_progress_log')
          .insert({
            org_id: effective_org_id,
            job_id: null,
            actor_id: me.id,
            actor_role: me.role,
            action_type: 'saved_address_created',
            notes: `${me.full_name} created saved address '${name || line_1}' on ${formattedCurrentTimestamp}.`,
            timestamp: currentTimestamp,
          });
        if (progressLogErrorCreate) console.error("DEBUG: progress log insert failed for saved address creation", progressLogErrorCreate.message);

        resultData = createData;
        break;

      case "update":
        if (!['admin', 'office'].includes(me.role)) {
          throw new Error("Access denied (admin or office role required to update saved addresses).");
        }
        if (!id || !updates) throw new Error("ID and updates are required for updating a saved address.");

        const { data: oldAddress, error: fetchOldAddressError } = await admin
          .from("saved_addresses")
          .select("name, line_1, postcode, favourite")
          .eq("id", id)
          .eq("org_id", effective_org_id)
          .single();
        if (fetchOldAddressError) throw new Error("Failed to fetch old address for update: " + fetchOldAddressError.message);
        if (!oldAddress) throw new Error("Saved address not found for update.");

        // Ensure postcode is uppercase if updated
        if (updates.postcode) {
          updates.postcode = updates.postcode.toUpperCase();
        }

        const { data: updateData, error: updateError } = await admin
          .from("saved_addresses")
          .update(updates)
          .eq("id", id)
          .eq("org_id", effective_org_id)
          .select()
          .single();
        if (updateError) throw updateError;

        // Log to job_progress_log
        const { error: progressLogErrorUpdate } = await admin
          .from('job_progress_log')
          .insert({
            org_id: effective_org_id,
            job_id: null,
            actor_id: me.id,
            actor_role: me.role,
            action_type: 'saved_address_updated',
            notes: `${me.full_name} updated saved address '${oldAddress.name || oldAddress.line_1}' on ${formattedCurrentTimestamp}.`,
            timestamp: currentTimestamp,
          });
        if (progressLogErrorUpdate) console.error("DEBUG: progress log insert failed for saved address update", progressLogErrorUpdate.message);

        resultData = updateData;
        break;

      case "delete":
        if (!['admin', 'office'].includes(me.role)) {
          throw new Error("Access denied (admin or office role required to delete saved addresses).");
        }
        if (!id) throw new Error("ID is required for deleting a saved address.");

        const { data: deletedAddress, error: deleteError } = await admin
          .from("saved_addresses")
          .delete()
          .eq("id", id)
          .eq("org_id", effective_org_id)
          .select("name, line_1") // Select for logging
          .single();
        if (deleteError) throw deleteError;
        if (!deletedAddress) throw new Error("Saved address not found for deletion.");

        // Log to job_progress_log
        const { error: progressLogErrorDelete } = await admin
          .from('job_progress_log')
          .insert({
            org_id: effective_org_id,
            job_id: null,
            actor_id: me.id,
            actor_role: me.role,
            action_type: 'saved_address_deleted',
            notes: `${me.full_name} deleted saved address '${deletedAddress.name || deletedAddress.line_1}' on ${formattedCurrentTimestamp}.`,
            timestamp: currentTimestamp,
          });
        if (progressLogErrorDelete) console.error("DEBUG: progress log insert failed for saved address deletion", progressLogErrorDelete.message);

        resultData = { message: "Address deleted successfully." };
        break;

      default:
        throw new Error("Invalid operation specified.");
    }

    return new Response(
      JSON.stringify(resultData),
      { status, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (e) {
    console.error("DEBUG: function error in saved-addresses-crud", e);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
});