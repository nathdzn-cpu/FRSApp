// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { v4 as uuidv4 } from "https://esm.sh/uuid@9.0.1";

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
    if (!me || me.role !== "driver" || !me.org_id) {
      throw new Error("Access denied (driver role required and org_id must be set).");
    }

    // 2) Parse body
    const body = await req.json().catch(() => ({}));
    const { truck_reg, trailer_no, started_at, finished_at, signature, items, org_id: body_org_id, driver_id: body_driver_id, actor_role } = body; // Destructure actor_role

    if (!truck_reg || !started_at || !finished_at || !signature || !items || !Array.isArray(items) || !actor_role) {
      throw new Error("Missing required fields: truck_reg, started_at, finished_at, signature, items, or actor_role.");
    }

    // Ensure org_id and driver_id from body match user's profile
    if (body_org_id && body_org_id !== me.org_id) {
      throw new Error("Organization ID mismatch. Driver can only submit checks for their own organization.");
    }
    if (body_driver_id && body_driver_id !== me.id) {
      throw new Error("Driver ID mismatch. Driver can only submit checks as themselves.");
    }
    if (actor_role !== me.role) {
      throw new Error("Actor role mismatch. Provided role does not match authenticated user's role.");
    }

    const effective_org_id = me.org_id;
    const effective_driver_id = me.id;

    // 3) Insert daily_check_response
    const newDailyCheckResponse = {
      id: uuidv4(),
      org_id: effective_org_id,
      driver_id: effective_driver_id,
      truck_reg,
      trailer_no: trailer_no || null,
      started_at,
      finished_at,
      duration_seconds: Math.round((new Date(finished_at).getTime() - new Date(started_at).getTime()) / 1000),
      signature, // This would ideally be a storage path after upload
      items,
      created_at: new Date().toISOString(),
    };

    const { data: insertedResponse, error: insertError } = await admin
      .from("daily_check_responses")
      .insert(newDailyCheckResponse)
      .select()
      .single();

    if (insertError) throw new Error("Failed to insert daily check response: " + insertError.message);

    // 4) Log daily check submission to job_progress_log (as a general event)
    const { error: progressLogError } = await admin
      .from('job_progress_log')
      .insert({
        org_id: effective_org_id,
        job_id: null, // Daily checks are not directly tied to a job_id in this context
        actor_id: effective_driver_id,
        actor_role: actor_role,
        action_type: 'daily_check_submitted',
        notes: `Daily HGV check submitted for truck ${truck_reg}.`,
        timestamp: new Date().toISOString(),
      });
    if (progressLogError) {
      console.error("DEBUG: progress log insert failed for daily check submission", progressLogError.message);
    }

    // 5) Audit log
    await admin.from("audit_logs").insert({
      org_id: effective_org_id,
      actor_id: effective_driver_id,
      entity: "daily_check_responses",
      entity_id: insertedResponse.id,
      action: "create",
      after: { truck_reg, status: "completed" },
      created_at: new Date().toISOString(),
    }).catch((e) => console.log("DEBUG: audit insert failed", e.message));

    return new Response(
      JSON.stringify(insertedResponse),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("DEBUG: function error", e);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});