// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function adminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = adminClient();
    const {
      job_id,
      org_id,
      actor_id,
      actor_role,
      stop_id,
      pod_type, // 'file' or 'signature'
      storage_path,
      signature_name,
    } = await req.json();

    if (!job_id || !org_id || !actor_id || !actor_role || !pod_type || !storage_path) {
      throw new Error("Missing required fields in payload.");
    }

    // 1. Insert into 'documents' table
    const documentType = pod_type === 'signature' ? 'check_signature' : 'pod';
    const { error: docError } = await supabase.from('documents').insert({
      job_id,
      org_id,
      uploaded_by: actor_id,
      type: documentType,
      storage_path,
      stop_id: stop_id || null,
    });

    if (docError) {
      console.error("Error inserting into documents:", docError);
      throw new Error(`Failed to create document record: ${docError.message}`);
    }

    // 2. If it's a signature, update the 'jobs' table
    if (pod_type === 'signature' && signature_name) {
      const { error: jobUpdateError } = await supabase
        .from('jobs')
        .update({
          pod_signature_name: signature_name,
          pod_signature_path: storage_path,
        })
        .eq('id', job_id);

      if (jobUpdateError) {
        console.error("Error updating job with signature details:", jobUpdateError);
        throw new Error(`Failed to update job with signature: ${jobUpdateError.message}`);
      }
    }

    // 3. Log the progress update
    const notes = pod_type === 'signature'
      ? `Signature captured from ${signature_name}.`
      : `POD paperwork uploaded.`;

    const { error: progressError } = await supabase.from('job_progress_log').insert({
      job_id,
      org_id,
      actor_id,
      actor_role,
      action_type: 'pod_received',
      timestamp: new Date().toISOString(),
      notes,
      stop_id: stop_id || null,
      file_path: storage_path,
    });

    if (progressError) {
      console.error("Error inserting job progress log:", progressError);
      throw new Error(`Failed to log progress: ${progressError.message}`);
    }

    // 4. Update job status
    const { error: statusUpdateError } = await supabase
      .from('jobs')
      .update({ status: 'pod_received', last_status_update_at: new Date().toISOString() })
      .eq('id', job_id);

    if (statusUpdateError) {
        console.error("Error updating job status:", statusUpdateError);
        throw new Error(`Failed to update job status: ${statusUpdateError.message}`);
    }

    return new Response(JSON.stringify({ message: "POD processed successfully." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (e) {
    console.error("Error in process-pod function:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});