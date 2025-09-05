// supabase/functions/driver-daily-check-submit/index.ts
import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
serve(() => new Response(JSON.stringify({ ok:false, error: "driver-daily-check-submit not configured" }), { status: 404, headers: { "Content-Type": "application/json" }}));