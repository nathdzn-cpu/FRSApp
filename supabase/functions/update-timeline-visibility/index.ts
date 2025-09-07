// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { v4 as uuidv4 } from "https://esm.sh/uuid@9.0.1";

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Replace with your frontend origin in production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
      .select("id, role, org_id, full_name")
      .eq("id", authUser.user.id)
      .single();

    if (meErr) throw new Error("Profile lookup failed: " + meErr.message);
    if (!me || !me.org_id || !['admin', 'office'].includes(me.role)) {
      throw new Error("Access denied (admin or office role required and org_id must be set).");
    }

    // 2) Parse body
    const body = await req.json().catch(() => ({}));
    const { log_id, org_id, actor_id, actor_role, visible_in_timeline } = body;

    if (!log_id || !org_id || !actor_id || !actor_role || typeof visible_in_timeline !== 'boolean') {
      throw new Error("Missing required fields: log_id, org_id, actor_id, actor_role, or visible_in_timeline.");
    }
    if (org_id !== me.org_id) {
      throw new Error("Organization ID mismatch. User can only modify logs in their own organization.");
    }
    if (actor_id !== me.id) {
      throw new Error("Actor ID mismatch. User can only perform actions as themselves.");
    }
    if (actor_role !== me.role) {
      throw new Error("Actor role mismatch. Provided role does not match authenticated user's role.");
    }

    // Fetch the existing log entry for audit purposes
    const { data: oldLog, error: fetchLogError } = await admin
      .from("job_progress_log")
      .select("action_type, notes, visible_in_timeline, timestamp, actor_id") // Fetch original actor_id
      .eq("id", log_id)
      .eq("org_id", org_id)
      .single();

    if (fetchLogError) throw new Error("Failed to fetch existing log entry: " + fetchLogError.message);
    if (!oldLog) throw new Error("Log entry not found.");

    // Fetch original actor's full name
    let originalActorName = 'Unknown User';
    if (oldLog.actor_id) {
      const { data: originalActorProfile, error: originalActorError } = await admin
        .from("profiles")
        .select("full_name")
        .eq("id", oldLog.actor_id)
        .single();
      if (originalActorError) console.error("Error fetching original actor profile:", originalActorError.message);
      if (originalActorProfile) originalActorName = originalActorProfile.full_name;
    }

    // 3) Update job_progress_log
    const { data: updatedLog, error: updateError } = await admin
      .from("job_progress_log")
      .update({ visible_in_timeline: visible_in_timeline })
      .eq("id", log_id)
      .eq("org_id", org_id)
      .select()
      .single();

    if (updateError) throw new Error("Failed to update log visibility: " + updateError.message);

    // 4) Audit log the action of changing visibility
    const actionDescription = visible_in_timeline ? "restored to timeline" : "removed from timeline";
    const actionTypeForAudit = visible_in_timeline ? "timeline_event_restored_to_timeline" : "timeline_event_removed_from_timeline";
    const eventTimestamp = new Date(oldLog.timestamp).toLocaleString('en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const currentActionTimestamp = new Date().toLocaleString('en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const auditNotes = `${me.full_name} ${actionDescription} '${getDisplayStatus(oldLog.action_type)}' (originally logged by ${originalActorName} on ${eventTimestamp}) on ${currentActionTimestamp}.`;

    const { error: auditError } = await admin.from("audit_logs").insert({
      org_id: org_id,
      actor_id: actor_id,
      entity: "job_progress_log",
      entity_id: log_id,
      action: actionTypeForAudit,
      notes: auditNotes,
      before: { visible_in_timeline: oldLog.visible_in_timeline },
      after: { visible_in_timeline: updatedLog.visible_in_timeline },
      created_at: new Date().toISOString(),
    });
    if (auditError) {
      console.error("DEBUG: audit insert failed for timeline visibility update", auditError.message);
    }

    return new Response(
      JSON.stringify({ message: `Log entry ${actionDescription} successfully.`, log: updatedLog }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (e) {
    console.error("DEBUG: function error in update-timeline-visibility", e);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
});