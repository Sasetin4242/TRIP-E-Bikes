import { useState, useEffect, useCallback } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList, PieChart, Pie, AreaChart, Area,
  Legend
} from "recharts";
import {
  TrendingUp, Users, FileText, CheckCircle, Loader2, RefreshCw,
  Target, MapPin, Award, ArrowUpRight, Zap, DollarSign, Star,
  Wrench, Calendar
} from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface Lead {
  id: string;
  product_interest: string;
  score: number;
  status: string;
  source: string;
  notes: string;
  company: string;
  created_at: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass rounded-xl border border-white/10 px-4 py-3 text-xs shadow-2xl">
        <p className="text-gray-400 mb-1">{label}</p>
        <p className="text-[#39FF14] font-bold text-sm">{payload[0].value} {payload[0].name || "leads"}</p>
      </div>
    );
  }
  return null;
};

const RevenueTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass rounded-xl border border-white/10 px-4 py-3 text-xs shadow-2xl">
        <p className="text-gray-400 mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }} className="font-bold text-sm">
            {p.name}: {typeof p.value === "number" && p.name.includes("Revenue") ? `₱${p.value.toLocaleString()}` : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const PieCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.08) return null;
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const BAR_COLORS = ["#39FF14", "#00FFFF", "#4FFF2A", "#22d3ee", "#86efac", "#a3e635"];
const PIE_COLORS = ["#39FF14", "#00FFFF", "#FB923C", "#A78BFA", "#F472B6", "#FACC15"];
const TIER_COLORS = ["#D97706", "#9CA3AF", "#FACC15", "#39FF14"];

export default function AdminAnalytics() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loyaltyPoints, setLoyaltyPoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await apiClient.get("/analytics.php");
    if (!error && data) {
      setLeads(data.leads || []);
      setQuotations(data.quotations || []);
      setAppointments(data.service_appointments || []);
      setReviews(data.product_reviews || []);
      setLoyaltyPoints(data.loyalty_points || []);
      setLastUpdated(new Date());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ── 30-day trend ──
  const trendData = (() => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
      const count = leads.filter(l => l.created_at.startsWith(dateStr)).length;
      days.push({ date: dateStr, count, label: i % 5 === 0 ? label : "" });
    }
    return days;
  })();

  // ── Monthly revenue from approved quotations ──
  const monthlyRevenueData = (() => {
    const map: Record<string, { month: string; revenue: number; count: number }> = {};
    const approvedQuots = quotations.filter(q => ["approved", "completed"].includes(q.status) && q.estimated_price);
    approvedQuots.forEach(q => {
      const d = new Date(q.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-PH", { month: "short", year: "2-digit" });
      if (!map[key]) map[key] = { month: label, revenue: 0, count: 0 };
      map[key].revenue += Number(q.estimated_price);
      map[key].count += 1;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([, v]) => v);
  })();

  // ── Service center appointment distribution ──
  const centerPieData = (() => {
    const map: Record<string, number> = {};
    appointments.forEach(a => { map[a.service_center] = (map[a.service_center] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  })();

  // ── Loyalty tier breakdown ──
  const TIER_CONFIG = [
    { name: "Bronze",   min: 0,     max: 999,      color: TIER_COLORS[0] },
    { name: "Silver",   min: 1000,  max: 4999,     color: TIER_COLORS[1] },
    { name: "Gold",     min: 5000,  max: 14999,    color: TIER_COLORS[2] },
    { name: "Platinum", min: 15000, max: Infinity, color: TIER_COLORS[3] },
  ];
  const loyaltyTierData = (() => {
    // Group points by customer
    const customerPoints: Record<string, number> = {};
    loyaltyPoints.forEach(p => {
      if (!customerPoints[p.customer_id]) customerPoints[p.customer_id] = 0;
      customerPoints[p.customer_id] += p.action_type === "earned" ? p.points : -p.points;
    });
    const tierCounts: Record<string, number> = { Bronze: 0, Silver: 0, Gold: 0, Platinum: 0 };
    Object.values(customerPoints).forEach(pts => {
      const tier = TIER_CONFIG.find(t => pts >= t.min && pts <= t.max);
      if (tier) tierCounts[tier.name]++;
    });
    return TIER_CONFIG.map(t => ({ name: t.name, value: tierCounts[t.name], color: t.color })).filter(t => t.value > 0);
  })();

  // ── Review rating trend (last 6 months) ──
  const reviewTrendData = (() => {
    const map: Record<string, { month: string; avg: number; count: number; total: number }> = {};
    reviews.forEach(r => {
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-PH", { month: "short", year: "2-digit" });
      if (!map[key]) map[key] = { month: label, avg: 0, count: 0, total: 0 };
      map[key].total += r.rating;
      map[key].count += 1;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([, v]) => ({ ...v, avg: parseFloat((v.total / v.count).toFixed(2)) }));
  })();

  // ── Product interest ──
  const productData = (() => {
    const map: Record<string, number> = {};
    leads.forEach(l => { if (l.product_interest) map[l.product_interest] = (map[l.product_interest] || 0) + 1; });
    return Object.entries(map).map(([product, count]) => ({ product: product.replace("TRIP ", ""), count })).sort((a, b) => b.count - a.count).slice(0, 6);
  })();

  // ── Core metrics ──
  const totalLeads = leads.length;
  const totalQuotations = quotations.length;
  const approvedQuotations = quotations.filter(q => ["approved", "completed"].includes(q.status)).length;
  const conversionRate = totalLeads > 0 ? ((approvedQuotations / totalLeads) * 100).toFixed(1) : "0";
  const avgScore = leads.length > 0 ? Math.round(leads.reduce((s, l) => s + (l.score || 0), 0) / leads.length) : 0;
  const highPriority = leads.filter(l => (l.score || 0) >= 80).length;
  const totalRevenue = quotations.filter(q => ["approved", "completed"].includes(q.status) && q.estimated_price).reduce((s, q) => s + Number(q.estimated_price), 0);
  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "—";
  const scorePercent = Math.min((avgScore / 100) * 100, 100);
  const gaugeColor = avgScore >= 80 ? "#39FF14" : avgScore >= 60 ? "#FACC15" : "#F87171";

  // ── Geographic ──
  const cityData = (() => {
    const cities: Record<string, number> = {};
    const KNOWN_CITIES = ["Manila","Quezon City","Makati","Cebu","Davao","Pasig","Taguig","Mandaluyong","Paranaque","Antipolo","Pasay","Caloocan","Marikina","Muntinlupa","Las Piñas","Valenzuela","Iloilo","Bacolod","Zamboanga","General Santos","Cagayan"];
    leads.forEach(l => {
      const text = ((l.notes || "") + " " + (l.company || "")).toLowerCase();
      KNOWN_CITIES.forEach(city => { if (text.includes(city.toLowerCase())) cities[city] = (cities[city] || 0) + 1; });
    });
    return Object.entries(cities).map(([city, count]) => ({ city, count })).sort((a, b) => b.count - a.count).slice(0, 8);
  })();

  const sourceData = (() => {
    const map: Record<string, number> = {};
    leads.forEach(l => { map[l.source || "website"] = (map[l.source || "website"] || 0) + 1; });
    return Object.entries(map).map(([city, count]) => ({ city, count })).sort((a, b) => b.count - a.count);
  })();

  const geographicRows = cityData.length > 0 ? cityData : sourceData;
  const geographicLabel = cityData.length > 0 ? "City / Region" : "Lead Source";

  const FUNNEL_STAGES = [
    { label: "Total Leads", value: totalLeads, color: "bg-blue-500/20 border-blue-500/40 text-blue-400", width: 100 },
    { label: "Quotations Opened", value: totalQuotations, color: "bg-purple-500/20 border-purple-500/40 text-purple-400", width: totalLeads > 0 ? (totalQuotations / totalLeads) * 100 : 0 },
    { label: "Approved / Won", value: approvedQuotations, color: "bg-[#39FF14]/15 border-[#39FF14]/40 text-[#39FF14]", width: totalLeads > 0 ? (approvedQuotations / totalLeads) * 100 : 0 },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-orbitron font-bold text-2xl text-white">Analytics</h1>
          <p className="text-gray-500 text-sm mt-1">
            Last updated {lastUpdated.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })} · Auto-refreshes every 30s
          </p>
        </div>
        <button onClick={fetchData} disabled={loading} className="flex items-center gap-2 px-4 py-2.5 glass rounded-xl border border-white/10 text-gray-400 hover:text-white text-xs font-semibold transition-all">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />Refresh
        </button>
      </div>

      {loading && leads.length === 0 ? (
        <div className="flex items-center justify-center py-24 gap-3">
          <Loader2 className="w-8 h-8 text-[#39FF14] animate-spin" />
          <p className="text-gray-500">Loading analytics...</p>
        </div>
      ) : (
        <div className="space-y-8">

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Leads",      value: totalLeads,       icon: Users,       color: "text-blue-400",    trend: "+12% this week" },
              { label: "High Priority",    value: highPriority,     icon: Award,       color: "text-[#39FF14]",   trend: `Score ≥ 80` },
              { label: "Total Revenue",    value: totalRevenue > 0 ? `₱${(totalRevenue/1000).toFixed(0)}K` : "₱0", icon: DollarSign, color: "text-yellow-400", trend: "Approved quotes" },
              { label: "Avg Rating",       value: avgRating,        icon: Star,        color: "text-orange-400",  trend: `${reviews.length} reviews` },
            ].map((kpi, i) => (
              <div key={i} className="glass rounded-xl p-5 border border-white/5 hover:border-white/10 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center">
                    <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-gray-600" />
                </div>
                <p className={`font-orbitron font-bold text-3xl ${kpi.color}`}>{kpi.value}</p>
                <p className="text-sm text-gray-400 mt-1">{kpi.label}</p>
                <p className="text-[11px] text-gray-600 mt-0.5">{kpi.trend}</p>
              </div>
            ))}
          </div>

          {/* Row 1: 30-day trend + Lead Score Gauge */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass rounded-xl p-6 border border-white/5">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-white text-sm">30-Day Lead Trend</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Daily incoming leads</p>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#39FF14]/10 border border-[#39FF14]/20">
                  <TrendingUp className="w-3 h-3 text-[#39FF14]" />
                  <span className="text-[10px] text-[#39FF14] font-semibold uppercase">LIVE</span>
                </div>
              </div>
              {trendData.every(d => d.count === 0) ? (
                <div className="flex items-center justify-center h-48 text-gray-600 text-sm">No leads in the past 30 days</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#39FF14" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#39FF14" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="label" tick={{ fill: "#666", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#666", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="count" stroke="#39FF14" strokeWidth={2} fill="url(#areaGrad)" dot={false} activeDot={{ r: 4, fill: "#39FF14", strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Avg Lead Score Gauge */}
            <div className="glass rounded-xl p-6 border border-white/5 flex flex-col">
              <h3 className="font-semibold text-white text-sm mb-1">Average Lead Score</h3>
              <p className="text-xs text-gray-500 mb-4">Quality index across all leads</p>
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="relative w-44 h-24 overflow-hidden mb-4">
                  <svg viewBox="0 0 200 110" className="w-full h-full">
                    <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="16" strokeLinecap="round" />
                    <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={gaugeColor} strokeWidth="16" strokeLinecap="round" strokeDasharray={`${(scorePercent / 100) * 251.2} 251.2`} style={{ filter: `drop-shadow(0 0 8px ${gaugeColor}80)` }} />
                  </svg>
                  <div className="absolute inset-0 flex items-end justify-center pb-1">
                    <div className="text-center">
                      <p className="font-orbitron font-black text-3xl" style={{ color: gaugeColor }}>{avgScore}</p>
                      <p className="text-[10px] text-gray-600">/ 100</p>
                    </div>
                  </div>
                </div>
                <div className="w-full space-y-2">
                  {[
                    { label: "🔥 High Priority", range: "Score ≥ 80", count: leads.filter(l => (l.score||0) >= 80).length, color: "text-[#39FF14]" },
                    { label: "⚡ Warm",           range: "Score 60–79", count: leads.filter(l => (l.score||0) >= 60 && (l.score||0) < 80).length, color: "text-yellow-400" },
                    { label: "📋 Standard",       range: "Score < 60",  count: leads.filter(l => (l.score||0) < 60).length, color: "text-gray-400" },
                  ].map(tier => (
                    <div key={tier.label} className="flex items-center justify-between">
                      <span className={`text-xs ${tier.color}`}>{tier.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-600">{tier.range}</span>
                        <span className={`text-xs font-bold ${tier.color}`}>{tier.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Monthly Revenue Trend */}
          <div className="glass rounded-xl p-6 border border-white/5">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-yellow-400" />Monthly Revenue Trend
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Estimated revenue from approved quotations (last 6 months)</p>
              </div>
              <div className="text-right">
                <p className="font-orbitron font-bold text-xl text-yellow-400">₱{(totalRevenue / 1000).toFixed(0)}K</p>
                <p className="text-[10px] text-gray-500">Total approved revenue</p>
              </div>
            </div>
            {monthlyRevenueData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-600 text-sm">No approved quotations with pricing data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyRevenueData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }} barSize={36}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FACC15" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#666", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₱${(v/1000).toFixed(0)}K`} />
                  <Tooltip content={<RevenueTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Bar dataKey="revenue" name="Revenue" fill="url(#revenueGrad)" radius={[6, 6, 0, 0]}>
                    <LabelList dataKey="count" position="top" style={{ fill: "#9CA3AF", fontSize: 10 }} formatter={(v: number) => `${v} deals`} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Row 3: Product Interest + Funnel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass rounded-xl p-6 border border-white/5">
              <h3 className="font-semibold text-white text-sm mb-1">Top Product Interest</h3>
              <p className="text-xs text-gray-500 mb-6">Quote requests by e-bike model</p>
              {productData.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-gray-600 text-sm">No product data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={productData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal vertical={false} />
                    <XAxis dataKey="product" tick={{ fill: "#888", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#666", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {productData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                      <LabelList dataKey="count" position="top" style={{ fill: "#aaa", fontSize: 11 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="glass rounded-xl p-6 border border-white/5 flex flex-col">
              <h3 className="font-semibold text-white text-sm mb-1">Conversion Funnel</h3>
              <p className="text-xs text-gray-500 mb-6">Leads → Quotations → Won</p>
              <div className="flex-1 space-y-3">
                {FUNNEL_STAGES.map((stage, i) => (
                  <div key={i} className={`rounded-xl border p-4 ${stage.color}`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold uppercase tracking-wide">{stage.label}</p>
                      <p className="font-orbitron font-bold text-xl">{stage.value}</p>
                    </div>
                    <div className="h-1.5 bg-black/20 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-current opacity-70 transition-all duration-700" style={{ width: `${Math.max(stage.width, stage.value > 0 ? 5 : 0)}%` }} />
                    </div>
                    {i > 0 && totalLeads > 0 && <p className="text-[10px] opacity-60 mt-1.5">{((stage.value / totalLeads) * 100).toFixed(1)}% of total leads</p>}
                  </div>
                ))}
                <div className="mt-4 p-3 rounded-xl bg-[#39FF14]/5 border border-[#39FF14]/15 text-center">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Overall Win Rate</p>
                  <p className="font-orbitron font-bold text-2xl text-[#39FF14]">{conversionRate}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Row 4: Service Center Pie + Loyalty Tiers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Service Center Pie */}
            <div className="glass rounded-xl p-6 border border-white/5">
              <div className="flex items-center gap-2 mb-5">
                <Wrench className="w-4 h-4 text-[#00FFFF]" />
                <div>
                  <h3 className="font-semibold text-white text-sm">Service Center Distribution</h3>
                  <p className="text-xs text-gray-500">Appointments by location</p>
                </div>
              </div>
              {centerPieData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-600 text-sm gap-3">
                  <Wrench className="w-10 h-10 opacity-30" />No appointment data yet
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="50%" height={200}>
                    <PieChart>
                      <Pie data={centerPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" labelLine={false} label={PieCustomLabel}>
                        {centerPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value: number, name: string) => [value, name]} contentStyle={{ background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#F5F5F5", fontSize: "12px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {centerPieData.slice(0, 6).map((item, i) => (
                      <div key={i} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="text-xs text-gray-400 truncate max-w-28">{item.name}</span>
                        </div>
                        <span className="text-xs font-bold text-white">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Loyalty Tier Breakdown */}
            <div className="glass rounded-xl p-6 border border-white/5">
              <div className="flex items-center gap-2 mb-5">
                <Award className="w-4 h-4 text-yellow-400" />
                <div>
                  <h3 className="font-semibold text-white text-sm">Customer Loyalty Tiers</h3>
                  <p className="text-xs text-gray-500">Distribution across Bronze–Platinum</p>
                </div>
              </div>
              {loyaltyTierData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-600 text-sm gap-3">
                  <Award className="w-10 h-10 opacity-30" />No loyalty data yet
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="50%" height={200}>
                    <PieChart>
                      <Pie data={loyaltyTierData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" labelLine={false} label={PieCustomLabel}>
                        {loyaltyTierData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(value: number, name: string) => [value, name]} contentStyle={{ background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#F5F5F5", fontSize: "12px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-3">
                    {[
                      { name: "Platinum", icon: "💎", color: "#39FF14", min: 15000 },
                      { name: "Gold",     icon: "🥇", color: "#FACC15", min: 5000 },
                      { name: "Silver",   icon: "🥈", color: "#9CA3AF", min: 1000 },
                      { name: "Bronze",   icon: "🥉", color: "#D97706", min: 0 },
                    ].map(tier => {
                      const tierData = loyaltyTierData.find(t => t.name === tier.name);
                      return (
                        <div key={tier.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{tier.icon}</span>
                            <span className="text-xs text-gray-400">{tier.name}</span>
                          </div>
                          <span className="text-sm font-bold" style={{ color: tier.color }}>{tierData?.value || 0}</span>
                        </div>
                      );
                    })}
                    <div className="pt-2 border-t border-white/5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Total members</span>
                        <span className="text-sm font-bold text-white">{loyaltyTierData.reduce((s, t) => s + t.value, 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Row 5: Review Rating Trend */}
          <div className="glass rounded-xl p-6 border border-white/5">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-orange-400" />
                <div>
                  <h3 className="font-semibold text-white text-sm">Review Rating Trend</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Average product ratings over the past 6 months</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-orbitron font-bold text-xl text-orange-400">{avgRating}</p>
                <p className="text-[10px] text-gray-500">{reviews.length} total reviews</p>
              </div>
            </div>
            {reviewTrendData.length === 0 ? (
              <div className="flex items-center justify-center h-36 text-gray-600 text-sm">No review data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={reviewTrendData} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="month" tick={{ fill: "#666", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 5]} tick={{ fill: "#666", fontSize: 10 }} axisLine={false} tickLine={false} tickCount={6} />
                  <Tooltip contentStyle={{ background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#F5F5F5", fontSize: "12px" }} formatter={(v: number) => [`${v} ⭐`, "Avg Rating"]} />
                  <Line type="monotone" dataKey="avg" stroke="#FB923C" strokeWidth={2.5} dot={{ r: 4, fill: "#FB923C", strokeWidth: 0 }} activeDot={{ r: 6, fill: "#FB923C" }} name="Avg Rating" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Row 6: Geographic / Source Distribution */}
          <div className="glass rounded-xl p-6 border border-white/5">
            <div className="flex items-center gap-3 mb-6">
              <MapPin className="w-5 h-5 text-[#39FF14]" />
              <div>
                <h3 className="font-semibold text-white text-sm">{geographicLabel} Distribution</h3>
                <p className="text-xs text-gray-500">{cityData.length > 0 ? "Detected from lead notes and company fields" : "Where your leads are coming from"}</p>
              </div>
            </div>
            {geographicRows.length === 0 ? (
              <div className="text-center py-8 text-gray-600 text-sm">
                <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Not enough geographic data yet. City names in lead notes will appear here.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {geographicRows.map((row, i) => {
                  const maxCount = geographicRows[0].count;
                  const pct = maxCount > 0 ? (row.count / maxCount) * 100 : 0;
                  return (
                    <div key={i} className="bg-white/2 rounded-xl p-4 border border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-gray-300 font-medium capitalize">{row.city}</p>
                        <p className="text-sm font-bold text-[#39FF14]">{row.count}</p>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#39FF14] to-[#00FFFF] rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[10px] text-gray-600 mt-1">{pct.toFixed(0)}% of segment</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
