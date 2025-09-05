import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { v4 as uuidv4 } from "https://deno.land/std@0.177.0/uuid/mod.ts";

// Mock data structures (should ideally be shared or consistent with client)
interface DailyCheckResponse {
  id: string;
  tenant_id: string;
  driver_id: string;
  truck_reg: string;
  trailer_no?: string;
  started_at: string;
  finished_at: string;
  duration_seconds: number;
  signature?: string;
  items: Array<{ item_id: string; ok: boolean; notes?: string; photo_url?: string }>;
  created_at: string;
}

interface Profile {
  id: string;
  tenant_id: string;
  full_name: string;
  dob?: string;
  phone?: string;
  role: 'driver' | 'office' | 'admin';
  user_id: string; // Corresponds to auth.users.id
  truck_reg?: string;
  trailer_no?: string;
  created_at: string;
  last_location?: { lat: number; lon: number; timestamp: string };
  last_job_status?: string;
  is_demo: boolean;
}

// In-memory mock for daily check responses and profiles
const mockDailyCheckResponses: DailyCheckResponse[] = [];
const mockProfiles: Profile[] = [
  {
    id: "driver-dave-id",
    tenant_id: "demo-tenant-id",
    full_name: "Dave Driver",
    role: "driver",
    user_id: "auth_user_dave",
    truck_reg: "DA66 VED",
    trailer_no: "TRL-007",
    created_at: new Date().toISOString(),
    is_demo: true,
  },
  {
    id: "auth_user_alice",
    tenant_id: "demo-tenant-id",
    full_name: "Alice Admin",
    role: "admin",
    user_id: "auth_user_alice",
    created_at: new Date().toISOString(),
    is_demo: true,
  },
]; // Simplified, should be loaded from a more central mock

serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    },
  );

  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      headers: { "Content-Type": "application/json" },
      status: 401,
    });
  }

  // Simulate fetching driver profile
  const driverProfile = mockProfiles.find(p => p.user_id === user.id && p.role === 'driver');
  if (!driverProfile) {
    return new Response(JSON.stringify({ error: "Forbidden: Driver profile not found or not a driver" }), {
      headers: { "Content-Type": "application/json" },
      status: 403,
    });
  }

  const tenantId = driverProfile.tenant_id;
  const driverId = driverProfile.id;

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      headers: { "Content-Type": "application/json" },
      status: 405,
    });
  }

  try {
    const { truck_reg, trailer_no, started_at, finished_at, signature, items } = await req.json();

    if (!truck_reg || !started_at || !finished_at || !items) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }

    const durationSeconds = Math.floor((new Date(finished_at).getTime() - new Date(started_at).getTime()) / 1000);

    const uploadedItems = [];
    for (const item of items) {
      if (item.photo_base64) {
        // Simulate photo upload to Supabase Storage
        const photoId = uuidv4();
        const filePath = `${driverId}/${photoId}.jpeg`; // Store under driver's ID
        // In a real scenario, you'd decode base64 and upload:
        // const { data, error } = await supabaseClient.storage.from('daily-checks').upload(filePath, decode(item.photo_base64), {
        //   contentType: 'image/jpeg',
        //   upsert: false,
        // });
        // if (error) throw error;
        // const { data: publicUrlData } = supabaseClient.storage.from('daily-checks').getPublicUrl(filePath);
        // item.photo_url = publicUrlData.publicUrl;
        console.log(`Simulating photo upload for item ${item.item_id} to daily-checks/${filePath}`);
        item.photo_url = `https://mock-storage.supabase.co/daily-checks/${filePath}`; // Mock URL
        delete item.photo_base64; // Remove base64 from final item object
      }
      uploadedItems.push(item);
    }

    const newResponse: DailyCheckResponse = {
      id: uuidv4(),
      tenant_id: tenantId,
      driver_id: driverId,
      truck_reg,
      trailer_no,
      started_at,
      finished_at,
      duration_seconds,
      signature,
      items: uploadedItems,
      created_at: new Date().toISOString(),
    };

    mockDailyCheckResponses.push(newResponse); // Store in mock

    // Simulate updating driver profile with current truck/trailer
    const driverProfileIndex = mockProfiles.findIndex(p => p.id === driverId);
    if (driverProfileIndex !== -1) {
      mockProfiles[driverProfileIndex].truck_reg = truck_reg;
      mockProfiles[driverProfileIndex].trailer_no = trailer_no;
      console.log(`Driver profile updated: ${driverProfile.full_name}, Truck: ${truck_reg}, Trailer: ${trailer_no}`);
    }

    // In a real app, you'd insert into the 'daily_check_responses' table:
    // const { data, error } = await supabaseClient.from('daily_check_responses').insert([newResponse]).select().single();
    // if (error) throw error;

    return new Response(JSON.stringify(newResponse), {
      headers: { "Content-Type": "application/json" },
      status: 201,
    });
  } catch (error) {
    console.error("Error in driver-daily-check-submit:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});