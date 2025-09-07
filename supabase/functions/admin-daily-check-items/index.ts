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

// Helper to get display status (mimicking frontend for consistent notes)
function getDisplayStatus(status: string): string {
  switch (status) {
    case 'planned': return 'Planned';
    case 'assigned': return 'Assigned';
    case 'accepted': return 'Accepted';
    case 'on_route_collection': return 'On Route Collection';
    case 'at_collection': return 'At Collection';
    case 'loaded': return 'Loaded';
    case 'on_route_delivery': return 'On Route Delivery';
    case 'at_delivery': return 'At Delivery';
    case 'delivered': return 'Delivered';
    case 'pod_received': return 'POD Received';
    case 'cancelled': return 'Cancelled';
    case 'job_created': return 'Job Created';
    case 'job_cloned': return 'Job Cloned';
    case 'job_confirmed': return 'Job Confirmed';
    case 'eta_set': return 'ETA Set';
    case 'pod_requested': return 'POD Requested';
    case 'pod_uploaded': return 'POD Uploaded';
    case 'document_uploaded': return 'Document Uploaded';
    case 'location_ping': return 'Location Ping';
    case 'note_added': return 'Note Added';
    case 'status_changed': return 'Status Changed';
    case 'driver_reassigned': return 'Driver Reassigned';
    case 'stop_added': return 'Stop Added';
    case 'stop_updated': return 'Stop Updated';
    case 'stop_deleted': return 'Stop Deleted';
    case 'stop_details_updated': return 'Stop Details Updated';
    case 'daily_check_submitted': return 'Daily Check Submitted';
    case 'daily_check_item_created': return 'Daily Check Item Created';
    case 'daily_check_item_updated': return 'Daily Check Item Updated';
    case 'daily_check_item_deleted': return 'Daily Check Item Deleted';
    case 'user_created': return 'User Created';
    case 'user_updated': return 'User Updated';
    case 'user_deleted': return 'User Deleted';
    case 'password_reset_sent': return 'Password Reset Sent';
    case 'purge_demo_users': return 'Purge Demo Users';
    case 'purge_all_non_admin_users': return 'Purge All Non-Admin Users';
    case 'timeline_event_removed_from_timeline': return 'Removed from Timeline';
    case 'timeline_event_restored_to_timeline': return 'Restored to Timeline';
    default:
      return status.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }
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
      .select("id, role, org_id, full_name") // Fetch full_name for audit logs
      .eq("id", authUser.user.id)
      .single();

    if (meErr) throw new Error("Profile lookup failed: " + meErr.message);
    if (!me || me.role !== "admin" || !me.org_id) {
      throw new Error("Access denied (admin role required and org_id must be set).");
    }

    // 2) Parse body and determine operation
    const body = await req.json().catch(() => ({}));
    const { op, id, title, description, is_active, changes, org_id: body_org_id, actor_role } = body; // Destructure actor_role

    // Ensure org_id from body matches user's org_id
    if (body_org_id && body_org_id !== me.org_id) {
      throw new Error("Organization ID mismatch. User can only manage items in their own organization.");
    }
    const effective_org_id = me.org_id;

    // Ensure actor_role matches authenticated user's role
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
      case "read":
        const { data: readData, error: readError } = await admin
          .from("daily_check_items")
          .select("id, title, description, is_active")
          .eq("org_id", effective_org_id)
          .order("created_at", { ascending: false });
        if (readError) throw readError;
        resultData = readData;
        break;

      case "create":
        if (!title) throw new Error("Title is required for creating a daily check item.");
        const newItem = {
          id: uuidv4(),
          org_id: effective_org_id,
          title,
          description: description || null,
          is_active: is_active ?? true,
          created_at: currentTimestamp,
        };
        const { data: createData, error: createError } = await admin
          .from("daily_check_items")
          .insert(newItem)
          .select()
          .single();
        if (createError) throw createError;

        // Log item creation to job_progress_log (as a general event)
        const { error: progressLogErrorCreate } = await admin
          .from('job_progress_log')
          .insert({
            org_id: effective_org_id,
            job_id: null, // Not directly tied to a job
            actor_id: me.id,
            actor_role: me.role,
            action_type: 'daily_check_item_created',
            notes: `${me.full_name} created daily check item '${title}'.`,
            timestamp: currentTimestamp,
          });
        if (progressLogErrorCreate) console.error("DEBUG: progress log insert failed for daily check item creation", progressLogErrorCreate.message);

        resultData = createData;
        break;

      case "update":
        if (!id || !changes) throw new Error("ID and changes are required for updating a daily check item.");

        const { data: oldItem, error: fetchOldItemError } = await admin
          .from("daily_check_items")
          .select("title, description, is_active")
          .eq("id", id)
          .eq("org_id", effective_org_id)
          .single();
        if (fetchOldItemError) throw new Error("Failed to fetch old item for update: " + fetchOldItemError.message);
        if (!oldItem) throw new Error("Daily check item not found for update.");

        const { data: updateData, error: updateError } = await admin
          .from("daily_check_items")
          .update(changes)
          .eq("id", id)
          .eq("org_id", effective_org_id)
          .select()
          .single();
        if (updateError) throw updateError;

        // Log item update to job_progress_log
        const { error: progressLogErrorUpdate } = await admin
          .from('job_progress_log')
          .insert({
            org_id: effective_org_id,
            job_id: null,
            actor_id: me.id,
            actor_role: me.role,
            action_type: 'daily_check_item_updated',
            notes: `${me.full_name} updated daily check item '${oldItem.title}'.`,
            timestamp: currentTimestamp,
          });
        if (progressLogErrorUpdate) console.error("DEBUG: progress log insert failed for daily check item update", progressLogErrorUpdate.message);

        resultData = updateData;
        break;

      case "delete":
        if (!id) throw new Error("ID is required for deleting a daily check item.");
        const { data: deletedItem, error: deleteError } = await admin
          .from("daily_check_items")
          .delete()
          .eq("id", id)
          .eq("org_id", effective_org_id)
          .select("title") // Select title for logging
          .single();
        if (deleteError) throw deleteError;
        if (!deletedItem) throw new Error("Daily check item not found for deletion.");

        // Log item deletion to job_progress_log
        const { error: progressLogErrorDelete } = await admin
          .from('job_progress_log')
          .insert({
            org_id: effective_org_id,
            job_id: null,
            actor_id: me.id,
            actor_role: me.role,
            action_type: 'daily_check_item_deleted',
            notes: `${me.full_name} deleted daily check item '${deletedItem.title}'.`,
            timestamp: currentTimestamp,
          });
        if (progressLogErrorDelete) console.error("DEBUG: progress log insert failed for daily check item deletion", progressLogErrorDelete.message);

        resultData = { message: "Item deleted successfully." };
        break;

      default:
        throw new Error("Invalid operation specified.");
    }

    return new Response(
      JSON.stringify(resultData),
      { status, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (e) {
    console.error("DEBUG: function error", e);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
});