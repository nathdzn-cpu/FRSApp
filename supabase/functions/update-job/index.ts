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

// Helper to invoke another Edge Function
async function invokeEdgeFunction(functionName: string, payload: any) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase URL or Anon Key for Edge Function invocation.");
    return;
  }

  const url = `${supabaseUrl}/functions/v1/${functionName}`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`, // Use anon key for function-to-function calls
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
      .select("id, role, org_id")
      .eq("id", authUser.user.id)
      .single();

    if (meErr) throw new Error("Profile lookup failed: " + meErr.message);
    if (!me || !me.org_id) {
      throw new Error("Access denied (org_id must be set).");
    }

    // 2) Parse body
    const body = await req.json().catch(() => ({}));
    const { job_id, org_id, actor_id, actor_role, job_updates, stops_to_add, stops_to_update, stops_to_delete } = body;

    if (!job_id || !org_id || !actor_id || !actor_role) {
      throw new Error("Missing job_id, org_id, actor_id, or actor_role in request body.");
    }
    if (org_id !== me.org_id) {
      throw new Error("Organization ID mismatch. User can only manage jobs in their own organization.");
    }
    if (actor_id !== me.id) {
      throw new Error("Actor ID mismatch. User can only perform actions as themselves.");
    }
    if (actor_role !== me.role) {
      throw new Error("Actor role mismatch. Provided role does not match authenticated user's role.");
    }

    // Fetch the existing job to compare and apply role-based restrictions
    const { data: existingJob, error: fetchJobError } = await admin
      .from("jobs")
      .select("status, assigned_driver_id, notes, order_number") // Fetch order_number for notifications
      .eq("id", job_id)
      .eq("org_id", org_id)
      .single();

    if (fetchJobError) throw new Error("Failed to fetch existing job: " + fetchJobError.message);
    if (!existingJob) throw new Error("Job not found.");

    const finalJobUpdates: Record<string, any> = {};
    const auditBeforeJob: Record<string, any> = { ...existingJob };
    const auditAfterJob: Record<string, any> = {};
    let statusChanged = false;
    let oldStatus = existingJob.status;
    let driverReassigned = false;
    let oldAssignedDriverId = existingJob.assigned_driver_id;
    let newAssignedDriverId = existingJob.assigned_driver_id;

    // Role-based access control for job updates
    if (me.role === 'admin' || me.role === 'office') {
      // Admin/Office can update all fields
      if (job_updates) {
        for (const key in job_updates) {
          if (job_updates.hasOwnProperty(key)) {
            finalJobUpdates[key] = job_updates[key];
            auditAfterJob[key] = job_updates[key];
            if (key === 'status' && job_updates[key] !== oldStatus) {
              statusChanged = true;
            }
            if (key === 'assigned_driver_id' && job_updates[key] !== oldAssignedDriverId) {
              driverReassigned = true;
              newAssignedDriverId = job_updates[key];
            }
          }
        }
      }
    } else if (me.role === 'driver') {
      // Driver can only update status and notes
      if (job_updates?.status !== undefined) {
        finalJobUpdates.status = job_updates.status;
        auditAfterJob.status = job_updates.status;
        if (job_updates.status !== oldStatus) {
          statusChanged = true;
        }
      }
      if (job_updates?.notes !== undefined) {
        finalJobUpdates.notes = job_updates.notes;
        auditAfterJob.notes = job_updates.notes;
      }
      // Ensure driver cannot change assigned_driver_id
      if (job_updates?.assigned_driver_id !== undefined && job_updates.assigned_driver_id !== existingJob.assigned_driver_id) {
        throw new Error("Drivers cannot change job assignment.");
      }
    } else {
      throw new Error("Unauthorized role for job updates.");
    }

    // Perform job update if there are changes
    let updatedJobData: any = existingJob;
    if (Object.keys(finalJobUpdates).length > 0) {
      const { data, error: updateJobError } = await admin
        .from("jobs")
        .update(finalJobUpdates)
        .eq("id", job_id)
        .eq("org_id", org_id)
        .select()
        .single();
      if (updateJobError) throw new Error("Failed to update job: " + updateJobError.message);
      updatedJobData = data;

      // If status changed, log to job_progress_log
      if (statusChanged) {
        const { error: progressLogError } = await admin
          .from('job_progress_log')
          .insert({
            org_id: org_id,
            job_id: job_id,
            actor_id: actor_id,
            actor_role: actor_role,
            action_type: finalJobUpdates.status, // Use the new status as action_type
            notes: `Job status changed from '${oldStatus}' to '${finalJobUpdates.status}' via edit.`,
            timestamp: new Date().toISOString(),
          });
        if (progressLogError) {
          console.error("DEBUG: progress log insert failed for status change in update-job", progressLogError.message);
        }
      }

      // If driver reassigned, log to job_progress_log and send notifications
      if (driverReassigned) {
        let oldDriverName = "Unassigned";
        let newDriverName = "Unassigned";

        // Fetch old driver's profile and push token
        if (oldAssignedDriverId) {
          const { data: oldDriverProfile, error: oldDriverProfileError } = await admin
            .from("profiles")
            .select("full_name, user_id")
            .eq("id", oldAssignedDriverId)
            .single();
          if (oldDriverProfileError) console.error("Error fetching old driver profile:", oldDriverProfileError.message);
          if (oldDriverProfile) {
            oldDriverName = oldDriverProfile.full_name;
            const { data: oldDriverDevices } = await admin
              .from("profile_devices")
              .select("expo_push_token")
              .eq("profile_id", oldAssignedDriverId);
            if (oldDriverDevices && oldDriverDevices.length > 0) {
              for (const device of oldDriverDevices) {
                await invokeEdgeFunction('send-push-notification', {
                  to: device.expo_push_token,
                  title: "Job Unassigned",
                  body: `Job ${existingJob.order_number} has been unassigned from you.`,
                });
              }
            }
          }
        }

        // Fetch new driver's profile and push token
        if (newAssignedDriverId) {
          const { data: newDriverProfile, error: newDriverProfileError } = await admin
            .from("profiles")
            .select("full_name, user_id")
            .eq("id", newAssignedDriverId)
            .single();
          if (newDriverProfileError) console.error("Error fetching new driver profile:", newDriverProfileError.message);
          if (newDriverProfile) {
            newDriverName = newDriverProfile.full_name;
            const { data: newDriverDevices } = await admin
              .from("profile_devices")
              .select("expo_push_token")
              .eq("profile_id", newAssignedDriverId);
            if (newDriverDevices && newDriverDevices.length > 0) {
              for (const device of newDriverDevices) {
                await invokeEdgeFunction('send-push-notification', {
                  to: device.expo_push_token,
                  title: "Job Assigned",
                  body: `You've been assigned to Job ${existingJob.order_number}.`,
                });
              }
            }
          }
        }

        // Log reassignment to job_progress_log
        const { error: reassignmentLogError } = await admin
          .from('job_progress_log')
          .insert({
            org_id: org_id,
            job_id: job_id,
            actor_id: actor_id,
            actor_role: actor_role,
            action_type: 'driver_reassigned',
            notes: `Driver reassigned from '${oldDriverName}' to '${newDriverName}' by ${me.full_name || me.role}.`,
            timestamp: new Date().toISOString(),
          });
        if (reassignmentLogError) {
          console.error("DEBUG: progress log insert failed for driver reassignment", reassignmentLogError.message);
        }
      }
    }

    // Handle stop updates (Admin/Office can add/update/delete, Driver can only update window_from/to and notes)
    const auditBeforeStops: Record<string, any>[] = [];
    const auditAfterStops: Record<string, any>[] = [];

    // Fetch existing stops for comparison and driver restrictions
    const { data: currentStops, error: fetchStopsError } = await admin
      .from("job_stops")
      .select("*")
      .eq("job_id", job_id)
      .eq("org_id", org_id);
    if (fetchStopsError) throw new Error("Failed to fetch current stops: " + fetchStopsError.message);
    const currentStopsMap = new Map(currentStops.map(s => [s.id, s]));

    if (me.role === 'admin' || me.role === 'office') {
      // Admin/Office can add, update, delete any stop fields
      if (stops_to_add && stops_to_add.length > 0) {
        const newStops = stops_to_add.map((stop: any, index: number) => ({
          id: uuidv4(),
          org_id: org_id,
          job_id: job_id,
          seq: stop.seq,
          type: stop.type,
          name: stop.name,
          address_line1: stop.address_line1,
          address_line2: stop.address_line2 || null,
          city: stop.city,
          postcode: stop.postcode,
          window_from: stop.window_from || null,
          window_to: stop.window_to || null,
          notes: stop.notes || null,
          created_at: new Date().toISOString(),
        }));
        const { error: addStopsError } = await admin.from("job_stops").insert(newStops);
        if (addStopsError) throw new Error("Failed to add new stops: " + addStopsError.message);
        auditAfterStops.push(...newStops);

        // Log stop additions to job_progress_log
        const { error: progressLogError } = await admin
          .from('job_progress_log')
          .insert(newStops.map((stop: any) => ({
            org_id: org_id,
            job_id: job_id,
            actor_id: actor_id,
            actor_role: actor_role,
            action_type: 'stop_added',
            stop_id: stop.id,
            notes: `Added ${stop.type} stop: ${stop.name}.`,
            timestamp: new Date().toISOString(),
          })));
        if (progressLogError) console.error("DEBUG: progress log insert failed for stop additions", progressLogError.message);
      }

      if (stops_to_update && stops_to_update.length > 0) {
        for (const stopUpdate of stops_to_update) {
          const { id: stopId, ...updates } = stopUpdate;
          const oldStop = currentStopsMap.get(stopId);
          if (oldStop) auditBeforeStops.push(oldStop);

          const { error: updateStopError } = await admin
            .from("job_stops")
            .update(updates)
            .eq("id", stopId)
            .eq("job_id", job_id)
            .eq("org_id", org_id);
          if (updateStopError) throw new Error(`Failed to update stop ${stopId}: ${updateStopError.message}`);
          auditAfterStops.push({ id: stopId, ...updates });

          // Log stop updates to job_progress_log
          const { error: progressLogError } = await admin
            .from('job_progress_log')
            .insert({
              org_id: org_id,
              job_id: job_id,
              actor_id: actor_id,
              actor_role: actor_role,
              action_type: 'stop_updated',
              stop_id: stopId,
              notes: `Updated ${oldStop?.type} stop: ${oldStop?.name}.`,
              timestamp: new Date().toISOString(),
            });
          if (progressLogError) console.error("DEBUG: progress log insert failed for stop updates", progressLogError.message);
        }
      }

      if (stops_to_delete && stops_to_delete.length > 0) {
        const deletedStops = currentStops.filter(s => stops_to_delete.includes(s.id));
        const { error: deleteStopsError } = await admin
          .from("job_stops")
          .delete()
          .in("id", stops_to_delete)
          .eq("job_id", job_id)
          .eq("org_id", org_id);
        if (deleteStopsError) throw new Error("Failed to delete stops: " + deleteStopsError.message);
        auditBeforeStops.push(...deletedStops);

        // Log stop deletions to job_progress_log
        const { error: progressLogError } = await admin
          .from('job_progress_log')
          .insert(deletedStops.map((stop: any) => ({
            org_id: org_id,
            job_id: job_id,
            actor_id: actor_id,
            actor_role: actor_role,
            action_type: 'stop_deleted',
            stop_id: stop.id,
            notes: `Deleted ${stop.type} stop: ${stop.name}.`,
            timestamp: new Date().toISOString(),
          })));
        if (progressLogError) console.error("DEBUG: progress log insert failed for stop deletions", progressLogError.message);
      }
    } else if (me.role === 'driver') {
      // Driver can only update window_from, window_to, and notes on existing stops
      if (stops_to_add && stops_to_add.length > 0) {
        throw new Error("Drivers cannot add new stops.");
      }
      if (stops_to_delete && stops_to_delete.length > 0) {
        throw new Error("Drivers cannot delete stops.");
      }

      if (stops_to_update && stops_to_update.length > 0) {
        for (const stopUpdate of stops_to_update) {
          const { id: stopId, window_from, window_to, notes, ...otherUpdates } = stopUpdate;
          if (Object.keys(otherUpdates).length > 0) {
            throw new Error("Drivers can only update window_from, window_to, and notes on stops.");
          }

          const oldStop = currentStopsMap.get(stopId);
          if (oldStop) auditBeforeStops.push(oldStop);

          const driverStopUpdates: Record<string, any> = {};
          if (window_from !== undefined) driverStopUpdates.window_from = window_from;
          if (window_to !== undefined) driverStopUpdates.window_to = window_to;
          if (notes !== undefined) driverStopUpdates.notes = notes;

          if (Object.keys(driverStopUpdates).length > 0) {
            const { error: updateStopError } = await admin
              .from("job_stops")
              .update(driverStopUpdates)
              .eq("id", stopId)
              .eq("job_id", job_id)
              .eq("org_id", org_id);
            if (updateStopError) throw new Error(`Failed to update stop ${stopId}: ${updateStopError.message}`);
            auditAfterStops.push({ id: stopId, ...driverStopUpdates });

            // Log driver stop updates to job_progress_log
            const { error: progressLogError } = await admin
              .from('job_progress_log')
              .insert({
                org_id: org_id,
                job_id: job_id,
                actor_id: actor_id,
                actor_role: actor_role,
                action_type: 'stop_details_updated',
                stop_id: stopId,
                notes: `Driver updated stop details for ${oldStop?.name}.`,
                timestamp: new Date().toISOString(),
              });
            if (progressLogError) console.error("DEBUG: progress log insert failed for driver stop updates", progressLogError.message);
          }
        }
      }
    }

    // 6) Audit log for job and stop changes
    if (Object.keys(auditAfterJob).length > 0 || auditBeforeStops.length > 0 || auditAfterStops.length > 0) {
      try {
        await admin.from("audit_logs").insert({
          org_id: org_id,
          actor_id: actor_id,
          entity: "jobs",
          entity_id: job_id,
          action: "update",
          before: { job: auditBeforeJob, stops: auditBeforeStops },
          after: { job: auditAfterJob, stops: auditAfterStops },
          created_at: new Date().toISOString(),
        });
      } catch (e) {
        console.log("DEBUG: audit insert failed", (e as Error).message);
      }
    }

    return new Response(
      JSON.stringify({ message: "Job updated successfully.", job: updatedJobData }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } },
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