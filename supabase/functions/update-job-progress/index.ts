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
    console.log("Attempting to authenticate user...");
    const { data: authUser, error: authUserError } = await user.auth.getUser();
    if (authUserError) {
      console.error("Auth user fetch error:", authUserError);
      throw new Error("Authentication failed: " + authUserError.message);
    }
    if (!authUser?.user?.id) {
      throw new Error("Not signed in or no auth user ID.");
    }
    console.log(`Authenticated user ID: ${authUser.user.id}`);

    console.log(`Fetching profile for user ID: ${authUser.user.id}`);
    const { data: me, error: meErr } = await user
      .from("profiles")
      .select("id, role, org_id, full_name")
      .eq("id", authUser.user.id)
      .single();

    if (meErr) {
      console.error("Profile lookup error:", meErr);
      throw new Error("Profile lookup failed: " + meErr.message);
    }
    if (!me || !me.org_id || !['admin', 'office', 'driver'].includes(me.role)) {
      console.error("Access denied: Profile or org_id missing, or role not admin/office/driver.", { me });
      throw new Error("Access denied (admin, office, or driver role required and org_id must be set).");
    }
    console.log(`User profile found: ${me.full_name}, Role: ${me.role}, Org ID: ${me.org_id}`);

    // 2) Parse body
    const body = await req.json().catch((e) => {
      console.error("Error parsing request body:", e);
      return {};
    });
    console.log("Received body for update-job-progress:", JSON.stringify(body, null, 2));

    const { job_id, org_id, actor_id, actor_role, new_status, timestamp, notes, stop_id, lat, lon } = body;

    if (!job_id || !org_id || !actor_id || !actor_role || !new_status || !timestamp) {
      console.error("Missing required fields in payload:", { job_id, org_id, actor_id, actor_role, new_status, timestamp });
      throw new Error("Missing required fields: job_id, org_id, actor_id, actor_role, new_status, timestamp.");
    }

    if (org_id !== me.org_id) {
      console.error("Organization ID mismatch:", { payloadOrgId: org_id, userOrgId: me.org_id });
      throw new Error("Organization ID mismatch. User can only update jobs in their own organization.");
    }
    if (actor_id !== me.id) {
      console.error("Actor ID mismatch:", { payloadActorId: actor_id, userId: me.id });
      throw new Error("Actor ID mismatch. User can only perform actions as themselves.");
    }
    if (actor_role !== me.role) {
      console.error("Actor role mismatch:", { payloadActorRole: actor_role, userRole: me.role });
      throw new Error("Actor role mismatch. Provided role does not match authenticated user's role.");
    }

    // 3) Fetch current job status for audit log and driver-specific check
    console.log(`Fetching job ${job_id} for org ${org_id}`);
    const { data: oldJob, error: fetchJobError } = await admin
      .from("jobs")
      .select("status, assigned_driver_id, order_number")
      .eq("id", job_id)
      .eq("org_id", org_id)
      .single();

    if (fetchJobError) {
      console.error("Failed to fetch existing job:", fetchJobError);
      throw new Error("Failed to fetch existing job: " + fetchJobError.message);
    }
    if (!oldJob) {
      console.error("Job not found:", { job_id, org_id });
      throw new Error("Job not found.");
    }
    console.log(`Job found. Current status: ${oldJob.status}, Assigned Driver: ${oldJob.assigned_driver_id}`);

    // MODIFIED: Driver-specific security check
    if (me.role === 'driver' && oldJob.assigned_driver_id !== me.id) {
      console.error("Access denied for driver: Job not assigned to this driver.", { driverId: me.id, assignedDriverId: oldJob.assigned_driver_id });
      throw new Error("Access denied. Driver can only update progress for jobs assigned to them.");
    }

    // 4) Update jobs table
    const jobUpdates: Record<string, any> = {
      status: new_status,
      last_status_update_at: timestamp,
    };

    // If status is moving away from a waiting state, reset the overdue flag
    if (oldJob.status === 'at_collection' || oldJob.status === 'at_delivery') {
      if (new_status !== oldJob.status) {
        jobUpdates.overdue_notification_sent = false;
      }
    }

    // Check if this is the final POD upload for the last delivery stop
    if (new_status === 'pod_received') {
      console.log("Checking for final POD upload status...");
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
        console.log("Current stop is the last delivery. Checking if all delivery stops have PODs.");
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
          console.log("All delivery stops have PODs. Setting job status to 'delivered'.");
        }
      }
    }

    console.log(`Updating job ${job_id} with status: ${jobUpdates.status}`);
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
    console.log(`Job ${job_id} status updated to ${updatedJob.status}`);

    // 5) Insert into job_progress_log table
    console.log("Inserting job progress log...");
    const { data: insertedLog, error: insertLogError } = await admin
      .from("job_progress_log")
      .insert({
        id: uuidv4(),
        org_id: org_id,
        job_id: job_id,
        actor_id: actor_id,
        actor_role: actor_role,
        action_type: new_status,
        timestamp: timestamp,
        notes: notes || null,
        stop_id: stop_id || null,
        lat: lat || null,
        lon: lon || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertLogError) {
      console.error("Error inserting job progress log:", insertLogError);
      throw new Error("Failed to log job progress: " + insertLogError.message);
    }
    console.log(`Job progress log inserted for job ${job_id}, status ${new_status}`);

    // 6) Audit log
    console.log("Inserting audit log...");
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
    } else {
      console.log("Audit log inserted.");
    }

    // 7) Create notifications for office/admin users if update is from a driver
    if (actor_role === 'driver') {
      console.log("Driver updated job. Creating notifications for office/admin profiles...");
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
          console.log(`Inserting ${notificationsToInsert.length} notifications.`);
          const { error: insertNotificationsError } = await admin
            .from("notifications")
            .insert(notificationsToInsert);

          if (insertNotificationsError) {
            console.error("Error inserting notifications:", insertNotificationsError.message);
          } else {
            console.log("Notifications inserted.");
          }
        }

        // 8) Send push notifications
        console.log("Sending push notifications...");
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
          console.log(`Push notifications sent to ${devices.length} devices.`);
        } else {
          console.log("No devices found for push notifications.");
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
      JSON.stringify({ ok: false, error: (e as Error).message, details: (e as any).details || (e as any).message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
});