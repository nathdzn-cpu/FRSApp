// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.223.0/http/server.ts";

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Replace with your frontend origin in production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { to, title, body: messageBody, data } = body;

    if (!to || !messageBody) {
      throw new Error("Missing 'to' (Expo push token) or 'body' (message content) in request.");
    }

    const messages = [{
      to,
      title,
      body: messageBody,
      data,
    }];

    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const expoResult = await expoResponse.json();
    console.log("Expo Push API response:", expoResult);

    if (!expoResponse.ok || expoResult.errors) {
      console.error("Error sending push notification via Expo:", expoResult.errors || expoResult);
      throw new Error("Failed to send push notification.");
    }

    return new Response(
      JSON.stringify({ ok: true, details: expoResult }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (e) {
    console.error("DEBUG: send-push-notification function error", e);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
});