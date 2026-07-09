import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "TRIP Mobility <noreply@tripmobility.ph>",
      to,
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("Resend error:", err);
    throw new Error("Resend API failed: " + err);
  }
  return await res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { messageId, recipientEmail, subject, html, token: bodyToken } = body;

    // 1. Get and verify the Authorization Token
    let token = bodyToken;
    const authHeader = req.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Missing authorization token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify token with Supabase Auth
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Validate input fields
    if (!messageId || !recipientEmail || !subject || !html) {
      return new Response(
        JSON.stringify({ error: "Missing required fields (messageId, recipientEmail, subject, html)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Fetch the current contact message to check if it exists and get reply count
    const { data: message, error: fetchError } = await supabaseAdmin
      .from("contact_messages")
      .select("id, reply_count")
      .eq("id", messageId)
      .single();

    if (fetchError || !message) {
      return new Response(
        JSON.stringify({ error: "Contact message not found: " + (fetchError?.message || "unknown") }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Send email via Resend
    const emailResult = await sendEmail(recipientEmail, subject, html);

    // 5. Update DB record on success
    const currentReplyCount = message.reply_count || 0;
    const { data: updatedMessage, error: updateError } = await supabaseAdmin
      .from("contact_messages")
      .update({
        reply_count: currentReplyCount + 1,
        last_replied_at: new Date().toISOString(),
        status: "replied",
      })
      .eq("id", messageId)
      .select()
      .single();

    if (updateError) {
      console.error("DB update error after sending email:", updateError);
      return new Response(
        JSON.stringify({
          success: true,
          emailResult,
          warning: "Email sent, but failed to update contact message status: " + updateError.message,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailResult,
        updatedMessage,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-contact-reply error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
