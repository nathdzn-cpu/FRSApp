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

// Helper to get display status (mimicking frontend for consistent notes)
function getDisplayStatus(status: string): string {
  switch (status) {
    case 'planned': return 'Planned';
    case 'assigned': return 'Assigned';
    case 'accepted': return 'Accepted';
    case 'on_route_collection': return 'On Route Collection';
    case 'at_collection': return 'At Collection';
    case 'loaded': return 'Loaded';
    case 'on_route_delivery': return 'On Route Delivery';
    case 'at_delivery': return 'At Delivery';
    case 'delivered': return 'Delivered';
    case 'pod_received': return 'POD Received';
    case 'cancelled': return 'Cancelled';
    case 'job_created': return 'Job Created';
    case 'job_cloned': return 'Job Cloned';
    case 'job_confirmed': return 'Job Confirmed';
    case 'eta_set': return 'ETA Set';
    case 'pod_requested': return 'POD Requested';
    case 'pod_uploaded': return 'POD Uploaded';
    case 'document_uploaded': return 'Document Uploaded';
    case 'location_ping': return 'Location Ping';
    case 'note_added': return 'Note Added';
    case 'status_changed': return 'Status Changed';
    case 'driver_reassigned': return 'Driver Reassigned';
    case 'stop_added': return 'Stop Added';
    case 'stop_updated': return 'Stop Updated';
    case 'stop_deleted': return 'Stop Deleted';
    case 'stop_details_updated': return 'Stop Details Updated';
    case 'daily_check_submitted': return 'Daily Check Submitted';
    case 'daily_check_item_created': return 'Daily Check Item Created';
    case 'daily_check_item_updated': return 'Daily Check Item Updated';
    case 'daily_check_item_deleted': return 'Daily Check Item Deleted';
    case 'user_created': return 'User Created';
    case 'user_updated': return 'User Updated';
    case 'user_deleted': return 'User Deleted';
    case 'password_reset_sent': return 'Password Reset Sent';
    case 'purge_demo_users': return 'Purge Demo Users';
    case 'purge_all_non_admin_users': return 'Purge All Non-Admin Users';
    case 'timeline_event_removed_from_timeline': return 'Removed from Timeline';
    case 'timeline_event_restored_to_timeline': return 'Restored to Timeline';
    default:
      return status.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);

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
      .select("id, role, org_id, full_name") // Fetch full_name for audit logs
      .eq("id", authUser.user.id)
      .single();

    if (meErr) throw new Error("Profile lookup failed: " + meErr.message);
    if (!me || me.role !== "admin" || !me.org_id) {
      throw new Error("Access denied (admin role required and org_id must be set).");
    }

    // 2) Parse body and determine operation
    const body = await req.json().catch(() => ({}));
    const { op, id, full_name, email, password, phone, dob, role, truck_reg, trailer_no, is_demo, profile_id, user_id, updates, org_id: body_org_id, actor_role } = body; // Destructure actor_role

    // Ensure org_id from body matches user's org_id
    if (body_org_id && body_org_id !== me.org_id) {
      throw new Error("Organization ID mismatch. User can only manage items in their own organization.");
    }
    const effective_org_id = me.org_id;

    // Ensure actor_role matches authenticated user's role
    if (actor_role && actor_role !== me.role) {
      throw new Error("Actor role mismatch. Provided role does not match authenticated user's role.");
    }

    const currentTimestamp = new Date().toISOString();
    const formattedCurrentTimestamp = new Date(currentTimestamp).toLocaleString('en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    let resultData: any;
    let status = 200;

    switch (op) {
      case "read_all":
        const { data: readProfiles, error: readError } = await admin
          .from("profiles")
          .select("id, org_id, full_name, dob, phone, role, user_id, truck_reg, trailer_no, created_at, last_location, last_job_status, is_demo")
          .eq("org_id", effective_org_id)
          .order("created_at", { ascending: false });
        if (readError) throw readError;
        resultData = readProfiles;
        break;

      case "create":
        if (!full_name || !email || !password || !phone || !role) throw new Error("Missing required fields for user creation.");

        const { data: createdAuthUser, error: cErr } = await admin.auth.admin.createUser({
          email,
          password: password,
          email_confirm: true,
        });

        if (cErr) throw new Error("Auth user creation failed: " + cErr.message);
        const newAuthId = createdAuthUser.user?.id;
        if (!newAuthId) throw new Error("Auth user ID missing after creation.");

        // The 'handle_new_user' trigger will create the initial profile row.
        // We now need to update it with the specific details from the form.
        const profileUpdates: Record<string, any> = {
          org_id: effective_org_id,
          full_name,
          phone,
          role,
          user_id: newAuthId, // Ensure user_id is set correctly
          is_demo: is_demo ?? false,
        };
        if (dob) profileUpdates.dob = dob;
        if (role === "driver") {
          profileUpdates.truck_reg = truck_reg || null;
          profileUpdates.trailer_no = trailer_no || null;
        }

        // Wait a moment for the trigger to complete, then update the profile
        // A small delay can help ensure the trigger has run, though Supabase usually handles this quickly.
        await new Promise(resolve => setTimeout(resolve, 100)); 

        const { data: updatedProfile, error: uErr } = await admin
          .from("profiles")
          .update(profileUpdates) // Use update instead of insert
          .eq("id", newAuthId)
          .select()
          .single();

        if (uErr) {
          // If update fails, it means the profile wasn't created by the trigger,
          // or there's another issue. We should still try to delete the auth user.
          await admin.auth.admin.deleteUser(newAuthId).catch(e => console.error("Failed to rollback auth user:", e.message));
          throw new Error("Profile update failed after auth user creation: " + uErr.message);
        }

        // Log user creation to job_progress_log (as a general event)
        const { error: progressLogErrorCreate } = await admin
          .from('job_progress_log')
          .insert({
            org_id: effective_org_id,
            job_id: null, // Not directly tied to a job
            actor_id: me.id,
            actor_role: me.role,
            action_type: 'user_created',
            notes: `${me.full_name} created new ${role} user '${full_name}'.`,
            timestamp: currentTimestamp,
          });
        if (progressLogErrorCreate) console.error("DEBUG: progress log insert failed for user creation", progressLogErrorCreate.message);

        try {
          await admin.from("audit_logs").insert({
            org_id: effective_org_id,
            actor_id: me.id,
            entity: "profiles",
            entity_id: newAuthId,
            action: "create",
            after: { role, full_name, email },
            created_at: currentTimestamp,
          });
        } catch (e) {
          console.log("DEBUG: audit insert failed", (e as Error).message);
        }

        resultData = updatedProfile;
        break;

      case "update":
        if (!profile_id || !updates) throw new Error("Profile ID and updates are required for updating a user.");

        const { data: oldProfile, error: fetchOldProfileError } = await admin
          .from("profiles")
          .select("user_id, full_name, role") // Fetch old role for logging
          .eq("id", profile_id)
          .eq("org_id", effective_org_id)
          .single();

        if (fetchOldProfileError) throw new Error("Failed to fetch old profile for update: " + fetchOldProfileError.message);
        if (!oldProfile) throw new Error("Profile not found for update.");

        const { data: updatedProfileData, error: updateError } = await admin
          .from("profiles")
          .update(updates)
          .eq("id", profile_id)
          .eq("org_id", effective_org_id)
          .select()
          .single();

        if (updateError) throw updateError;

        // Log user update to job_progress_log
        const { error: progressLogErrorUpdate } = await admin
          .from('job_progress_log')
          .insert({
            org_id: effective_org_id,
            job_id: null,
            actor_id: me.id,
            actor_role: me.role,
            action_type: 'user_updated',
            notes: `${me.full_name} updated user '${oldProfile.full_name}' (role: ${oldProfile.role} -> ${updates.role || oldProfile.role}).`,
            timestamp: currentTimestamp,
          });
        if (progressLogErrorUpdate) console.error("DEBUG: progress log insert failed for user update", progressLogErrorUpdate.message);

        try {
          await admin.from("audit_logs").insert({
            org_id: effective_org_id,
            actor_id: me.id,
            entity: "profiles",
            entity_id: profile_id,
            action: "update",
            before: oldProfile, // Simplified, ideally full old profile
            after: updatedProfileData,
            created_at: currentTimestamp,
          });
        } catch (e) {
          console.log("DEBUG: audit insert failed", (e as Error).message);
        }

        resultData = updatedProfileData;
        break;

      case "delete":
        if (!profile_id) throw new Error("Profile ID is required for deleting a user.");

        const { data: profileToDelete, error: fetchProfileError } = await admin
          .from("profiles")
          .select("user_id, full_name, role")
          .eq("id", profile_id)
          .eq("org_id", effective_org_id)
          .single();

        if (fetchProfileError) throw new Error("Failed to fetch profile for deletion: " + fetchProfileError.message);
        if (!profileToDelete) throw new Error("Profile not found for deletion.");

        // Delete auth user first
        const { error: deleteAuthError } = await admin.auth.admin.deleteUser(profileToDelete.user_id);
        if (deleteAuthError) throw new Error("Failed to delete auth user: " + deleteAuthError.message);

        // Then delete profile
        const { error: deleteProfileError } = await admin
          .from("profiles")
          .delete()
          .eq("id", profile_id)
          .eq("org_id", effective_org_id);

        if (deleteProfileError) throw new Error("Failed to delete profile: " + deleteProfileError.message);

        // Log user deletion to job_progress_log
        const { error: progressLogErrorDelete } = await admin
          .from('job_progress_log')
          .insert({
            org_id: effective_org_id,
            job_id: null,
            actor_id: me.id,
            actor_role: me.role,
            action_type: 'user_deleted',
            notes: `${me.full_name} deleted user '${profileToDelete.full_name}' (role: ${profileToDelete.role}).`,
            timestamp: currentTimestamp,
          });
        if (progressLogErrorDelete) console.error("DEBUG: progress log insert failed for user deletion", progressLogErrorDelete.message);

        try {
          await admin.from("audit_logs").insert({
            org_id: effective_org_id,
            actor_id: me.id,
            entity: "profiles",
            entity_id: profile_id,
            action: "delete",
            before: { full_name: profileToDelete.full_name, user_id: profileToDelete.user_id },
            created_at: currentTimestamp,
          });
        } catch (e) {
          console.log("DEBUG: audit insert failed", (e as Error).message);
        }

        resultData = { message: "User deleted successfully." };
        break;

      case "reset_password":
        if (!user_id) throw new Error("User ID is required for password reset.");

        const { data: userToReset, error: fetchUserToResetError } = await admin
          .from("profiles")
          .select("email, full_name") // Assuming email is stored in profiles or can be derived
          .eq("user_id", user_id)
          .eq("org_id", effective_org_id)
          .single();

        if (fetchUserToResetError) throw new Error("Failed to fetch user for password reset: " + fetchUserToResetError.message);
        if (!userToReset || !userToReset.email) throw new Error("User or email not found for password reset.");

        const { error: resetError } = await admin.auth.admin.generateLink({
          type: 'password_reset',
          email: userToReset.email,
        });

        if (resetError) throw new Error("Failed to send password reset email: " + resetError.message);

        // Log password reset to job_progress_log
        const { error: progressLogErrorReset } = await admin
          .from('job_progress_log')
          .insert({
            org_id: effective_org_id,
            job_id: null,
            actor_id: me.id,
            actor_role: me.role,
            action_type: 'password_reset_sent',
            notes: `${me.full_name} sent password reset email to user '${userToReset.full_name}'.`,
            timestamp: currentTimestamp,
          });
        if (progressLogErrorReset) console.error("DEBUG: progress log insert failed for password reset", progressLogErrorReset.message);

        try {
          await admin.from("audit_logs").insert({
            org_id: effective_org_id,
            actor_id: me.id,
            entity: "auth",
            entity_id: user_id,
            action: "reset_password",
            notes: `Password reset email sent to ${userToReset.email}.`,
            created_at: currentTimestamp,
          });
        } catch (e) {
          console.log("DEBUG: audit insert failed", (e as Error).message);
        }

        resultData = { message: "Password reset email sent." };
        break;

      case "purge_demo":
        const { data: demoProfiles, error: fetchDemoError } = await admin
          .from("profiles")
          .select("id, user_id, full_name, role")
          .eq("org_id", effective_org_id)
          .eq("is_demo", true);

        if (fetchDemoError) throw new Error("Failed to fetch demo profiles: " + fetchDemoError.message);

        let removedCount = 0;
        for (const p of demoProfiles) {
          await admin.auth.admin.deleteUser(p.user_id).catch(e => console.warn(`Failed to delete auth user ${p.user_id} during purge: ${e.message}`));
          await admin.from("profiles").delete().eq("id", p.id).catch(e => console.warn(`Failed to delete profile ${p.id} during purge: ${e.message}`));
          removedCount++;
        }

        // Log purge demo users to job_progress_log
        const { error: progressLogErrorPurgeDemo } = await admin
          .from('job_progress_log')
          .insert({
            org_id: effective_org_id,
            job_id: null,
            actor_id: me.id,
            actor_role: me.role,
            action_type: 'purge_demo_users',
            notes: `${me.full_name} purged ${removedCount} demo user(s).`,
            timestamp: currentTimestamp,
          });
        if (progressLogErrorPurgeDemo) console.error("DEBUG: progress log insert failed for purge demo users", progressLogErrorPurgeDemo.message);

        try {
          await admin.from("audit_logs").insert({
            org_id: effective_org_id,
            actor_id: me.id,
            entity: "profiles",
            action: "purge_demo",
            notes: `Purged ${removedCount} demo user(s).`,
            created_at: currentTimestamp,
          });
        } catch (e) {
          console.log("DEBUG: audit insert failed", (e as Error).message);
        }

        resultData = { ok: true, removed: removedCount };
        break;

      case "purge_all_non_admin":
        const { data: nonAdminProfiles, error: fetchNonAdminError } = await admin
          .from("profiles")
          .select("id, user_id, full_name, role")
          .eq("org_id", effective_org_id)
          .neq("role", "admin");

        if (fetchNonAdminError) throw new Error("Failed to fetch non-admin profiles: " + fetchNonAdminError.message);

        let nonAdminRemovedCount = 0;
        for (const p of nonAdminProfiles) {
          await admin.auth.admin.deleteUser(p.user_id).catch(e => console.warn(`Failed to delete auth user ${p.user_id} during purge: ${e.message}`));
          await admin.from("profiles").delete().eq("id", p.id).catch(e => console.warn(`Failed to delete profile ${p.id} during purge: ${e.message}`));
          nonAdminRemovedCount++;
        }

        // Log purge all non-admin users to job_progress_log
        const { error: progressLogErrorPurgeAll } = await admin
          .from('job_progress_log')
          .insert({
            org_id: effective_org_id,
            job_id: null,
            actor_id: me.id,
            actor_role: me.role,
            action_type: 'purge_all_non_admin_users',
            notes: `${me.full_name} purged ${nonAdminRemovedCount} non-admin user(s).`,
            timestamp: currentTimestamp,
          });
        if (progressLogErrorPurgeAll) console.error("DEBUG: progress log insert failed for purge all non-admin users", progressLogErrorPurgeAll.message);

        try {
          await admin.from("audit_logs").insert({
            org_id: effective_org_id,
            actor_id: me.id,
            entity: "profiles",
            action: "purge_all_non_admin",
            notes: `Purged ${nonAdminRemovedCount} non-admin user(s).`,
            created_at: currentTimestamp,
          });
        } catch (e) {
          console.log("DEBUG: audit insert failed", (e as Error).message);
        }

        resultData = { ok: true, removed: nonAdminRemovedCount };
        break;

      default:
        throw new Error("Invalid operation specified.");
    }

    return new Response(
      JSON.stringify(resultData),
      { status, headers: { "Content-Type": "application/json", ...corsHeaders } }, // Include CORS headers here
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