import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function sendEmail(apiKey: string, fromEmail: string, to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `TRIP Mobility Service <${fromEmail}>`,
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

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string; headline: string; message: string }> = {
  confirmed: {
    label: "Confirmed",
    color: "#60A5FA",
    icon: "✅",
    headline: "Your Appointment is Confirmed!",
    message: "Great news! We've confirmed your service appointment. Our team is ready to provide you with the best e-bike care.",
  },
  "in-progress": {
    label: "In Progress",
    color: "#FB923C",
    icon: "🔧",
    headline: "Your Bike is Being Serviced",
    message: "Your e-bike service is currently underway. Our certified technician is working to get your ride back in top condition.",
  },
  completed: {
    label: "Completed",
    color: "#39FF14",
    icon: "🎉",
    headline: "Service Complete — Your Bike is Ready!",
    message: "Your e-bike service has been completed. Thank you for choosing TRIP Mobility for your maintenance needs!",
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { appointment_id, new_status } = await req.json();

    if (!appointment_id || !new_status) {
      return new Response(JSON.stringify({ error: "Missing appointment_id or new_status" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const statusCfg = STATUS_CONFIG[new_status];
    if (!statusCfg) {
      return new Response(JSON.stringify({ skipped: true, reason: "Status does not trigger notification" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load Resend settings from DB
    const { data: settings } = await supabaseAdmin.from("system_settings").select("key, value");
    const dbApiKey = settings?.find((s: any) => s.key === "resend_api_key")?.value;
    const dbFromEmail = settings?.find((s: any) => s.key === "resend_from_email")?.value;

    const resendApiKey = dbApiKey || Deno.env.get("RESEND_API_KEY") || "";
    const resendFromEmail = dbFromEmail || "noreply@tripmobility.ph";

    // Fetch appointment
    const { data: apt, error: aptErr } = await supabaseAdmin
      .from("service_appointments")
      .select("*")
      .eq("id", appointment_id)
      .single();

    if (aptErr || !apt) {
      return new Response(JSON.stringify({ error: "Appointment not found: " + (aptErr?.message || "") }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const formatDate = (d: string) =>
      new Date(d + "T00:00:00").toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    const partsTotal = (apt.parts_used || []).reduce((s: number, p: any) => s + (p.qty || 1) * (p.cost || 0), 0);

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="background:#0A0A0A;color:#F5F5F5;font-family:'Helvetica Neue',Arial,sans-serif;margin:0;padding:0;">
  <div style="max-width:600px;margin:0 auto;padding:40px 24px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;background:rgba(57,255,20,0.08);border:1px solid rgba(57,255,20,0.25);border-radius:12px;padding:10px 20px;margin-bottom:20px;">
        <span style="color:#39FF14;font-size:18px;font-weight:900;letter-spacing:4px;">⚡ TRIP MOBILITY</span>
      </div>
      <p style="color:#6B7280;font-size:12px;margin:0;">Service Center Notification</p>
    </div>

    <!-- Status Banner -->
    <div style="background:#111;border:1px solid ${statusCfg.color}30;border-left:4px solid ${statusCfg.color};border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
      <div style="font-size:48px;margin-bottom:12px;">${statusCfg.icon}</div>
      <h1 style="color:#FFF;font-size:22px;font-weight:700;margin:0 0 8px;">${statusCfg.headline}</h1>
      <p style="color:#9CA3AF;font-size:14px;margin:0;line-height:1.6;">${statusCfg.message}</p>
    </div>

    <!-- Appointment Details -->
    <div style="background:#111;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px;margin-bottom:20px;">
      <h2 style="color:#39FF14;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 16px;font-weight:700;">Appointment Details</h2>
      ${[
        ["Customer", apt.name],
        ["Service Type", apt.service_type],
        ["Service Center", apt.service_center],
        ["Date", formatDate(apt.preferred_date)],
        ["Time", apt.preferred_time],
        ...(apt.bike_model ? [["Bike Model", apt.bike_model]] : []),
        ...(apt.technician ? [["Assigned Technician", apt.technician]] : []),
        ["Status", `<span style="color:${statusCfg.color};font-weight:700;">${statusCfg.label}</span>`],
      ].map(([label, value]) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
          <span style="color:#9CA3AF;font-size:13px;">${label}</span>
          <span style="color:#FFF;font-size:13px;">${value}</span>
        </div>
      `).join("")}

      ${apt.estimated_cost ? `
        <div style="margin-top:16px;padding:16px;background:rgba(57,255,20,0.06);border:1px solid rgba(57,255,20,0.2);border-radius:10px;text-align:center;">
          <p style="color:#9CA3AF;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 6px;">Estimated Service Cost</p>
          <p style="color:#39FF14;font-size:28px;font-weight:900;margin:0;font-family:monospace;">₱${Number(apt.estimated_cost).toLocaleString()}</p>
          ${partsTotal > 0 ? `<p style="color:#6B7280;font-size:12px;margin:6px 0 0;">Includes ₱${partsTotal.toLocaleString()} in parts</p>` : ""}
        </div>
      ` : ""}
    </div>

    ${apt.notes ? `
    <!-- Technician Notes -->
    <div style="background:#111;border:1px solid rgba(57,255,20,0.15);border-radius:16px;padding:20px 24px;margin-bottom:20px;">
      <h2 style="color:#39FF14;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 12px;font-weight:700;">Service Notes</h2>
      <p style="color:#D1D5DB;font-size:14px;line-height:1.7;margin:0;font-style:italic;">"${apt.notes}"</p>
    </div>
    ` : ""}

    ${new_status === "completed" ? `
    <!-- Review Request -->
    <div style="background:#111;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px 24px;margin-bottom:20px;text-align:center;">
      <p style="color:#FFF;font-size:15px;font-weight:600;margin:0 0 8px;">How was your service experience?</p>
      <p style="color:#9CA3AF;font-size:13px;margin:0 0 16px;">Your feedback helps us improve and helps other TRIP riders make better decisions.</p>
      <a href="https://tripmobility.ph/products" style="display:inline-block;background:rgba(57,255,20,0.1);color:#39FF14;border:1px solid rgba(57,255,20,0.3);font-weight:600;font-size:13px;padding:12px 28px;border-radius:10px;text-decoration:none;">
        ⭐ Leave a Review
      </a>
    </div>
    ` : ""}

    <!-- CTA -->
    <div style="text-align:center;margin:28px 0;">
      <a href="https://tripmobility.ph/service" style="display:inline-block;background:#39FF14;color:#0A0A0A;font-weight:700;font-size:13px;padding:14px 32px;border-radius:12px;text-decoration:none;text-transform:uppercase;letter-spacing:1px;">
        View Service Centers →
      </a>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding-top:24px;border-top:1px solid rgba(255,255,255,0.05);">
      <p style="color:#6B7280;font-size:12px;margin:0 0 6px;">TRIP Mobility Service Division</p>
      <p style="color:#9CA3AF;font-size:13px;margin:0;">
        <a href="tel:+6328123456" style="color:#39FF14;">+63 2 8123 4567</a> |
        <a href="mailto:service@tripmobility.ph" style="color:#39FF14;">service@tripmobility.ph</a>
      </p>
      <p style="color:#374151;font-size:11px;margin:12px 0 0;">Appointment ID: ${appointment_id}</p>
    </div>
  </div>
</body>
</html>`;

    const subjectMap: Record<string, string> = {
      confirmed: `✅ Appointment Confirmed — ${apt.service_type} at ${apt.service_center}`,
      "in-progress": `🔧 Your TRIP Bike Service Has Started`,
      completed: `🎉 Service Complete — Your E-Bike is Ready for Pickup!`,
    };

    await sendEmail(resendApiKey, resendFromEmail, apt.email, subjectMap[new_status] || "Service Appointment Update", html);
    console.log(`Appointment notification sent to ${apt.email} for status: ${new_status}`);

    return new Response(
      JSON.stringify({ success: true, sent_to: apt.email, status: new_status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("notify-appointment-status error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
