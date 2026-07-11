import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Helper function to verify Svix/Resend webhook signature
async function verifySignature(secret: string, headers: Headers, body: string): Promise<boolean> {
  const svixId = headers.get("svix-id");
  const svixTimestamp = headers.get("svix-timestamp");
  const svixSignature = headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return false;
  }

  try {
    const signedContent = `${svixId}.${svixTimestamp}.${body}`;
    
    // Split signatures
    const signatures = svixSignature.split(" ");
    let verified = false;

    // Secret needs to be decoded from base64 if it's svix format, but Resend secret is prefixed/formatted.
    // Standard svix secrets are whsec_... format. We extract the key part.
    const keyString = secret.startsWith("whsec_") ? secret.substring(6) : secret;
    
    // Convert secret key string to Uint8Array
    const encoder = new TextEncoder();
    const keyData = encoder.encode(keyString);
    
    // Import key for HMAC-SHA256
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    // Sign the content
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      cryptoKey,
      encoder.encode(signedContent)
    );

    // Convert to hex/base64
    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
    const signatureHex = signatureArray.map(b => b.toString(16).padStart(2, "0")).join("");
    const signatureBase64 = btoa(String.fromCharCode.apply(null, signatureArray));

    for (const sig of signatures) {
      const parts = sig.split(",");
      if (parts.length !== 2) continue;
      const [, val] = parts;
      
      // Compare signatures
      if (val === signatureBase64 || val === signatureHex) {
        verified = true;
        break;
      }
    }

    return verified;
  } catch (err) {
    console.error("Signature verification error:", err);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const bodyText = await req.text();
    
    // 1. Fetch the Resend webhook signing secret from system_settings
    const { data: secretData, error: secretErr } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "resend_webhook_signing_secret")
      .maybeSingle();

    if (secretErr) {
      console.error("Failed to fetch webhook secret:", secretErr);
    }

    const webhookSecret = secretData?.value;

    // 2. Verify signature if secret is configured
    if (webhookSecret) {
      const isValid = await verifySignature(webhookSecret, req.headers, bodyText);
      if (!isValid) {
        console.warn("Invalid webhook signature received.");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      console.warn("No webhook signing secret configured. Skipping verification.");
    }

    // 3. Parse and process payload
    const payload = JSON.parse(bodyText);
    console.log(`Received Resend webhook event: ${payload.type}`, payload);

    // Here we can handle specific email events
    // E.g. payload.type === "email.bounced" -> log or notify
    if (payload.type === "email.bounced" || payload.type === "email.complained") {
      console.warn(`Email alert: ${payload.type} for email ID ${payload.data?.email_id}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error processing webhook:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
