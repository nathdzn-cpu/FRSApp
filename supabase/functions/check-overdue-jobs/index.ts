// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function invokeEdgeFunction(functionName: string, payload: any) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
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
      console.error(`Error invoking ${functionName}: ${response.status}`);
    }
  } catch (error) {
    console.error(`Failed to invoke ${functionName}: ${error.message}`);
  }
}

function adminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

serve(async (_req) => {
  if (_req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const admin = adminClient();
    const sixtyMinutesAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // 1. Find overdue jobs
    const { data: overdueJobs, error: jobsError } = await admin
      .from('jobs')
      .select('id, org_id, order_number, status, assigned_driver_id, last_status_update_at, ( job_stops ( name, type, seq ) )')
      .in('status', ['at_collection', 'at_delivery'])
      .eq('overdue_notification_sent', false)
      .lt('last_status_update_at', sixtyMinutesAgo);

    if (jobsError) throw jobsError;
    if (!overdueJobs || overdueJobs.length === 0) {
      return new Response(JSON.stringify({ ok: true, notifiedJobs: 0, message: "No overdue jobs found." }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    for (const job of overdueJobs) {
      // 2. Send notifications
      const driverId = job.assigned_driver_id;
      const siteType = job.status === 'at_collection' ? 'Collection' : 'Delivery';
      const currentStop = (job.job_stops as any[])?.find(s => s.type.toLowerCase() === siteType.toLowerCase());
      const siteName = currentStop?.name || 'the site';

      // Get driver name for office notifications
      let driverName = 'A driver';
      if (driverId) {
        const { data: driverProfile, error: driverError } = await admin
          .from('profiles')
          .select('full_name')
          .eq('id', driverId)
          .single();
        if (!driverError && driverProfile) {
          driverName = driverProfile.full_name;
        }
      }

      // 2a. Office/Admin Notifications (In-app & Push)
      const { data: officeAdminProfiles } = await admin
        .from("profiles")
        .select("id")
        .eq("org_id", job.org_id)
        .in("role", ["admin", "office"]);

      if (officeAdminProfiles && officeAdminProfiles.length > 0) {
        const officeMessage = `${driverName} has been at ${siteType} on job ${job.order_number} for 1 hour.`;
        const officeTitle = `Job Delayed: ${job.order_number}`;
        
        // In-app notifications
        const notificationsToInsert = officeAdminProfiles.map(p => ({
          user_id: p.id,
          org_id: job.org_id,
          title: officeTitle,
          message: officeMessage,
          link_to: `/jobs/${job.order_number}`,
        }));
        await admin.from("notifications").insert(notificationsToInsert);

        // Push notifications
        const { data: devices } = await admin
          .from('profile_devices')
          .select('expo_push_token')
          .in('profile_id', officeAdminProfiles.map(p => p.id));
        
        if (devices && devices.length > 0) {
          for (const device of devices) {
            await invokeEdgeFunction('send-push-notification', {
              to: device.expo_push_token,
              title: officeTitle,
              body: officeMessage,
              data: { url: `/jobs/${job.order_number}` }
            });
          }
        }
      }

      // 2b. Driver Notification (Push)
      if (driverId) {
        const { data: devices } = await admin
          .from('profile_devices')
          .select('expo_push_token')
          .eq('profile_id', driverId);
        
        if (devices && devices.length > 0) {
          for (const device of devices) {
            await invokeEdgeFunction('send-push-notification', {
              to: device.expo_push_token,
              title: 'Job Status Update Required',
              body: 'Your job status hasn’t updated within 1 hour. Can you please inform the office of your current progress?',
              data: { url: `/jobs/${job.order_number}` }
            });
          }
        }
      }

      // 3. Mark job as notified
      await admin
        .from('jobs')
        .update({ overdue_notification_sent: true })
        .eq('id', job.id);
    }

    return new Response(JSON.stringify({ ok: true, notifiedJobs: overdueJobs.length }), { headers: { "Content-Type": "application/json", ...corsHeaders } });

  } catch (e) {
    console.error("Error in check-overdue-jobs function:", e);
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});