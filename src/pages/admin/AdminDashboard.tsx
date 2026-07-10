import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp, Users, Package, MessageSquare, ArrowUpRight,
  Zap, DollarSign, Eye, Target, ChevronRight, RefreshCw,
  Loader2, Clock, CheckCircle
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { PRODUCTS } from "@/constants/products";
import type { LeadStatus } from "@/types";

interface DbLead {
  id: string;
  name: string;
  email: string;
  company: string | null;
  product_interest: string;
  quantity: number;
  status: LeadStatus;
  score: number;
  budget: string | null;
  created_at: string;
}

const PIPELINE_STAGES = [
  { key: "new" as LeadStatus, label: "New", color: "bg-blue-500" },
  { key: "contacted" as LeadStatus, label: "Contacted", color: "bg-indigo-500" },
  { key: "qualified" as LeadStatus, label: "Qualified", color: "bg-violet-500" },
  { key: "proposal" as LeadStatus, label: "Proposal", color: "bg-yellow-500" },
  { key: "negotiation" as LeadStatus, label: "Negotiation", color: "bg-orange-500" },
  { key: "closed_won" as LeadStatus, label: "Won", color: "bg-[#39FF14]" },
  { key: "closed_lost" as LeadStatus, label: "Lost", color: "bg-red-500" },
];

export default function AdminDashboard() {
  const [leads, setLeads] = useState<DbLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchLeads = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    const { data, error } = await apiClient.get("/leads.php");
    if (!error && data) {
      setLeads(data);
      setLastRefresh(new Date());
    }
    if (!silent) setLoading(false);
    else setRefreshing(false);
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);
  useEffect(() => {
    const interval = setInterval(() => fetchLeads(true), 30000);
    return () => clearInterval(interval);
  }, [fetchLeads]);

  // Compute real stats
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const newThisWeek = leads.filter(l => new Date(l.created_at) >= weekAgo).length;
  const closedWon = leads.filter(l => l.status === "closed_won").length;
  const convRate = leads.length > 0 ? Math.round((closedWon / leads.length) * 100) : 0;
  const highPriority = leads.filter(l => l.score >= 80).length;
  const newLeads = leads.filter(l => l.status === "new").length;

  const pipelineCounts: Record<string, number> = {};
  PIPELINE_STAGES.forEach(s => { pipelineCounts[s.key] = leads.filter(l => l.status === s.key).length; });

  const METRICS = [
    { label: "Total Leads", value: loading ? "—" : leads.length.toString(), change: `+${newThisWeek} this week`, icon: Users, color: "text-blue-400" },
    { label: "New Leads", value: loading ? "—" : newLeads.toString(), change: "Needs contact", icon: Zap, color: "text-[#39FF14]" },
    { label: "Closed Won", value: loading ? "—" : closedWon.toString(), change: `${convRate}% conv. rate`, icon: Target, color: "text-emerald-400" },
    { label: "High Priority", value: loading ? "—" : highPriority.toString(), change: "Score ≥ 80", icon: TrendingUp, color: "text-yellow-400" },
    { label: "Product Views", value: "12,483", change: "+18%", icon: Eye, color: "text-purple-400" },
    { label: "Quote Requests", value: loading ? "—" : leads.length.toString(), change: "+31%", icon: MessageSquare, color: "text-cyan-400" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Command Center</p>
          <h1 className="font-orbitron font-bold text-3xl text-white">Dashboard Overview</h1>
          <p className="text-gray-600 text-xs mt-1">Updated {lastRefresh.toLocaleTimeString()}</p>
        </div>
        <button
          onClick={() => fetchLeads(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white transition-all text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {METRICS.map((metric, i) => (
          <div key={i} className="glass rounded-xl p-5 border border-white/5 hover:border-white/10 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                <metric.icon className={`w-5 h-5 ${metric.color}`} />
              </div>
              <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                <ArrowUpRight className="w-3 h-3" /> {metric.change}
              </span>
            </div>
            {loading && i < 4 ? (
              <div className="h-8 w-16 bg-white/5 rounded animate-pulse mb-1" />
            ) : (
              <p className="font-orbitron font-bold text-2xl text-white">{metric.value}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">{metric.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline + Recent Leads */}
        <div className="lg:col-span-2 glass rounded-xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-orbitron font-bold text-lg text-white">Live Sales Pipeline</h2>
            <Link to="/admin/leads" className="text-xs text-[#39FF14] flex items-center gap-1 hover:gap-2 transition-all">
              Manage Leads <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 py-4">
              <Loader2 className="w-5 h-5 text-[#39FF14] animate-spin" />
              <p className="text-gray-500 text-sm">Loading pipeline data...</p>
            </div>
          ) : (
            <>
              {/* Funnel Bar */}
              <div className="flex gap-1 mb-3 rounded-lg overflow-hidden h-4">
                {PIPELINE_STAGES.map((stage) => {
                  const count = pipelineCounts[stage.key] || 0;
                  const pct = leads.length > 0 ? (count / leads.length) * 100 : 0;
                  return (
                    <div
                      key={stage.key}
                      className={`${stage.color} transition-all duration-700 relative group cursor-pointer`}
                      style={{ width: `${Math.max(pct, leads.length > 0 ? 2 : 0)}%` }}
                      title={`${stage.label}: ${count}`}
                    />
                  );
                })}
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-3 mb-6">
                {PIPELINE_STAGES.map((stage) => (
                  <div key={stage.key} className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${stage.color}`} />
                    <span className="text-xs text-gray-500">{stage.label}</span>
                    <span className="text-xs font-bold text-white">{pipelineCounts[stage.key] || 0}</span>
                  </div>
                ))}
              </div>

              {/* Recent Leads from DB */}
              <div className="border-t border-white/5 pt-6">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <Clock className="w-3 h-3" /> Recent Leads
                </p>
                <div className="space-y-2">
                  {leads.slice(0, 5).map((lead) => (
                    <Link
                      key={lead.id}
                      to="/admin/leads"
                      className="flex items-center justify-between py-2.5 px-3 rounded-xl border border-white/5 hover:border-white/10 hover:bg-white/2 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#39FF14]/10 flex items-center justify-center font-bold text-[#39FF14] text-xs border border-[#39FF14]/20">
                          {(lead.name || "?")[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{lead.name}</p>
                          <p className="text-xs text-gray-500">{lead.company || lead.product_interest}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 hidden sm:block">{lead.quantity} unit{lead.quantity > 1 ? "s" : ""}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          lead.status === "new" ? "bg-blue-500/20 text-blue-400" :
                          lead.status === "closed_won" ? "bg-[#39FF14]/20 text-[#39FF14]" :
                          lead.status === "proposal" ? "bg-yellow-500/20 text-yellow-400" :
                          "bg-gray-500/20 text-gray-400"
                        }`}>
                          {lead.status.replace("_", " ")}
                        </span>
                        <span className={`text-xs font-bold ${lead.score >= 80 ? "text-[#39FF14]" : "text-gray-500"}`}>{lead.score}</span>
                      </div>
                    </Link>
                  ))}
                  {leads.length === 0 && (
                    <p className="text-gray-600 text-sm text-center py-4">
                      No leads yet — quote form submissions will appear here
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Product Performance */}
          <div className="glass rounded-xl p-6 border border-white/5">
            <h2 className="font-orbitron font-bold text-base text-white mb-4">Product Interest</h2>
            <div className="space-y-4">
              {PRODUCTS.map((p, i) => {
                const count = leads.filter(l => l.product_interest === p.name).length;
                const maxCount = Math.max(...PRODUCTS.map(pr => leads.filter(l => l.product_interest === pr.name).length), 1);
                const pct = (count / maxCount) * 100;
                return (
                  <div key={p.id}>
                    <div className="flex justify-between mb-1">
                      <p className="text-xs text-gray-400 truncate flex-1 mr-2">{p.name}</p>
                      <p className="text-xs font-bold text-white">{count} leads</p>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#39FF14] to-[#00FFFF] rounded-full transition-all duration-1000"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Conversion Stats */}
          <div className="glass rounded-xl p-6 border border-white/5">
            <h2 className="font-orbitron font-bold text-base text-white mb-4">Conversion Stats</h2>
            <div className="space-y-3">
              {[
                { label: "Won Rate", value: `${convRate}%`, icon: CheckCircle, color: "text-[#39FF14]" },
                { label: "High Priority", value: highPriority.toString(), icon: TrendingUp, color: "text-yellow-400" },
                { label: "New This Week", value: newThisWeek.toString(), icon: Zap, color: "text-blue-400" },
                { label: "Total Pipeline", value: leads.length.toString(), icon: Users, color: "text-purple-400" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                    <p className="text-xs text-gray-400">{item.label}</p>
                  </div>
                  <p className={`font-orbitron font-bold text-sm ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="glass rounded-xl p-6 border border-white/5">
            <h2 className="font-orbitron font-bold text-base text-white mb-4">Quick Actions</h2>
            <div className="space-y-2">
              {[
                { label: "View All Leads", href: "/admin/leads" },
                { label: "Create Blog Post", href: "/admin/content" },
                { label: "Update Products", href: "/admin/products" },
                { label: "Manage Users", href: "/admin/users" },
              ].map((action) => (
                <Link
                  key={action.href}
                  to={action.href}
                  className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 transition-all group"
                >
                  <span className="text-sm text-gray-400 group-hover:text-white transition-colors">{action.label}</span>
                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-[#39FF14] transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
