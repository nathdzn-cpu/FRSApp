// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.223.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { lat, lon } = await req.json();
    if (lat === undefined || lon === undefined) {
      throw new Error("Latitude and Longitude are required.");
    }

    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
    
    const geoResponse = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'Supabase Function/1.0 (Haulage App)', // Nominatim requires a user agent
      },
    });

    if (!geoResponse.ok) {
      const errorBody = await geoResponse.text();
      console.error("Nominatim API error:", errorBody);
      throw new Error(`Nominatim API failed with status: ${geoResponse.status}`);
    }

    const geoData = await geoResponse.json();
    
    const locationName = geoData.address?.city || geoData.address?.town || geoData.address?.village || "Unknown location";

    return new Response(
      JSON.stringify({ location: locationName }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (e) {
    console.error("Reverse geocode function error:", e);
    // Fallback to "Unknown location" on any error
    return new Response(
      JSON.stringify({ location: "Unknown location" }),
      {
        status: 200, // Return 200 with fallback to avoid breaking the client
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
});