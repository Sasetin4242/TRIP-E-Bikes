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

// Award 200 points per ₱10,000 of estimated price (minimum 100 points)
function calculatePoints(estimatedPrice: number | null): number {
  if (!estimatedPrice || estimatedPrice <= 0) return 100; // Base points for approval
  return Math.max(100, Math.floor((estimatedPrice / 10000) * 200));
}

const TIER_CONFIG = [
  { name: "Bronze",   min: 0,     max: 999,      icon: "🥉" },
  { name: "Silver",   min: 1000,  max: 4999,     icon: "🥈" },
  { name: "Gold",     min: 5000,  max: 14999,    icon: "🥇" },
  { name: "Platinum", min: 15000, max: Infinity, icon: "💎" },
];
function getTier(pts: number) {
  return TIER_CONFIG.find(t => pts >= t.min && pts <= t.max) || TIER_CONFIG[0];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { quotation_id } = await req.json();

    if (!quotation_id) {
      return new Response(JSON.stringify({ error: "Missing quotation_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check loyalty program is enabled
    const { data: setting } = await supabaseAdmin
      .from("system_settings")
      .select("value")
      .eq("key", "loyalty_program_enabled")
      .single();

    if (!setting || setting.value === false || setting.value === "false") {
      return new Response(JSON.stringify({ skipped: true, reason: "Loyalty program disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch quotation
    const { data: quotation, error: qErr } = await supabaseAdmin
      .from("quotations")
      .select("*")
      .eq("id", quotation_id)
      .single();

    if (qErr || !quotation) {
      return new Response(JSON.stringify({ error: "Quotation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check quotation status is approved
    if (quotation.status !== "approved") {
      return new Response(JSON.stringify({ skipped: true, reason: "Quotation not approved" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if points already awarded for this quotation
    const { data: existing } = await supabaseAdmin
      .from("loyalty_points")
      .select("id")
      .eq("quotation_id", quotation_id)
      .eq("action_type", "earned")
      .single();

    if (existing) {
      return new Response(JSON.stringify({ skipped: true, reason: "Points already awarded for this quotation" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch customer profile
    const { data: profile, error: pErr } = await supabaseAdmin
      .from("user_profiles")
      .select("email, username")
      .eq("id", quotation.customer_id)
      .single();

    if (pErr || !profile) {
      return new Response(JSON.stringify({ error: "Customer not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pointsToAward = calculatePoints(quotation.estimated_price);

    // Award loyalty points
    const { error: insertErr } = await supabaseAdmin.from("loyalty_points").insert({
      customer_id: quotation.customer_id,
      points: pointsToAward,
      action_type: "earned",
      reason: `Quotation approved: ${quotation.product_name}`,
      quotation_id: quotation_id,
    });

    if (insertErr) {
      throw new Error("Failed to insert loyalty points: " + insertErr.message);
    }

    // Get total points balance
    const { data: allPoints } = await supabaseAdmin
      .from("loyalty_points")
      .select("points, action_type")
      .eq("customer_id", quotation.customer_id);

    const totalPoints = (allPoints || []).reduce(
      (s: number, p: any) => p.action_type === "earned" ? s + p.points : s - p.points, 0
    );

    const currentTier = getTier(totalPoints);
    const nextTier = TIER_CONFIG.find(t => t.min > totalPoints);

    const customerName = profile.username || profile.email.split("@")[0];

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
    </div>

    <!-- Points Banner -->
    <div style="background:linear-gradient(135deg,rgba(57,255,20,0.1) 0%,rgba(0,255,255,0.05) 100%);border:1px solid rgba(57,255,20,0.25);border-radius:16px;padding:32px;margin-bottom:24px;text-align:center;">
      <div style="font-size:48px;margin-bottom:12px;">🎉</div>
      <p style="color:#39FF14;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px;font-weight:700;">Loyalty Points Awarded</p>
      <h1 style="color:#FFF;font-size:24px;font-weight:700;margin:0 0 8px;">You earned <span style="color:#39FF14;font-family:monospace;font-size:32px;">+${pointsToAward.toLocaleString()}</span> points!</h1>
      <p style="color:#9CA3AF;font-size:14px;margin:0;">Congratulations, ${customerName}! Your quotation for <strong style="color:#FFF;">${quotation.product_name}</strong> has been approved.</p>
    </div>

    <!-- Points Summary -->
    <div style="background:#111;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px;margin-bottom:20px;">
      <h2 style="color:#39FF14;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 16px;font-weight:700;">Your Points Balance</h2>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
        <div style="text-align:center;padding:16px;background:rgba(57,255,20,0.05);border:1px solid rgba(57,255,20,0.15);border-radius:12px;">
          <p style="color:#9CA3AF;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 6px;">Points Earned</p>
          <p style="color:#39FF14;font-size:28px;font-weight:900;margin:0;font-family:monospace;">+${pointsToAward.toLocaleString()}</p>
        </div>
        <div style="text-align:center;padding:16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;">
          <p style="color:#9CA3AF;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 6px;">Total Balance</p>
          <p style="color:#FFF;font-size:28px;font-weight:900;margin:0;font-family:monospace;">${totalPoints.toLocaleString()}</p>
        </div>
      </div>

      <div style="padding:16px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;text-align:center;">
        <p style="color:#9CA3AF;font-size:12px;margin:0 0 4px;">Current Tier</p>
        <p style="color:#FFF;font-size:18px;font-weight:700;margin:0;">${currentTier.icon} ${currentTier.name} Member</p>
        ${nextTier ? `<p style="color:#6B7280;font-size:12px;margin:6px 0 0;">${(nextTier.min - totalPoints).toLocaleString()} more points to reach ${nextTier.name}</p>` : `<p style="color:#39FF14;font-size:12px;margin:6px 0 0;">You've reached the highest tier! 🏆</p>`}
      </div>
    </div>

    <!-- How to use points -->
    <div style="background:#111;border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:24px;margin-bottom:24px;">
      <h2 style="color:#FFF;font-size:14px;font-weight:600;margin:0 0 16px;">Redeem Your Points For:</h2>
      ${[
        ["🏷️", "Discounts", "Get ₱500–₱2,500 off future purchases"],
        ["🔧", "Free Service", "Tune-ups, battery checks, and more"],
        ["⚡", "Annual Package", "Full annual maintenance — free!"],
      ].map(([icon, title, desc]) => `
        <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
          <span style="font-size:24px;">${icon}</span>
          <div>
            <p style="color:#FFF;font-size:13px;font-weight:600;margin:0;">${title}</p>
            <p style="color:#9CA3AF;font-size:12px;margin:2px 0 0;">${desc}</p>
          </div>
        </div>
      `).join("")}
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin:28px 0;">
      <a href="https://tripmobility.ph/my-quotes" style="display:inline-block;background:#39FF14;color:#0A0A0A;font-weight:700;font-size:13px;padding:14px 32px;border-radius:12px;text-decoration:none;text-transform:uppercase;letter-spacing:1px;">
        View My Rewards →
      </a>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding-top:24px;border-top:1px solid rgba(255,255,255,0.05);">
      <p style="color:#6B7280;font-size:12px;margin:0 0 6px;">TRIP Mobility — Philippines' Premium E-Bike Company</p>
      <p style="color:#374151;font-size:11px;margin:12px 0 0;">Quote ID: ${quotation_id}</p>
    </div>
  </div>
</body>
</html>`;

    await sendEmail(
      profile.email,
      `🎉 You Earned ${pointsToAward} Loyalty Points — TRIP Mobility`,
      html
    );

    console.log(`Loyalty points awarded: ${pointsToAward} pts to ${profile.email}`);

    return new Response(
      JSON.stringify({ success: true, points_awarded: pointsToAward, total_points: totalPoints }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("award-loyalty-points error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
