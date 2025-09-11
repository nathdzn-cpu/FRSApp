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
    const { job_id, org_id, actor_id, actor_role } = body;

    if (!job_id || !org_id || !actor_id || !actor_role) {
      throw new Error("Missing required fields: job_id, org_id, actor_id, actor_role.");
    }
    if (org_id !== me.org_id) {
      throw new Error("Organization ID mismatch. User can only cancel jobs in their own organization.");
    }
    if (actor_id !== me.id) {
      throw new Error("Actor ID mismatch. User can only perform actions as themselves.");
    }
    if (actor_role !== me.role) {
      throw new Error("Actor role mismatch. Provided role does not match authenticated user's role.");
    }

    // Fetch the existing job to get its current status for the audit log
    const { data: oldJob, error: fetchJobError } = await admin
      .from("jobs")
      .select("status, order_number")
      .eq("id", job_id)
      .eq("org_id", org_id)
      .single();

    if (fetchJobError) throw new Error("Failed to fetch existing job: " + fetchJobError.message);
    if (!oldJob) throw new Error("Job not found.");

    // 3) Update job status to 'cancelled' and set deleted_at
    const currentTimestamp = new Date().toISOString();
    const { data: updatedJob, error: updateJobError } = await admin
      .from("jobs")
      .update({
        status: 'cancelled',
        deleted_at: currentTimestamp,
        last_status_update_at: currentTimestamp,
      })
      .eq("id", job_id)
      .eq("org_id", org_id)
      .select()
      .single();

    if (updateJobError) throw new Error("Failed to cancel job: " + updateJobError.message);

    // 4) Insert into job_progress_log
    const { error: progressLogError } = await admin
      .from('job_progress_log')
      .insert({
        org_id: org_id,
        job_id: job_id,
        actor_id: actor_id,
        actor_role: actor_role,
        action_type: 'cancelled',
        notes: `Job cancelled by ${me.full_name || me.role}.`,
        timestamp: currentTimestamp,
      });
    if (progressLogError) {
      console.error("DEBUG: progress log insert failed for job cancellation", progressLogError.message);
    }

    // 5) Audit log
    const { error: auditError } = await admin.from("audit_logs").insert({
      org_id: org_id,
      actor_id: actor_id,
      entity: "jobs",
      entity_id: job_id,
      action: "cancel",
      before: { status: oldJob.status },
      after: { status: updatedJob.status, deleted_at: updatedJob.deleted_at },
      notes: `Job '${oldJob.order_number}' cancelled by ${me.full_name || me.role}.`,
      created_at: currentTimestamp,
    });
    if (auditError) {
      console.error("DEBUG: audit insert failed", auditError.message);
    }

    return new Response(
      JSON.stringify(updatedJob),
      { status, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (e) {
    console.error("DEBUG: function error in cancel-job", e);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
});