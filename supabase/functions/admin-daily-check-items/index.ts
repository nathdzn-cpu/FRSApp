import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { v4 as uuidv4 } from "https://deno.land/std@0.177.0/uuid/mod.ts";

// Mock data structures (should ideally be shared or consistent with client)
interface DailyCheckItem {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

// In a real scenario, this would interact with a database.
// For this mock, we'll use a simple in-memory store.
const mockDailyCheckItems: DailyCheckItem[] = [
  {
    id: "item-1",
    tenant_id: "demo-tenant-id",
    title: "Brakes",
    description: "Check brake fluid, pads, and general function.",
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "item-2",
    tenant_id: "demo-tenant-id",
    title: "Lights",
    description: "Check all exterior lights (headlights, tail lights, indicators, brake lights).",
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "item-3",
    tenant_id: "demo-tenant-id",
    title: "Tires",
    description: "Check tire pressure, tread depth, and for any damage.",
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "item-4",
    tenant_id: "demo-tenant-id",
    title: "Windscreen Wipers",
    description: "Check wiper blades for wear and washer fluid level.",
    is_active: false,
    created_at: new Date().toISOString(),
  },
];

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

  // In a real app, you'd query the 'profiles' table to get the user's role and tenant_id
  // For mock, we'll assume the user is 'auth_user_alice' (admin) and tenant_id is 'demo-tenant-id'
  const tenantId = "demo-tenant-id"; // Hardcoded for mock
  const userRole = "admin"; // Hardcoded for mock admin function

  if (userRole !== "admin") {
    return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), {
      headers: { "Content-Type": "application/json" },
      status: 403,
    });
  }

  const { method } = req;
  const url = new URL(req.url);
  const pathSegments = url.pathname.split("/").filter(Boolean); // e.g., ["admin-daily-check-items", "item-id"]

  try {
    switch (method) {
      case "GET": {
        // List all items for the tenant
        return new Response(JSON.stringify(mockDailyCheckItems.filter(item => item.tenant_id === tenantId)), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        });
      }
      case "POST": {
        const { title, description, is_active } = await req.json();
        if (!title) {
          return new Response(JSON.stringify({ error: "Title is required" }), {
            headers: { "Content-Type": "application/json" },
            status: 400,
          });
        }
        const newItem: DailyCheckItem = {
          id: uuidv4(),
          tenant_id: tenantId,
          title,
          description,
          is_active: is_active ?? true,
          created_at: new Date().toISOString(),
        };
        mockDailyCheckItems.push(newItem);
        return new Response(JSON.stringify(newItem), {
          headers: { "Content-Type": "application/json" },
          status: 201,
        });
      }
      case "PUT": {
        const itemId = pathSegments[1];
        if (!itemId) {
          return new Response(JSON.stringify({ error: "Item ID is required for update" }), {
            headers: { "Content-Type": "application/json" },
            status: 400,
          });
        }
        const updates = await req.json();
        const itemIndex = mockDailyCheckItems.findIndex(item => item.id === itemId && item.tenant_id === tenantId);
        if (itemIndex === -1) {
          return new Response(JSON.stringify({ error: "Item not found" }), {
            headers: { "Content-Type": "application/json" },
            status: 404,
          });
        }
        mockDailyCheckItems[itemIndex] = { ...mockDailyCheckItems[itemIndex], ...updates, created_at: new Date().toISOString() };
        return new Response(JSON.stringify(mockDailyCheckItems[itemIndex]), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        });
      }
      case "DELETE": {
        const itemId = pathSegments[1];
        if (!itemId) {
          return new Response(JSON.stringify({ error: "Item ID is required for delete" }), {
            headers: { "Content-Type": "application/json" },
            status: 400,
          });
        }
        const initialLength = mockDailyCheckItems.length;
        const updatedItems = mockDailyCheckItems.filter(item => !(item.id === itemId && item.tenant_id === tenantId));
        mockDailyCheckItems.splice(0, mockDailyCheckItems.length, ...updatedItems); // Update in-memory array
        if (mockDailyCheckItems.length === initialLength) {
          return new Response(JSON.stringify({ error: "Item not found" }), {
            headers: { "Content-Type": "application/json" },
            status: 404,
          });
        }
        return new Response(null, { status: 204 });
      }
      default:
        return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
          headers: { "Content-Type": "application/json" },
          status: 405,
        });
    }
  } catch (error) {
    console.error("Error in admin-daily-check-items:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});