import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const ADMIN_EMAIL = "sales@tripmobility.ph";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch all data in parallel
  const [leadsRes, quotationsRes, contactsRes, allLeadsRes] = await Promise.all([
    supabaseAdmin.from("leads").select("*").gte("created_at", sevenDaysAgo),
    supabaseAdmin.from("quotations").select("*").gte("created_at", sevenDaysAgo),
    supabaseAdmin.from("contact_messages").select("*").eq("status", "unread"),
    supabaseAdmin.from("leads").select("score, product_interest, status"),
  ]);

  const weekLeads = leadsRes.data || [];
  const weekQuotations = quotationsRes.data || [];
  const unreadContacts = contactsRes.data || [];
  const allLeads = allLeadsRes.data || [];

  // Compute stats
  const totalLeads = allLeads.length;
  const avgScore = totalLeads > 0
    ? Math.round(allLeads.reduce((s: number, l: any) => s + (l.score || 0), 0) / totalLeads)
    : 0;

  const won = allLeads.filter((l: any) => l.status === "won").length;
  const convRate = totalLeads > 0 ? ((won / totalLeads) * 100).toFixed(1) : "0";

  // Top products
  const productMap: Record<string, number> = {};
  allLeads.forEach((l: any) => {
    if (l.product_interest) productMap[l.product_interest] = (productMap[l.product_interest] || 0) + 1;
  });
  const topProducts = Object.entries(productMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  // Score distribution
  const high = allLeads.filter((l: any) => (l.score || 0) >= 80).length;
  const warm = allLeads.filter((l: any) => (l.score || 0) >= 60 && (l.score || 0) < 80).length;
  const standard = allLeads.filter((l: any) => (l.score || 0) < 60).length;

  const weekStr = `${new Date(sevenDaysAgo).toLocaleDateString("en-PH", { month: "short", day: "numeric" })} – ${now.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TRIP Weekly Summary</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0A0A0A; color: #E5E5E5; margin: 0; padding: 0; }
  .container { max-width: 640px; margin: 0 auto; padding: 32px 16px; }
  .header { background: linear-gradient(135deg, #111 0%, #0D0D0D 100%); border: 1px solid rgba(57,255,20,0.2); border-radius: 16px; padding: 32px; margin-bottom: 24px; text-align: center; }
  .logo { font-size: 28px; font-weight: 900; color: #39FF14; letter-spacing: 2px; }
  .subtitle { color: #888; font-size: 13px; margin-top: 4px; }
  .period { display: inline-block; padding: 4px 16px; background: rgba(57,255,20,0.1); border: 1px solid rgba(57,255,20,0.3); border-radius: 20px; font-size: 12px; color: #39FF14; margin-top: 12px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 24px; }
  .kpi { background: #111; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 20px; text-align: center; }
  .kpi-value { font-size: 32px; font-weight: 900; color: #39FF14; }
  .kpi-label { font-size: 11px; color: #666; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
  .kpi-delta { font-size: 11px; color: #39FF14; margin-top: 4px; }
  .section { background: #111; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 20px; margin-bottom: 16px; }
  .section-title { font-size: 13px; font-weight: 700; color: #39FF14; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px; }
  .score-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
  .score-label { font-size: 12px; color: #999; width: 100px; }
  .score-track { flex: 1; height: 8px; background: rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden; }
  .score-fill { height: 100%; border-radius: 4px; }
  .score-count { font-size: 13px; font-weight: 700; color: #E5E5E5; width: 30px; text-align: right; }
  .product-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
  .product-row:last-child { border-bottom: none; }
  .product-name { font-size: 13px; color: #E5E5E5; }
  .product-count { font-size: 13px; font-weight: 700; color: #39FF14; }
  .alert { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: 10px; padding: 14px; font-size: 13px; color: #FCA5A5; }
  .cta { text-align: center; margin-top: 24px; }
  .cta a { display: inline-block; padding: 14px 32px; background: #39FF14; color: #0A0A0A; font-weight: 800; font-size: 14px; text-decoration: none; border-radius: 10px; }
  .footer { text-align: center; font-size: 11px; color: #444; margin-top: 24px; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="logo">⚡ TRIP MOBILITY</div>
    <div class="subtitle">Weekly Sales Intelligence Digest</div>
    <div class="period">📅 ${weekStr}</div>
  </div>

  <!-- This Week KPIs -->
  <div class="kpi-grid">
    <div class="kpi">
      <div class="kpi-value">${weekLeads.length}</div>
      <div class="kpi-label">New Leads This Week</div>
    </div>
    <div class="kpi">
      <div class="kpi-value">${weekQuotations.length}</div>
      <div class="kpi-label">New Quotations</div>
    </div>
    <div class="kpi">
      <div class="kpi-value">${totalLeads}</div>
      <div class="kpi-label">Total Pipeline Leads</div>
    </div>
    <div class="kpi">
      <div class="kpi-value">${convRate}%</div>
      <div class="kpi-label">Overall Win Rate</div>
    </div>
  </div>

  <!-- Lead Score Distribution -->
  <div class="section">
    <div class="section-title">🎯 Lead Score Distribution</div>
    <div class="score-bar">
      <div class="score-label">🔥 High (≥80)</div>
      <div class="score-track"><div class="score-fill" style="background:#39FF14;width:${totalLeads > 0 ? (high/totalLeads*100).toFixed(0) : 0}%"></div></div>
      <div class="score-count">${high}</div>
    </div>
    <div class="score-bar">
      <div class="score-label">⚡ Warm (60–79)</div>
      <div class="score-track"><div class="score-fill" style="background:#FACC15;width:${totalLeads > 0 ? (warm/totalLeads*100).toFixed(0) : 0}%"></div></div>
      <div class="score-count">${warm}</div>
    </div>
    <div class="score-bar">
      <div class="score-label">📋 Standard (&lt;60)</div>
      <div class="score-track"><div class="score-fill" style="background:#6B7280;width:${totalLeads > 0 ? (standard/totalLeads*100).toFixed(0) : 0}%"></div></div>
      <div class="score-count">${standard}</div>
    </div>
    <p style="font-size:12px;color:#666;margin-top:12px;">Average lead score across all pipeline: <strong style="color:#39FF14">${avgScore}/100</strong></p>
  </div>

  <!-- Top Products -->
  <div class="section">
    <div class="section-title">🏆 Top Product Interest</div>
    ${topProducts.length > 0 ? topProducts.map(([name, count]: [string, number]) => `
    <div class="product-row">
      <div class="product-name">${name}</div>
      <div class="product-count">${count} inquiries</div>
    </div>`).join("") : `<p style="color:#666;font-size:13px;">No product interest data available.</p>`}
  </div>

  <!-- Unread Contacts Alert -->
  ${unreadContacts.length > 0 ? `
  <div class="alert">
    ⚠️ <strong>${unreadContacts.length} unread contact message${unreadContacts.length > 1 ? "s" : ""}</strong> require your attention. Please review and respond in the Admin Panel.
  </div>` : `
  <div class="section" style="border-color:rgba(57,255,20,0.2);background:rgba(57,255,20,0.03)">
    <p style="font-size:13px;color:#39FF14;text-align:center">✅ All contact messages have been addressed this week. Great work!</p>
  </div>`}

  <div class="cta">
    <a href="https://tripmobility.onspace.app/admin">Open Admin Dashboard →</a>
  </div>

  <div class="footer">
    <p>TRIP Mobility Admin Panel · Auto-generated weekly digest</p>
    <p>© ${now.getFullYear()} TRIP Mobility Philippines. All rights reserved.</p>
  </div>
</div>
</body>
</html>`;

  // Send via Resend
  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({
      from: "TRIP Mobility <noreply@tripmobility.ph>",
      to: [ADMIN_EMAIL],
      subject: `📊 Weekly Sales Digest — ${weekStr}`,
      html,
    }),
  });

  if (!resendRes.ok) {
    const err = await resendRes.text();
    console.error("Resend error:", err);
    return new Response(JSON.stringify({ error: "Resend: " + err }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ success: true, leads: weekLeads.length, quotations: weekQuotations.length, unread_contacts: unreadContacts.length }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
