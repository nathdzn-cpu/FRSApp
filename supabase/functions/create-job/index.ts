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

// Helper to auto-save address
async function autoSaveAddress(admin: any, org_id: string, address: any) {
  const postcode = address.postcode.toUpperCase();
  const line_1 = address.address_line1;

  // Check for existing address with same line_1 and postcode (case-insensitive)
  const { data: existingAddresses, error: searchError } = await admin
    .from("saved_addresses")
    .select("id")
    .eq("org_id", org_id)
    .ilike("line_1", line_1)
    .eq("postcode", postcode);

  if (searchError) {
    console.error("Error searching for existing saved address:", searchError);
    return; // Don't block job creation if auto-save fails
  }

  if (existingAddresses && existingAddresses.length > 0) {
    console.log("Existing saved address found, skipping auto-save.");
    return;
  }

  // If not found, insert new saved_address record
  const newSavedAddress = {
    org_id: org_id,
    name: address.name || null, // Use provided name or null
    line_1: line_1,
    line_2: address.address_line2 || null,
    town_or_city: address.city,
    county: address.county || null, // Assuming county might be available
    postcode: postcode,
    favourite: false, // Default to not favourite on auto-save
  };

  const { error: insertError } = await admin
    .from("saved_addresses")
    .insert(newSavedAddress);

  if (insertError) {
    console.error("Error auto-saving new address:", insertError);
  } else {
    console.log("New address auto-saved successfully.");
  }
}

serve(async (req) => {
  console.log("DEBUG: create-job function started.");
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
    if (!me || !me.org_id || !['admin', 'office', 'customer'].includes(me.role)) {
      throw new Error("Access denied (admin, office, or customer role required and org_id must be set).");
    }

    // 2) Parse body
    const body = await req.json().catch((e) => {
      console.error("Error parsing request body:", e);
      return {};
    });
    console.log("Received body:", JSON.stringify(body, null, 2));

    const { jobData, stopsData, org_id, actor_id, actor_role } = body; // Destructure actor_role
    console.log("Destructured values:", { jobData, stopsData, org_id, actor_id, actor_role });

    if (!jobData || !stopsData || !org_id || !actor_id || !actor_role) {
      throw new Error("Missing jobData, stopsData, org_id, actor_id, or actor_role in request body.");
    }

    if (org_id !== me.org_id) {
      throw new Error("Organization ID mismatch. User can only create jobs in their own organization.");
    }
    if (actor_id !== me.id) {
      throw new Error("Actor ID mismatch. User can only create jobs as themselves.");
    }
    if (actor_role !== me.role) {
      throw new Error("Actor role mismatch. Provided role does not match authenticated user's role.");
    }

    // Determine initial status based on role
    const isCustomerRequest = me.role === 'customer';
    const initialStatus = isCustomerRequest ? 'requested' : (jobData.assigned_driver_id ? 'accepted' : 'planned');

    // 3) Prepare job data for insert
    const newJobId = uuidv4();
    const jobToInsert = {
      id: newJobId,
      org_id: org_id,
      order_number: jobData.order_number || null, // Use provided order_number or null for trigger
      status: initialStatus,
      price: jobData.price || null,
      assigned_driver_id: isCustomerRequest ? null : (jobData.assigned_driver_id || null), // Customers cannot assign drivers
      notes: jobData.notes || null,
      created_at: new Date().toISOString(),
      deleted_at: null,
      created_by: actor_id, // Track who created the job
      collection_date: jobData.collection_date,
      delivery_date: jobData.delivery_date,
    };

    // 4) Insert job
    const { data: insertedJob, error: jobInsertError } = await admin
      .from("jobs")
      .insert(jobToInsert)
      .select()
      .single();

    if (jobInsertError) {
      console.error("Error inserting job:", jobInsertError);
      throw new Error("Failed to create job: " + jobInsertError.message);
    }

    // 5) Prepare and insert stops
    const stopsToInsert = stopsData.map((stop: any, index: number) => ({
      id: uuidv4(),
      org_id: org_id,
      job_id: insertedJob.id,
      seq: index + 1,
      type: stop.type,
      name: stop.name || null, // Allow name to be null
      address_line1: stop.address_line1,
      address_line2: stop.address_line2 || null,
      city: stop.city,
      postcode: stop.postcode,
      window_from: stop.window_from || null,
      window_to: stop.window_to || null,
      notes: stop.notes || null,
      created_at: new Date().toISOString(),
    }));

    if (stopsToInsert.length > 0) {
      const { error: stopsInsertError } = await admin
        .from("job_stops")
        .insert(stopsToInsert);

      if (stopsInsertError) {
        console.error("Error inserting job stops:", stopsInsertError);
        await admin.from("jobs").delete().eq("id", insertedJob.id);
        throw new Error("Failed to create job stops: " + stopsInsertError.message);
      }

      // Auto-save new addresses from stops
      for (const stop of stopsToInsert) {
        await autoSaveAddress(admin, org_id, stop);
      }
    }

    // 6) Log job creation to job_progress_log
    let logNotes = `Job ${insertedJob.order_number} created by ${me.full_name}.`;
    if (isCustomerRequest) {
      logNotes = `New job request ${insertedJob.order_number} submitted by customer ${me.company_name || me.full_name}.`;
    } else if (jobToInsert.status === 'planned') {
      logNotes = `Job ${insertedJob.order_number} created with status 'Planned' (no driver assigned).`;
    } else {
      logNotes = `Job ${insertedJob.order_number} created with status 'Accepted' (driver assigned).`;
    }

    const { error: progressLogError } = await admin
      .from('job_progress_log')
      .insert({
        org_id: org_id,
        job_id: insertedJob.id,
        actor_id: actor_id,
        actor_role: actor_role,
        action_type: initialStatus, // Use the actual initial status
        notes: logNotes,
        timestamp: new Date().toISOString(),
      });
    if (progressLogError) {
      console.error("DEBUG: progress log insert failed for job creation", progressLogError.message);
    }

    // 7) If it's a customer request, notify office/admin users
    if (isCustomerRequest) {
      const { data: officeStaff, error: staffError } = await admin
        .from('profiles')
        .select('id')
        .eq('org_id', org_id)
        .in('role', ['admin', 'office']);

      if (staffError) {
        console.error("Error fetching office staff for notification:", staffError.message);
      } else if (officeStaff) {
        const notifications = officeStaff.map(staff => ({
          user_id: staff.id,
          org_id: org_id,
          title: 'New Job Request',
          message: `Request ${insertedJob.order_number} from ${me.company_name || me.full_name} is awaiting approval.`,
          link_to: `/jobs/${insertedJob.order_number}`,
        }));
        
        const { error: notificationError } = await admin.from('notifications').insert(notifications);
        if (notificationError) {
          console.error("Error creating notifications for office staff:", notificationError.message);
        }
      }
    }

    // 8) Audit log
    const { error: auditError } = await admin.from("audit_logs").insert({
      org_id: org_id,
      actor_id: actor_id,
      entity: "jobs",
      entity_id: insertedJob.id,
      action: "create",
      before: null,
      after: insertedJob,
      created_at: new Date().toISOString(),
    });
    if (auditError) {
      console.error("DEBUG: audit insert failed", auditError.message);
    }

    return new Response(
      JSON.stringify(insertedJob),
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