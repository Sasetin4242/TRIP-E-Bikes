import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function calcScore(body: Record<string, unknown>): number {
  let score = 40;
  const qty = Number(body.quantity) || 1;
  if (qty >= 50) score += 35;
  else if (qty >= 10) score += 25;
  else if (qty >= 5) score += 15;
  else if (qty >= 2) score += 5;
  const budget = String(body.budget || "");
  if (budget.includes("₱3,000,000")) score += 25;
  else if (budget.includes("₱1,000,000")) score += 20;
  else if (budget.includes("₱500,000")) score += 15;
  else if (budget.includes("₱300,000")) score += 10;
  else if (budget.includes("₱100,000")) score += 5;
  const use = String(body.use_type || "");
  if (use === "fleet") score += 15;
  else if (use === "business") score += 8;
  if (body.company) score += 5;
  return Math.min(score, 100);
}

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
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { name, email, mobile, company, use_type, product_interest, quantity, budget, contact_method, notes, customer_id } = body;

    if (!name || !email || !mobile || !product_interest) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const score = calcScore(body);

    // Insert lead into DB
    const { data: lead, error: leadErr } = await supabase.from("leads").insert({
      name,
      email,
      mobile,
      company: company || null,
      use_type: use_type || "personal",
      product_interest,
      quantity: Number(quantity) || 1,
      budget: budget || null,
      contact_method: contact_method || "email",
      notes: notes || null,
      status: "new",
      score,
      source: "website",
      customer_id: customer_id || null,
    }).select("id").single();

    if (leadErr) {
      console.error("Lead insert error:", leadErr);
      return new Response(JSON.stringify({ error: "DB insert: " + leadErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Customer confirmation email
    const customerHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>TRIP Mobility Quote Confirmed</title></head>
      <body style="background:#0A0A0A;color:#F5F5F5;font-family:'Helvetica Neue',Arial,sans-serif;margin:0;padding:0;">
        <div style="max-width:600px;margin:0 auto;padding:40px 24px;">
          <div style="text-align:center;margin-bottom:32px;">
            <div style="display:inline-block;background:rgba(57,255,20,0.1);border:1px solid rgba(57,255,20,0.3);border-radius:12px;padding:16px 24px;margin-bottom:24px;">
              <span style="color:#39FF14;font-size:24px;font-weight:900;letter-spacing:4px;">⚡ TRIP MOBILITY</span>
            </div>
            <h1 style="color:#FFFFFF;font-size:28px;font-weight:700;margin:0 0 8px;">Quote Request Confirmed!</h1>
            <p style="color:#9CA3AF;font-size:16px;margin:0;">Thank you, ${name}. Our team is on it.</p>
          </div>

          <div style="background:#111111;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px;margin-bottom:24px;">
            <h2 style="color:#39FF14;font-size:14px;letter-spacing:3px;text-transform:uppercase;margin:0 0 16px;">Your Quote Summary</h2>
            ${[
              ["Model", product_interest],
              ["Quantity", `${quantity} unit${quantity > 1 ? "s" : ""}`],
              ["Use Type", use_type],
              ["Budget Range", budget || "To be discussed"],
              ["Preferred Contact", contact_method],
            ].map(([label, value]) => `
              <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                <span style="color:#9CA3AF;font-size:14px;">${label}</span>
                <span style="color:#FFFFFF;font-size:14px;font-weight:600;">${value}</span>
              </div>
            `).join("")}
          </div>

          <div style="background:rgba(57,255,20,0.05);border:1px solid rgba(57,255,20,0.2);border-radius:16px;padding:24px;margin-bottom:24px;">
            <h2 style="color:#39FF14;font-size:14px;letter-spacing:3px;text-transform:uppercase;margin:0 0 16px;">What Happens Next</h2>
            <div style="display:flex;gap:12px;margin-bottom:12px;align-items:flex-start;">
              <span style="color:#39FF14;font-size:18px;">📞</span>
              <div><strong style="color:#FFFFFF;">Within 2 hours</strong><br><span style="color:#9CA3AF;font-size:14px;">A TRIP e-mobility specialist reviews your quote</span></div>
            </div>
            <div style="display:flex;gap:12px;margin-bottom:12px;align-items:flex-start;">
              <span style="color:#39FF14;font-size:18px;">📋</span>
              <div><strong style="color:#FFFFFF;">Within 24 hours</strong><br><span style="color:#9CA3AF;font-size:14px;">You receive a personalized proposal with pricing</span></div>
            </div>
            <div style="display:flex;gap:12px;align-items:flex-start;">
              <span style="color:#39FF14;font-size:18px;">🚀</span>
              <div><strong style="color:#FFFFFF;">Your dashboard</strong><br><span style="color:#9CA3AF;font-size:14px;">Track your quote status anytime at tripmobility.ph/my-quotes</span></div>
            </div>
          </div>

          <div style="background:#111111;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px;margin-bottom:24px;">
            <h2 style="color:#39FF14;font-size:14px;letter-spacing:3px;text-transform:uppercase;margin:0 0 16px;">Product Resources</h2>
            <p style="color:#9CA3AF;font-size:14px;margin:0 0 16px;">Download our product brochures and financing guide while you wait:</p>
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${["TRIP Cargo Pro Brochure", "TRIP Fold X Brochure", "TRIP Ranger 750 Brochure", "Financing & Payment Guide"].map(b => `
                <a href="https://gotrip.ph" style="display:flex;align-items:center;gap:8px;background:rgba(57,255,20,0.05);border:1px solid rgba(57,255,20,0.2);border-radius:8px;padding:10px 14px;color:#39FF14;font-size:13px;text-decoration:none;">
                  📄 ${b}
                </a>
              `).join("")}
            </div>
          </div>

          <div style="text-align:center;padding-top:24px;border-top:1px solid rgba(255,255,255,0.05);">
            <p style="color:#6B7280;font-size:13px;margin:0 0 8px;">Need immediate assistance?</p>
            <p style="color:#9CA3AF;font-size:14px;margin:0;"><a href="tel:+6328123 4567" style="color:#39FF14;">+63 2 8123 4567</a> | <a href="mailto:sales@tripmobility.ph" style="color:#39FF14;">sales@tripmobility.ph</a></p>
            <p style="color:#374151;font-size:12px;margin-top:24px;">© 2026 TRIP Mobility. Philippines' Premium E-Bike Company.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Sales team notification email
    const salesHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>New Lead Alert — TRIP Mobility CRM</title></head>
      <body style="background:#070707;color:#F5F5F5;font-family:'Helvetica Neue',Arial,sans-serif;margin:0;padding:0;">
        <div style="max-width:600px;margin:0 auto;padding:40px 24px;">
          <div style="background:${score >= 80 ? "rgba(57,255,20,0.1)" : "rgba(255,255,255,0.03)"};border:1px solid ${score >= 80 ? "rgba(57,255,20,0.4)" : "rgba(255,255,255,0.1)"};border-radius:16px;padding:24px;margin-bottom:24px;text-align:center;">
            <p style="color:#39FF14;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px;">🚨 NEW LEAD ALERT</p>
            <h1 style="color:#FFFFFF;font-size:26px;font-weight:700;margin:0 0 8px;">${name}</h1>
            ${company ? `<p style="color:#9CA3AF;margin:0;font-size:15px;">${company}</p>` : ""}
            <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(57,255,20,0.1);border:2px solid #39FF14;border-radius:50px;padding:8px 20px;margin-top:16px;">
              <span style="color:#39FF14;font-size:24px;font-weight:900;">${score}</span>
              <span style="color:#6B7280;font-size:13px;">Lead Score${score >= 80 ? " 🔥 HIGH PRIORITY" : ""}</span>
            </div>
          </div>

          <div style="background:#111111;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px;margin-bottom:24px;">
            <h2 style="color:#39FF14;font-size:13px;letter-spacing:3px;text-transform:uppercase;margin:0 0 16px;">Contact Information</h2>
            ${[
              ["Email", `<a href="mailto:${email}" style="color:#39FF14;">${email}</a>`],
              ["Mobile", `<a href="tel:${mobile}" style="color:#39FF14;">${mobile}</a>`],
              ["Company", company || "—"],
            ].map(([label, value]) => `
              <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                <span style="color:#9CA3AF;font-size:14px;">${label}</span>
                <span style="color:#FFFFFF;font-size:14px;">${value}</span>
              </div>
            `).join("")}
          </div>

          <div style="background:#111111;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px;margin-bottom:24px;">
            <h2 style="color:#39FF14;font-size:13px;letter-spacing:3px;text-transform:uppercase;margin:0 0 16px;">Quote Details</h2>
            ${[
              ["Product", product_interest],
              ["Quantity", `${quantity} unit${quantity > 1 ? "s" : ""}`],
              ["Use Type", use_type],
              ["Budget", budget || "—"],
              ["Contact Via", contact_method],
            ].map(([label, value]) => `
              <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                <span style="color:#9CA3AF;font-size:14px;">${label}</span>
                <span style="color:#FFFFFF;font-size:14px;font-weight:600;">${value}</span>
              </div>
            `).join("")}
            ${notes ? `
              <div style="padding:12px 0;">
                <p style="color:#9CA3AF;font-size:13px;margin:0 0 6px;">Customer Notes:</p>
                <p style="color:#FFFFFF;font-size:14px;margin:0;font-style:italic;">"${notes}"</p>
              </div>
            ` : ""}
          </div>

          <div style="text-align:center;">
            <a href="https://tripmobility.ph/admin/leads" style="display:inline-block;background:#39FF14;color:#0A0A0A;font-weight:700;font-size:14px;padding:14px 32px;border-radius:10px;text-decoration:none;letter-spacing:1px;text-transform:uppercase;">
              View in CRM Dashboard →
            </a>
          </div>
          <p style="color:#374151;font-size:12px;text-align:center;margin-top:24px;">Lead ID: ${lead?.id || "N/A"} · Submitted at ${new Date().toLocaleString("en-PH")}</p>
        </div>
      </body>
      </html>
    `;

    // Send both emails
    await Promise.all([
      sendEmail(email, "Your TRIP Mobility Quote Request is Confirmed ⚡", customerHtml),
      sendEmail("sales@tripmobility.ph", `${score >= 80 ? "🔥 HIGH PRIORITY" : "📋 New"} Lead: ${name} — ${product_interest} (${quantity} unit${quantity > 1 ? "s" : ""})`, salesHtml),
    ]);

    return new Response(
      JSON.stringify({ success: true, score, lead_id: lead?.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Submit quote error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
