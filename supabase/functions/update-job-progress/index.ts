// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { v4 as uuidv4 } from "https://esm.sh/uuid@9.0.1";

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
    const { job_id, org_id, actor_id, actor_role, action, timestamp, notes, stop_id, lat, lon, signature_url, signature_name, storage_path, document_type } = body;

    if (!job_id || !org_id || !actor_id || !actor_role || !action || !timestamp) {
      throw new Error("Missing required fields: job_id, org_id, actor_id, actor_role, action, timestamp.");
    }

    const { data: oldJob, error: fetchJobError } = await admin
      .from("jobs")
      .select("status, assigned_driver_id, order_number")
      .eq("id", job_id)
      .eq("org_id", org_id)
      .single();

    if (fetchJobError) throw new Error("Failed to fetch existing job: " + fetchJobError.message);
    if (!oldJob) throw new Error("Job not found.");

    const jobUpdates: Record<string, any> = { last_status_update_at: timestamp };
    let new_status = action;
    let logNotes = notes;

    // Handle document uploads
    if (action === 'pod_uploaded' || action === 'document_uploaded') {
      if (!storage_path || !document_type) {
        throw new Error("storage_path and document_type are required for document uploads.");
      }
      await admin.from('documents').insert({
        id: uuidv4(),
        org_id,
        job_id,
        stop_id: stop_id || null,
        type: document_type,
        storage_path,
        uploaded_by: actor_id,
        created_at: new Date().toISOString(),
      });
      logNotes = notes || `${document_type.replace(/_/g, ' ')} uploaded.`;
      if (action === 'pod_uploaded') {
        new_status = 'pod_received';
      }
    }

    if (signature_url) jobUpdates.pod_signature_path = signature_url;
    if (signature_name) jobUpdates.pod_signature_name = signature_name;

    // Determine final job status
    if (new_status === 'pod_received') {
      const { data: deliveryStops } = await admin.from('job_stops').select('id').eq('job_id', job_id).eq('type', 'delivery');
      const { data: podLogs } = await admin.from('job_progress_log').select('stop_id').eq('job_id', job_id).eq('action_type', 'pod_received');
      const poddedStopIds = new Set((podLogs || []).map(log => log.stop_id));
      if (stop_id) poddedStopIds.add(stop_id);

      const allDeliveriesComplete = (deliveryStops || []).every(dStop => poddedStopIds.has(dStop.id));
      if (allDeliveriesComplete) {
        jobUpdates.status = 'delivered';
      } else {
        jobUpdates.status = 'pod_received';
      }
    } else if (action !== 'document_uploaded') {
       jobUpdates.status = new_status;
    }

    // Update job
    const { data: updatedJob, error: updateJobError } = await admin.from("jobs").update(jobUpdates).eq("id", job_id).select().single();
    if (updateJobError) throw new Error("Failed to update job: " + updateJobError.message);

    // Insert progress log
    const { data: insertedLog, error: insertLogError } = await admin.from("job_progress_log").insert({
      id: uuidv4(), org_id, job_id, actor_id, stop_id: stop_id || null,
      actor_role, action_type: new_status, timestamp, notes: logNotes || null,
      lat: lat || null, lon: lon || null, created_at: new Date().toISOString(),
    }).select().single();
    if (insertLogError) throw new Error("Failed to log job progress: " + insertLogError.message);

    return new Response(
      JSON.stringify({ message: "Job progress updated successfully.", job: updatedJob, log: insertedLog }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (e) {
    console.error("Error in update-job-progress function:", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
});