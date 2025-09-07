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

serve(async (req) => {
  console.log("DEBUG: create-job function started."); // Added this line
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
    if (!me || !me.org_id || !['admin', 'office'].includes(me.role)) {
      throw new Error("Access denied (admin or office role required and org_id must be set).");
    }

    // 2) Parse body
    const body = await req.json().catch((e) => {
      console.error("Error parsing request body:", e);
      return {};
    });
    console.log("Received body:", JSON.stringify(body, null, 2)); // Log the full received body

    const { jobData, stopsData, org_id, actor_id } = body;
    console.log("Destructured values:", { jobData, stopsData, org_id, actor_id }); // Log destructured values

    if (!jobData || !stopsData || !org_id || !actor_id) {
      throw new Error("Missing jobData, stopsData, org_id, or actor_id in request body.");
    }

    if (org_id !== me.org_id) {
      throw new Error("Organization ID mismatch. User can only create jobs in their own organization.");
    }
    if (actor_id !== me.id) {
      throw new Error("Actor ID mismatch. User can only create jobs as themselves.");
    }

    // 3) Allocate job reference if not provided (or if client-side generation is overridden)
    let newJobRef = jobData.ref;
    if (!newJobRef) {
      // Query existing jobs.ref for the tenant and extract all integers after the FRS- prefix.
      const { data: existingRefsData, error: refsError } = await admin
        .from("jobs")
        .select("ref")
        .eq("org_id", org_id)
        .like("ref", "FRS-%");

      if (refsError) throw new Error("Failed to fetch existing job references: " + refsError.message);

      const existingRefNumbers = new Set(
        (existingRefsData || [])
          .map((job: any) => parseInt(job.ref.substring(4), 10))
          .filter((num: any) => !isNaN(num))
      );

      let nextNumber = 1;
      while (existingRefNumbers.has(nextNumber)) {
        nextNumber++;
      }
      newJobRef = `FRS-${nextNumber.toString().padStart(3, '0')}`;
    }

    // 4) Prepare job data for insert
    const newJobId = uuidv4();
    const jobToInsert = {
      id: newJobId,
      org_id: org_id,
      ref: newJobRef,
      status: jobData.status || 'planned',
      date_created: jobData.date_created, // New field
      price: jobData.price || null, // New field
      assigned_driver_id: jobData.assigned_driver_id || null, // New field
      notes: jobData.notes || null, // New field
      created_at: new Date().toISOString(), // Use current time for DB created_at
      deleted_at: null,
    };

    // 5) Insert job
    const { data: insertedJob, error: jobInsertError } = await admin
      .from("jobs")
      .insert(jobToInsert)
      .select()
      .single();

    if (jobInsertError) throw new Error("Failed to create job: " + jobInsertError.message);

    // 6) Prepare and insert stops
    const stopsToInsert = stopsData.map((stop: any, index: number) => ({
      id: uuidv4(),
      org_id: org_id,
      job_id: insertedJob.id,
      seq: index + 1, // Ensure sequence is set
      type: stop.type,
      name: stop.name,
      address_line1: stop.address_line1,
      address_line2: stop.address_line2 || null,
      city: stop.city,
      postcode: stop.postcode,
      window_from: stop.window_from || null, // Keep window_from
      window_to: stop.window_to || null,     // Keep window_to
      notes: stop.notes || null,
      created_at: new Date().toISOString(),
    }));

    if (stopsToInsert.length > 0) {
      const { error: stopsInsertError } = await admin
        .from("job_stops")
        .insert(stopsToInsert);

      if (stopsInsertError) {
        // If stops fail, consider rolling back job creation
        await admin.from("jobs").delete().eq("id", insertedJob.id);
        throw new Error("Failed to create job stops: " + stopsInsertError.message);
      }
    }

    // 7) Audit log
    await admin.from("audit_logs").insert({
      org_id: org_id,
      actor_id: actor_id,
      entity: "jobs",
      entity_id: insertedJob.id,
      action: "create",
      before: null,
      after: insertedJob,
      created_at: new Date().toISOString(),
    }).catch((e) => console.log("DEBUG: audit insert failed", e.message));

    return new Response(
      JSON.stringify(insertedJob),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }, // Include CORS headers here
    );
  } catch (e) {
    console.error("DEBUG: function error", e);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }, // Include CORS headers here
      },
    );
  }
});