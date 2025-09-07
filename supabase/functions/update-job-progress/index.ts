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
    const { data: authUser, error: authUserError } = await user.auth.getUser();
    if (authUserError) {
      console.error("Auth user fetch error:", authUserError);
      throw new Error("Authentication failed: " + authUserError.message);
    }
    if (!authUser?.user?.id) {
      throw new Error("Not signed in or no auth user ID.");
    }

    const { data: me, error: meErr } = await user
      .from("profiles")
      .select("id, role, org_id, full_name") // Fetch full_name for audit logs
      .eq("id", authUser.user.id)
      .single();

    if (meErr) {
      console.error("Profile lookup error:", meErr);
      throw new Error("Profile lookup failed: " + meErr.message);
    }
    if (!me || !me.org_id || !['admin', 'office'].includes(me.role)) {
      throw new Error("Access denied (admin or office role required and org_id must be set).");
    }

    // 2) Parse body
    const body = await req.json().catch((e) => {
      console.error("Error parsing request body:", e);
      return {};
    });
    console.log("Received body for update-job-progress:", JSON.stringify(body, null, 2));

    const { job_id, org_id, actor_id, actor_role, new_status, timestamp, notes } = body; // Destructure actor_role

    if (!job_id || !org_id || !actor_id || !actor_role || !new_status || !timestamp) {
      throw new Error("Missing required fields: job_id, org_id, actor_id, actor_role, new_status, timestamp.");
    }

    if (org_id !== me.org_id) {
      throw new Error("Organization ID mismatch. User can only update jobs in their own organization.");
    }
    if (actor_id !== me.id) {
      throw new Error("Actor ID mismatch. User can only perform actions as themselves.");
    }
    if (actor_role !== me.role) {
      throw new Error("Actor role mismatch. Provided role does not match authenticated user's role.");
    }

    // 3) Start a database transaction
    // In Deno Edge Functions, direct transactions are not exposed via the client.
    // We perform operations sequentially and handle errors.

    // Fetch current job status for audit log
    const { data: oldJob, error: fetchJobError } = await admin
      .from("jobs")
      .select("status")
      .eq("id", job_id)
      .eq("org_id", org_id)
      .single();

    if (fetchJobError) throw new Error("Failed to fetch existing job: " + fetchJobError.message);
    if (!oldJob) throw new Error("Job not found.");

    // 4) Update jobs table
    const { data: updatedJob, error: updateJobError } = await admin
      .from("jobs")
      .update({
        status: new_status,
        last_status_update_at: timestamp,
      })
      .eq("id", job_id)
      .eq("org_id", org_id)
      .select()
      .single();

    if (updateJobError) {
      console.error("Error updating job status:", updateJobError);
      throw new Error("Failed to update job status: " + updateJobError.message);
    }

    // 5) Insert into job_progress_log table
    const progressNotes = notes || `${me.full_name} marked job as '${getDisplayStatus(new_status)}'.`;
    const { data: insertedLog, error: insertLogError } = await admin
      .from("job_progress_log")
      .insert({
        id: uuidv4(),
        org_id: org_id,
        job_id: job_id,
        actor_id: actor_id,
        actor_role: actor_role, // Added actor_role
        action_type: new_status, // Renamed from status
        timestamp: timestamp,
        notes: progressNotes,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertLogError) {
      console.error("Error inserting job progress log:", insertLogError);
      // Optionally, rollback job status update here if transactions were supported
      throw new Error("Failed to log job progress: " + insertLogError.message);
    }

    // 6) Audit log
    const { error: auditError } = await admin.from("audit_logs").insert({
      org_id: org_id,
      actor_id: actor_id,
      entity: "jobs",
      entity_id: job_id,
      action: "update_progress",
      before: { status: oldJob.status },
      after: { status: new_status, last_status_update_at: timestamp },
      notes: progressNotes,
      created_at: new Date().toISOString(),
    });
    if (auditError) {
      console.error("DEBUG: audit insert failed", auditError.message);
    }

    return new Response(
      JSON.stringify({ message: "Job progress updated successfully.", job: updatedJob, log: insertedLog }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (e) {
    console.error("DEBUG: function error in update-job-progress", e);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
});