import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function sendEmail(apiKey: string, fromEmail: string, to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `TRIP Mobility <${fromEmail}>`,
      to,
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("Resend error:", err);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { name, email, phone, inquiry_type, message } = await req.json();

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load Resend settings from DB
    const { data: settings } = await supabase.from("system_settings").select("key, value");
    const dbApiKey = settings?.find((s: any) => s.key === "resend_api_key")?.value;
    const dbFromEmail = settings?.find((s: any) => s.key === "resend_from_email")?.value;

    const resendApiKey = dbApiKey || Deno.env.get("RESEND_API_KEY") || "";
    const resendFromEmail = dbFromEmail || "noreply@tripmobility.ph";

    // Save to DB
    const { data, error: dbErr } = await supabase
      .from("contact_messages")
      .insert({ name, email, phone: phone || null, inquiry_type: inquiry_type || "General", message })
      .select("id")
      .single();

    if (dbErr) {
      console.error("DB error:", dbErr);
      return new Response(JSON.stringify({ error: "DB: " + dbErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sales notification email
    const salesHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="background:#070707;color:#F5F5F5;font-family:'Helvetica Neue',Arial,sans-serif;margin:0;padding:0;">
        <div style="max-width:600px;margin:0 auto;padding:40px 24px;">
          <div style="background:#111;border:1px solid rgba(57,255,20,0.3);border-radius:16px;padding:24px;margin-bottom:24px;text-align:center;">
            <p style="color:#39FF14;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px;">📬 NEW CONTACT MESSAGE</p>
            <h1 style="color:#FFFFFF;font-size:24px;font-weight:700;margin:0 0 4px;">${name}</h1>
            <p style="color:#9CA3AF;margin:0;font-size:14px;">${inquiry_type} Inquiry</p>
          </div>
          <div style="background:#111;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px;margin-bottom:16px;">
            <h2 style="color:#39FF14;font-size:12px;letter-spacing:3px;text-transform:uppercase;margin:0 0 16px;">Contact Details</h2>
            ${[
              ["Name", name],
              ["Email", `<a href="mailto:${email}" style="color:#39FF14;">${email}</a>`],
              ["Phone", phone || "—"],
              ["Inquiry Type", inquiry_type],
            ].map(([label, value]) => `
              <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                <span style="color:#9CA3AF;font-size:13px;">${label}</span>
                <span style="color:#FFF;font-size:13px;">${value}</span>
              </div>
            `).join("")}
          </div>
          <div style="background:#111;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px;margin-bottom:24px;">
            <h2 style="color:#39FF14;font-size:12px;letter-spacing:3px;text-transform:uppercase;margin:0 0 12px;">Message</h2>
            <p style="color:#D1D5DB;font-size:14px;line-height:1.6;margin:0;font-style:italic;">"${message}"</p>
          </div>
          <p style="color:#374151;font-size:11px;text-align:center;margin-top:16px;">Message ID: ${data?.id} · ${new Date().toLocaleString("en-PH")}</p>
        </div>
      </body>
      </html>
    `;

    // Customer auto-reply
    const customerHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="background:#0A0A0A;color:#F5F5F5;font-family:'Helvetica Neue',Arial,sans-serif;margin:0;padding:0;">
        <div style="max-width:600px;margin:0 auto;padding:40px 24px;">
          <div style="text-align:center;margin-bottom:32px;">
            <div style="display:inline-block;background:rgba(57,255,20,0.1);border:1px solid rgba(57,255,20,0.3);border-radius:12px;padding:12px 20px;margin-bottom:20px;">
              <span style="color:#39FF14;font-size:20px;font-weight:900;letter-spacing:4px;">⚡ TRIP MOBILITY</span>
            </div>
            <h1 style="color:#FFF;font-size:26px;font-weight:700;margin:0 0 8px;">We Got Your Message!</h1>
            <p style="color:#9CA3AF;font-size:15px;margin:0;">Hi ${name}, thanks for reaching out.</p>
          </div>
          <div style="background:#111;border:1px solid rgba(57,255,20,0.15);border-radius:16px;padding:24px;margin-bottom:24px;">
            <p style="color:#D1D5DB;font-size:14px;line-height:1.7;margin:0;">
              Our team has received your <strong style="color:#FFF;">${inquiry_type}</strong> inquiry and will respond 
              within <strong style="color:#39FF14;">24 business hours</strong>. 
              In the meantime, feel free to explore our product lineup or request a personalized quote.
            </p>
          </div>
          <div style="text-align:center;margin-bottom:24px;">
            <a href="https://tripmobility.ph/products" style="display:inline-block;background:#39FF14;color:#0A0A0A;font-weight:700;font-size:13px;padding:12px 28px;border-radius:10px;text-decoration:none;text-transform:uppercase;letter-spacing:1px;">
              Browse Our E-Bikes →
            </a>
          </div>
          <div style="text-align:center;padding-top:24px;border-top:1px solid rgba(255,255,255,0.05);">
            <p style="color:#6B7280;font-size:13px;margin:0 0 6px;">TRIP Mobility — Philippines' Premium E-Bike Company</p>
            <p style="color:#9CA3AF;font-size:13px;margin:0;"><a href="tel:+6328123456" style="color:#39FF14;">+63 2 8123 4567</a> | <a href="mailto:hello@tripmobility.ph" style="color:#39FF14;">hello@tripmobility.ph</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    await Promise.all([
      sendEmail(resendApiKey, resendFromEmail, "sales@tripmobility.ph", `📬 New ${inquiry_type} Inquiry from ${name}`, salesHtml),
      sendEmail(resendApiKey, resendFromEmail, email, "We received your message — TRIP Mobility ⚡", customerHtml),
    ]);

    return new Response(
      JSON.stringify({ success: true, id: data?.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Contact form error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
