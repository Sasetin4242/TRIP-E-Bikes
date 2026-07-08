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
    throw new Error("Resend: " + err);
  }
  return await res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { quotation_id, new_status } = await req.json();

    if (!quotation_id) {
      return new Response(JSON.stringify({ error: "Missing quotation_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch quotation details
    const { data: quotation, error: qErr } = await supabaseAdmin
      .from("quotations")
      .select("*, customer_id")
      .eq("id", quotation_id)
      .single();

    if (qErr || !quotation) {
      return new Response(JSON.stringify({ error: "Quotation not found: " + (qErr?.message || "") }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch customer email from user_profiles
    const { data: profile, error: pErr } = await supabaseAdmin
      .from("user_profiles")
      .select("email, username")
      .eq("id", quotation.customer_id)
      .single();

    if (pErr || !profile) {
      return new Response(JSON.stringify({ error: "Customer not found: " + (pErr?.message || "") }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerEmail = profile.email;
    const customerName = profile.username || customerEmail.split("@")[0];
    const status = new_status || quotation.status;

    // Status-specific messaging
    const STATUS_LABELS: Record<string, string> = {
      reviewing: "Under Review",
      proposal_sent: "Proposal Ready",
      approved: "Approved",
      rejected: "Update on Your Request",
    };

    const STATUS_COLORS: Record<string, string> = {
      reviewing: "#60A5FA",
      proposal_sent: "#A78BFA",
      approved: "#39FF14",
      rejected: "#F87171",
    };

    const statusLabel = STATUS_LABELS[status] || "Status Update";
    const statusColor = STATUS_COLORS[status] || "#39FF14";

    const validUntilFormatted = quotation.valid_until
      ? new Date(quotation.valid_until).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
      : null;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="background:#0A0A0A;color:#F5F5F5;font-family:'Helvetica Neue',Arial,sans-serif;margin:0;padding:0;">
  <div style="max-width:600px;margin:0 auto;padding:40px 24px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;background:rgba(57,255,20,0.08);border:1px solid rgba(57,255,20,0.25);border-radius:12px;padding:10px 20px;margin-bottom:20px;">
        <span style="color:#39FF14;font-size:18px;font-weight:900;letter-spacing:4px;">⚡ TRIP MOBILITY</span>
      </div>
    </div>

    <!-- Status Banner -->
    <div style="background:#111;border:1px solid ${statusColor}30;border-left:4px solid ${statusColor};border-radius:12px;padding:20px 24px;margin-bottom:24px;text-align:center;">
      <p style="color:${statusColor};font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 6px;font-weight:700;">Quotation Update</p>
      <h1 style="color:#FFF;font-size:22px;font-weight:700;margin:0 0 4px;">Your Quote is ${statusLabel}</h1>
      <p style="color:#9CA3AF;font-size:13px;margin:0;">Hi ${customerName}, here's your latest quotation status.</p>
    </div>

    <!-- Quotation Summary -->
    <div style="background:#111;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px;margin-bottom:20px;">
      <h2 style="color:#39FF14;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 16px;font-weight:700;">Quotation Details</h2>
      ${[
        ["Product", quotation.product_name],
        ["Quantity", `${quotation.quantity} unit${quotation.quantity > 1 ? "s" : ""}`],
        ["Use Type", quotation.use_type],
        ["Status", `<span style="color:${statusColor};font-weight:700;">${statusLabel}</span>`],
      ].map(([label, value]) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
          <span style="color:#9CA3AF;font-size:13px;">${label}</span>
          <span style="color:#FFF;font-size:13px;">${value}</span>
        </div>
      `).join("")}

      ${quotation.estimated_price ? `
        <div style="margin-top:16px;padding:16px;background:rgba(57,255,20,0.06);border:1px solid rgba(57,255,20,0.2);border-radius:10px;text-align:center;">
          <p style="color:#9CA3AF;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 6px;">Your Estimated Price</p>
          <p style="color:#39FF14;font-size:32px;font-weight:900;margin:0;font-family:monospace;">₱${Number(quotation.estimated_price).toLocaleString()}</p>
          ${validUntilFormatted ? `<p style="color:#6B7280;font-size:12px;margin:8px 0 0;">Quote valid until ${validUntilFormatted}</p>` : ""}
        </div>
      ` : ""}
    </div>

    ${quotation.sales_notes ? `
    <!-- Sales Notes -->
    <div style="background:#111;border:1px solid rgba(57,255,20,0.15);border-radius:16px;padding:20px 24px;margin-bottom:20px;">
      <h2 style="color:#39FF14;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 12px;font-weight:700;">Message from Our Sales Team</h2>
      <p style="color:#D1D5DB;font-size:14px;line-height:1.7;margin:0;font-style:italic;">"${quotation.sales_notes}"</p>
      ${quotation.assigned_sales ? `<p style="color:#6B7280;font-size:12px;margin:10px 0 0;">— ${quotation.assigned_sales}, TRIP Mobility Sales</p>` : ""}
    </div>
    ` : ""}

    <!-- CTA -->
    <div style="text-align:center;margin:28px 0;">
      <a href="https://tripmobility.ph/my-quotes" style="display:inline-block;background:#39FF14;color:#0A0A0A;font-weight:700;font-size:13px;padding:14px 32px;border-radius:12px;text-decoration:none;text-transform:uppercase;letter-spacing:1px;">
        View Full Quotation →
      </a>
      <p style="color:#6B7280;font-size:12px;margin:12px 0 0;">Log in to your TRIP account to review details and accept your proposal.</p>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding-top:24px;border-top:1px solid rgba(255,255,255,0.05);">
      <p style="color:#6B7280;font-size:12px;margin:0 0 6px;">TRIP Mobility — Philippines' Premium E-Bike Company</p>
      <p style="color:#9CA3AF;font-size:13px;margin:0;">
        <a href="tel:+6328123456" style="color:#39FF14;">+63 2 8123 4567</a> |
        <a href="mailto:sales@tripmobility.ph" style="color:#39FF14;">sales@tripmobility.ph</a>
      </p>
      <p style="color:#374151;font-size:11px;margin:12px 0 0;">Quote ID: ${quotation_id}</p>
    </div>
  </div>
</body>
</html>`;

    const subjectMap: Record<string, string> = {
      reviewing: `⚙️ We're Reviewing Your Quote — ${quotation.product_name}`,
      proposal_sent: `✅ Your TRIP E-Bike Proposal is Ready — ${quotation.product_name}`,
      approved: `🎉 Your Quotation is Approved — TRIP Mobility`,
      rejected: `📋 Update on Your Quotation — TRIP Mobility`,
    };

    const subject = subjectMap[status] || `📋 Quotation Update — ${quotation.product_name}`;

    await sendEmail(customerEmail, subject, html);

    console.log(`Quotation notification sent to ${customerEmail} for status: ${status}`);

    return new Response(
      JSON.stringify({ success: true, sent_to: customerEmail, status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("notify-quotation-update error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
