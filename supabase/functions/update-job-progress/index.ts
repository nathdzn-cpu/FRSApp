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
    if (authUserError) {
      console.error("Auth user fetch error:", authUserError);
      throw new Error("Authentication failed: " + authUserError.message);
    }
    if (!authUser?.user?.id) {
      throw new Error("Not signed in or no auth user ID.");
    }

    const { data: me, error: meErr } = await user
      .from("profiles")
      .select("id, role, org_id, full_name")
      .eq("id", authUser.user.id)
      .single();

    if (meErr) {
      console.error("Profile lookup error:", meErr);
      throw new Error("Profile lookup failed: " + meErr.message);
    }
    // MODIFIED: Allow 'driver' role for job progress updates
    if (!me || !me.org_id || !['admin', 'office', 'driver'].includes(me.role)) {
      throw new Error("Access denied (admin, office, or driver role required and org_id must be set).");
    }

    // 2) Parse body
    const body = await req.json().catch((e) => {
      console.error("Error parsing request body:", e);
      return {};
    });
    console.log("Received body for update-job-progress:", JSON.stringify(body, null, 2));

    const { job_id, org_id, actor_id, actor_role, new_status, timestamp, notes, stop_id, lat, lon } = body; // Destructure actor_role and location

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

    // Fetch current job status for audit log and driver-specific check
    const { data: oldJob, error: fetchJobError } = await admin
      .from("jobs")
      .select("status, assigned_driver_id, order_number") // Fetch order_number for notifications
      .eq("id", job_id)
      .eq("org_id", org_id)
      .single();

    if (fetchJobError) throw new Error("Failed to fetch existing job: " + fetchJobError.message);
    if (!oldJob) throw new Error("Job not found.");

    // MODIFIED: Driver-specific security check
    if (me.role === 'driver' && oldJob.assigned_driver_id !== me.id) {
      throw new Error("Access denied. Driver can only update progress for jobs assigned to them.");
    }

    // 4) Update jobs table
    const jobUpdates: Record<string, any> = {
      status: new_status,
      last_status_update_at: timestamp,
    };

    // Check if this is the final POD upload for the last delivery stop
    if (new_status === 'pod_received') {
      const { data: jobStops, error: stopsError } = await admin
        .from('job_stops')
        .select('id, type, seq')
        .eq('job_id', job_id)
        .eq('org_id', org_id)
        .order('seq', { ascending: true });

      if (stopsError) console.error("Error fetching job stops for final status check:", stopsError.message);

      const deliveryStops = jobStops?.filter(s => s.type === 'delivery') || [];
      const currentStopIsLastDelivery = deliveryStops.length > 0 && deliveryStops[deliveryStops.length - 1].id === stop_id;

      if (currentStopIsLastDelivery) {
        // Check if all delivery stops have 'pod_received' logs
        const { data: deliveryLogs, error: logsError } = await admin
          .from('job_progress_log')
          .select('stop_id, action_type')
          .eq('job_id', job_id)
          .eq('org_id', org_id)
          .in('stop_id', deliveryStops.map(s => s.id));

        if (logsError) console.error("Error fetching delivery logs for final status check:", logsError.message);

        const allDeliveryStopsHavePod = deliveryStops.every(dStop =>
          deliveryLogs?.some(log => log.stop_id === dStop.id && log.action_type === 'pod_received')
        );

        if (allDeliveryStopsHavePod) {
          jobUpdates.status = 'delivered'; // Set overall job status to 'delivered'
        }
      }
    }

    const { data: updatedJob, error: updateJobError } = await admin
      .from("jobs")
      .update(jobUpdates)
      .eq("id", job_id)
      .eq("org_id", org_id)
      .select()
      .single();

    if (updateJobError) {
      console.error("Error updating job status:", updateJobError);
      throw new Error("Failed to update job status: " + updateJobError.message);
    }

    // 5) Insert into job_progress_log table
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
        notes: notes || null,
        stop_id: stop_id || null, // Include stop_id
        lat: lat || null, // Add lat
        lon: lon || null, // Add lon
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
      after: { status: updatedJob.status, last_status_update_at: timestamp },
      notes: `Job progress updated to: ${new_status}`,
      created_at: new Date().toISOString(),
    });
    if (auditError) {
      console.error("DEBUG: audit insert failed", auditError.message);
    }

    // 7) Create notifications for office/admin users if update is from a driver
    if (actor_role === 'driver') {
      const { data: officeAdminProfiles, error: profileError } = await admin
        .from("profiles")
        .select("id, user_id")
        .eq("org_id", org_id)
        .in("role", ["admin", "office"]);

      if (profileError) {
        console.error("Error fetching office/admin profiles for notification:", profileError.message);
      } else if (officeAdminProfiles && officeAdminProfiles.length > 0) {
        const notificationTitle = `Job Update: ${updatedJob.order_number}`;
        const notificationMessage = `${me.full_name} updated status to "${new_status.replace(/_/g, ' ')}".`;

        const notificationsToInsert = officeAdminProfiles
          .filter(p => p.id !== actor_id) // Don't notify the actor
          .map(p => ({
            user_id: p.id,
            org_id: org_id,
            title: notificationTitle,
            message: notificationMessage,
            link_to: `/jobs/${updatedJob.order_number}`,
          }));

        if (notificationsToInsert.length > 0) {
          const { error: insertNotificationsError } = await admin
            .from("notifications")
            .insert(notificationsToInsert);

          if (insertNotificationsError) {
            console.error("Error inserting notifications:", insertNotificationsError.message);
          }
        }

        // 8) Send push notifications
        const { data: devices } = await admin
          .from('profile_devices')
          .select('expo_push_token')
          .in('profile_id', officeAdminProfiles.map(p => p.id));

        if (devices && devices.length > 0) {
          for (const device of devices) {
            await invokeEdgeFunction('send-push-notification', {
              to: device.expo_push_token,
              title: notificationTitle,
              body: notificationMessage,
              data: { url: `/jobs/${updatedJob.order_number}` }
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
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
});