// supabase/functions/admin-daily-check-items/index.ts
import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
serve(() => new Response(JSON.stringify({ ok:false, error: "admin-daily-check-items not configured" }), { status: 404, headers: { "Content-Type": "application/json" }}));