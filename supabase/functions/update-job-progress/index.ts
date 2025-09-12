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

// Helper to invoke another Edge Function
async function invokeEdgeFunction(functionName: string, payload: any) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); // Use service key for function-to-function
  if (!supabaseUrl || !serviceKey) {
    console.error("Missing Supabase URL or Service Role Key for Edge Function invocation.");
    return;
  }

  const url = `${supabaseUrl}/functions/v1/${functionName}`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error invoking ${functionName}: ${response.status} - ${errorText}`);
    } else {
      console.log(`Successfully invoked ${functionName}.`);
    }
  } catch (error) {
    console.error(`Failed to invoke ${functionName}: ${error.message}`);
  }
}

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
    const { data: authUser, error: authUserError } = await user.auth.getUser();
    if (authUserError) throw new Error("Authentication failed: " + authUserError.message);
    if (!authUser?.user?.id) throw new Error("Not signed in or no auth user ID.");

    const { data: me, error: meErr } = await user
      .from("profiles")
      .select("id, role, org_id, full_name")
      .eq("id", authUser.user.id)
      .single();

    if (meErr) throw new Error("Profile lookup failed: " + meErr.message);
    if (!me || !me.org_id || !['admin', 'office', 'driver'].includes(me.role)) {
      throw new Error("Access denied (admin, office, or driver role required and org_id must be set).");
    }

    // 2) Parse body
    const body = await req.json().catch(() => ({}));
    const { job_id, org_id, actor_id, actor_role, action, timestamp, notes, stop_id, lat, lon, signature_url, signature_name } = body;

    if (!job_id || !org_id || !actor_id || !actor_role || !action || !timestamp) {
      throw new Error("Missing required fields: job_id, org_id, actor_id, actor_role, action, timestamp.");
    }
    if (org_id !== me.org_id) throw new Error("Organization ID mismatch.");
    if (actor_id !== me.id) throw new Error("Actor ID mismatch.");
    if (actor_role !== me.role) throw new Error("Actor role mismatch.");

    // 3) Fetch current job and perform security checks
    const { data: oldJob, error: fetchJobError } = await admin
      .from("jobs")
      .select("status, assigned_driver_id, order_number")
      .eq("id", job_id)
      .eq("org_id", org_id)
      .single();

    if (fetchJobError) throw new Error("Failed to fetch existing job: " + fetchJobError.message);
    if (!oldJob) throw new Error("Job not found.");
    if (me.role === 'driver' && oldJob.assigned_driver_id !== me.id) {
      throw new Error("Access denied. Driver can only update jobs assigned to them.");
    }

    const jobUpdates: Record<string, any> = { last_status_update_at: timestamp };
    let new_status = action;
    let logNotes = notes;
    let finalStatus = oldJob.status;

    const nonStopActions = ['job_confirmed', 'eta_set', 'accepted', 'pod_uploaded', 'document_uploaded', 'note_added', 'location_ping'];
    const stopActions = ['arrive', 'depart', 'complete'];

    if (nonStopActions.includes(action)) {
      if (action === 'accepted') {
        jobUpdates.status = 'accepted';
        finalStatus = 'accepted';
        logNotes = notes || 'Job status changed to accepted by driver.';
      } else if (action === 'location_ping') {
        await admin.from('profiles').update({ last_location: { lat, lon, timestamp } }).eq('id', actor_id);
        logNotes = `Location ping received.`;
      } else {
        logNotes = notes;
      }
    } else if (stopActions.includes(action)) {
      if (!stop_id) throw new Error(`Action '${action}' requires a stop_id.`);
      const { data: stopData, error: stopError } = await admin.from('job_stops').select('type').eq('id', stop_id).single();
      if (stopError) throw new Error(`Failed to fetch stop details: ${stopError.message}`);
      if (!stopData) throw new Error(`Stop with id ${stop_id} not found.`);

      if (action === 'arrive') new_status = 'arrived_at_stop';
      else if (action === 'depart') new_status = 'departed_from_stop';
      else if (action === 'complete') {
        if (stopData.type === 'collection') new_status = 'collected';
        else if (stopData.type === 'delivery') new_status = 'pod_received';
      }
      if (!new_status) throw new Error(`Invalid action '${action}' for stop type '${stopData.type}'.`);
      
      jobUpdates.status = new_status;
      finalStatus = new_status;

      if (signature_url) jobUpdates.pod_signature_path = signature_url;
      if (signature_name) jobUpdates.pod_signature_name = signature_name;

      // Check if job should be marked as 'delivered'
      if (new_status === 'pod_received') {
        const { data: jobStops, error: stopsError } = await admin.from('job_stops').select('id, type').eq('job_id', job_id).eq('org_id', org_id);
        if (stopsError) console.error("Error fetching job stops for final status check:", stopsError.message);

        const deliveryStops = jobStops?.filter(s => s.type === 'delivery') || [];
        if (deliveryStops.length > 0) {
          const { data: deliveryLogs, error: logsError } = await admin.from('job_progress_log').select('stop_id, action_type').eq('job_id', job_id).eq('org_id', org_id).eq('action_type', 'pod_received');
          if (logsError) console.error("Error fetching delivery logs for final status check:", logsError.message);

          const poddedStopIds = new Set(deliveryLogs?.map(log => log.stop_id) || []);
          poddedStopIds.add(stop_id); // Add the current stop being processed

          const allDeliveryStopsHavePod = deliveryStops.every(dStop => poddedStopIds.has(dStop.id));
          if (allDeliveryStopsHavePod) {
            jobUpdates.status = 'delivered';
            finalStatus = 'delivered';
          }
        }
      }
    } else {
      throw new Error(`Invalid action provided: ${action}`);
    }

    // Execute job update
    const { data: updatedJob, error: updateJobError } = await admin.from("jobs").update(jobUpdates).eq("id", job_id).select().single();
    if (updateJobError) throw new Error("Failed to update job status: " + updateJobError.message);

    // Insert progress log
    const { data: insertedLog, error: insertLogError } = await admin.from("job_progress_log").insert({
      id: uuidv4(), org_id, job_id, actor_id, stop_id: stop_id || null,
      actor_role, action_type: new_status, timestamp, notes: logNotes || null,
      lat: lat || null, lon: lon || null, created_at: new Date().toISOString(),
    }).select().single();
    if (insertLogError) throw new Error("Failed to log job progress: " + insertLogError.message);

    // Audit log
    await admin.from("audit_logs").insert({
      org_id, actor_id, entity: "jobs", entity_id: job_id, action: "update_progress",
      before: { status: oldJob.status },
      after: { status: finalStatus, last_status_update_at: timestamp },
    });

    // Create and send notifications
    if (actor_role === 'driver') {
      const { data: officeAdminProfiles } = await admin.from("profiles").select("id").eq("org_id", org_id).in("role", ["admin", "office"]);
      if (officeAdminProfiles && officeAdminProfiles.length > 0) {
        const notificationTitle = `Job Update: ${oldJob.order_number}`;
        const notificationMessage = `${me.full_name} updated status to "${new_status.replace(/_/g, ' ')}".`;
        const link_to = `/jobs/${job_id}`;

        const notificationsToInsert = officeAdminProfiles.filter(p => p.id !== actor_id).map(p => ({
          user_id: p.id, org_id, title: notificationTitle, message: notificationMessage, link_to,
        }));
        if (notificationsToInsert.length > 0) {
          await admin.from("notifications").insert(notificationsToInsert);
        }

        const { data: devices } = await admin.from('profile_devices').select('expo_push_token').in('profile_id', officeAdminProfiles.map(p => p.id));
        if (devices) {
          for (const device of devices) {
            await invokeEdgeFunction('send-push-notification', {
              to: device.expo_push_token, title: notificationTitle, body: notificationMessage, data: { url: link_to }
            });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ message: "Job progress updated successfully.", job: updatedJob, log: insertedLog }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (e) {
    console.error("DEBUG: function error in update-job-progress", e);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
});