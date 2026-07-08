import { useState, useEffect, useCallback } from "react";
import type { LeadStatus } from "@/types";
import {
  Search, Plus, X, Phone, Mail,
  Building2, Calendar, RefreshCw, Loader2,
  TrendingUp, Users, CheckCircle, Clock
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";

interface DbLead {
  id: string;
  name: string;
  email: string;
  mobile: string;
  company: string | null;
  use_type: string;
  product_interest: string;
  quantity: number;
  budget: string | null;
  contact_method: string;
  notes: string | null;
  status: LeadStatus;
  score: number;
  source: string;
  assigned_to: string | null;
  follow_up_date: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bg: string; dot: string }> = {
  new: { label: "New", color: "text-blue-400", bg: "bg-blue-500/20", dot: "bg-blue-400" },
  contacted: { label: "Contacted", color: "text-indigo-400", bg: "bg-indigo-500/20", dot: "bg-indigo-400" },
  qualified: { label: "Qualified", color: "text-violet-400", bg: "bg-violet-500/20", dot: "bg-violet-400" },
  proposal: { label: "Proposal Sent", color: "text-yellow-400", bg: "bg-yellow-500/20", dot: "bg-yellow-400" },
  negotiation: { label: "Negotiation", color: "text-orange-400", bg: "bg-orange-500/20", dot: "bg-orange-400" },
  closed_won: { label: "Won ✓", color: "text-[#39FF14]", bg: "bg-[#39FF14]/20", dot: "bg-[#39FF14]" },
  closed_lost: { label: "Lost", color: "text-red-400", bg: "bg-red-500/20", dot: "bg-red-400" },
};

const PIPELINE_STAGES: LeadStatus[] = ["new", "contacted", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"];

export default function AdminLeads() {
  const [leads, setLeads] = useState<DbLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [selectedLead, setSelectedLead] = useState<DbLead | null>(null);
  const [view, setView] = useState<"table" | "kanban">("table");
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const fetchLeads = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    const { data, error } = await apiClient.get("/leads.php");

    if (error) {
      console.error("Fetch leads error:", error);
      toast.error("Failed to load leads: " + error.message);
    } else {
      setLeads(data || []);
      setLastRefresh(new Date());
    }

    if (!silent) setLoading(false);
    else setRefreshing(false);
  }, []);

  // Initial load
  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Auto-refresh every 30 seconds (polling since realtime is not supported)
  useEffect(() => {
    const interval = setInterval(() => fetchLeads(true), 30000);
    return () => clearInterval(interval);
  }, [fetchLeads]);

  const updateLeadStatus = async (id: string, status: LeadStatus) => {
    setUpdatingStatus(id);
    const { error } = await apiClient.put(`/leads.php?id=${id}`, { status });

    if (error) {
      toast.error("Failed to update status: " + error.message);
    } else {
      setLeads((prev) => prev.map((l) => l.id === id ? { ...l, status } : l));
      if (selectedLead?.id === id) setSelectedLead((prev) => prev ? { ...prev, status } : null);
      toast.success(`Status updated to "${STATUS_CONFIG[status].label}"`);
    }
    setUpdatingStatus(null);
  };

  const filtered = leads.filter((l) => {
    const matchSearch =
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.email.toLowerCase().includes(search.toLowerCase()) ||
      (l.company || "").toLowerCase().includes(search.toLowerCase()) ||
      l.product_interest.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Summary stats
  const stats = {
    total: leads.length,
    new: leads.filter((l) => l.status === "new").length,
    won: leads.filter((l) => l.status === "closed_won").length,
    highPriority: leads.filter((l) => l.score >= 80).length,
  };

  return (
    <div className="h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-orbitron font-bold text-2xl text-white">Leads & CRM</h1>
          <p className="text-gray-500 text-sm mt-1">
            {leads.length} total leads ·{" "}
            <span className="text-gray-600">Updated {lastRefresh.toLocaleTimeString()}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchLeads(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Leads", value: stats.total, icon: Users, color: "text-blue-400" },
          { label: "New Leads", value: stats.new, icon: Clock, color: "text-[#39FF14]" },
          { label: "Closed Won", value: stats.won, icon: CheckCircle, color: "text-emerald-400" },
          { label: "High Priority", value: stats.highPriority, icon: TrendingUp, color: "text-yellow-400" },
        ].map((stat) => (
          <div key={stat.label} className="glass rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
            <p className="font-orbitron font-bold text-2xl text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search leads by name, email, company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#39FF14]/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as LeadStatus | "all")}
          className="bg-[#111] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-[#39FF14]/30 min-w-[140px]"
        >
          <option value="all">All Status</option>
          {PIPELINE_STAGES.map((s) => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </select>
        <div className="flex gap-1 border border-white/10 rounded-lg p-1">
          {(["table", "kanban"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${view === v ? "bg-[#39FF14]/20 text-[#39FF14]" : "text-gray-400 hover:text-white"}`}
            >
              {v === "table" ? "List" : "Kanban"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-8 h-8 text-[#39FF14] animate-spin" />
          <p className="text-gray-500 text-sm">Loading leads from database...</p>
        </div>
      ) : (
        <div className={`${selectedLead ? "grid grid-cols-1 lg:grid-cols-3 gap-6" : "block"}`}>
          {/* TABLE VIEW */}
          {view === "table" && (
            <div className={`${selectedLead ? "lg:col-span-2" : ""} glass rounded-xl border border-white/5 overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/2">
                      <th className="text-left py-3 px-4 text-xs text-gray-500 uppercase tracking-wide">Lead</th>
                      <th className="text-left py-3 px-4 text-xs text-gray-500 uppercase tracking-wide hidden md:table-cell">Model & Qty</th>
                      <th className="text-left py-3 px-4 text-xs text-gray-500 uppercase tracking-wide hidden lg:table-cell">Budget</th>
                      <th className="text-center py-3 px-4 text-xs text-gray-500 uppercase tracking-wide">Score</th>
                      <th className="text-center py-3 px-4 text-xs text-gray-500 uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((lead) => (
                      <tr
                        key={lead.id}
                        onClick={() => setSelectedLead(selectedLead?.id === lead.id ? null : lead)}
                        className={`border-b border-white/5 cursor-pointer transition-all ${
                          selectedLead?.id === lead.id
                            ? "bg-[#39FF14]/5 border-l-2 border-l-[#39FF14]"
                            : "hover:bg-white/3"
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#39FF14]/20 to-[#00FFFF]/10 flex items-center justify-center text-[#39FF14] text-xs font-bold shrink-0 border border-[#39FF14]/20">
                              {lead.name[0]}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-white">{lead.name}</p>
                              <p className="text-xs text-gray-500">{lead.company || lead.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell">
                          <p className="text-sm text-gray-300">{lead.product_interest}</p>
                          <p className="text-xs text-gray-500">{lead.quantity} unit{lead.quantity > 1 ? "s" : ""} · {lead.use_type}</p>
                        </td>
                        <td className="py-3 px-4 hidden lg:table-cell">
                          <p className="text-xs text-gray-400">{lead.budget || "—"}</p>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className={`inline-flex items-center justify-center w-9 h-9 rounded-full border-2 text-xs font-bold ${
                            lead.score >= 80
                              ? "border-[#39FF14] text-[#39FF14] bg-[#39FF14]/10"
                              : lead.score >= 60
                              ? "border-yellow-400 text-yellow-400 bg-yellow-500/10"
                              : "border-gray-600 text-gray-400"
                          }`}>
                            {lead.score}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_CONFIG[lead.status].bg} ${STATUS_CONFIG[lead.status].color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[lead.status].dot}`} />
                            {STATUS_CONFIG[lead.status].label}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filtered.length === 0 && (
                <div className="py-16 text-center">
                  <p className="text-gray-500 text-sm">
                    {leads.length === 0
                      ? "No leads yet. Quote form submissions will appear here automatically."
                      : "No leads match your search criteria."}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* KANBAN VIEW */}
          {view === "kanban" && (
            <div className={`${selectedLead ? "lg:col-span-2" : ""} overflow-x-auto -mx-6 px-6`}>
              <div className="flex gap-4 min-w-max pb-4">
                {PIPELINE_STAGES.slice(0, 5).map((stage) => {
                  const stageLeads = filtered.filter((l) => l.status === stage);
                  const cfg = STATUS_CONFIG[stage];
                  return (
                    <div key={stage} className="w-56 flex-shrink-0">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                          <span className={`text-xs font-bold uppercase tracking-wide ${cfg.color}`}>{cfg.label}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cfg.bg} ${cfg.color}`}>
                          {stageLeads.length}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {stageLeads.map((lead) => (
                          <div
                            key={lead.id}
                            onClick={() => setSelectedLead(selectedLead?.id === lead.id ? null : lead)}
                            className="glass rounded-xl p-4 border border-white/5 hover:border-white/15 cursor-pointer transition-all"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 rounded-full bg-[#39FF14]/10 flex items-center justify-center text-[#39FF14] text-xs font-bold">
                                {lead.name[0]}
                              </div>
                              <p className="text-sm font-medium text-white truncate">{lead.name}</p>
                            </div>
                            <p className="text-xs text-gray-500 mb-2 truncate">{lead.product_interest}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">{lead.quantity} unit{lead.quantity > 1 ? "s" : ""}</span>
                              <span className={`text-xs font-bold ${lead.score >= 80 ? "text-[#39FF14]" : "text-gray-500"}`}>
                                {lead.score}
                              </span>
                            </div>
                          </div>
                        ))}
                        {stageLeads.length === 0 && (
                          <div className="rounded-xl border border-dashed border-white/10 py-6 text-center">
                            <p className="text-xs text-gray-600">No leads</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* LEAD DETAIL PANEL */}
          {selectedLead && (
            <div className="glass rounded-xl border border-white/5 overflow-auto">
              <div className="sticky top-0 bg-[#111]/90 backdrop-blur-sm px-5 py-4 border-b border-white/5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white text-sm">{selectedLead.name}</p>
                  <p className="text-xs text-gray-500">Lead #{selectedLead.id.substring(0, 8).toUpperCase()}</p>
                </div>
                <button
                  onClick={() => setSelectedLead(null)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {/* Score */}
                <div className="rounded-xl border border-[#39FF14]/20 bg-[#39FF14]/5 p-4 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full border-2 border-[#39FF14] flex flex-col items-center justify-center shrink-0">
                    <span className="font-orbitron font-black text-xl text-[#39FF14] leading-none">{selectedLead.score}</span>
                    <span className="text-[8px] text-gray-500 tracking-wider">SCORE</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#39FF14]">
                      {selectedLead.score >= 80 ? "🔥 High Priority" : selectedLead.score >= 60 ? "⚡ Warm Lead" : "📋 Standard"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Source: {selectedLead.source} ·{" "}
                      {new Date(selectedLead.created_at).toLocaleDateString("en-PH")}
                    </p>
                  </div>
                </div>

                {/* Status Update */}
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-widest mb-3 font-medium">Update Pipeline Status</p>
                  <div className="grid grid-cols-2 gap-2">
                    {PIPELINE_STAGES.map((stage) => {
                      const cfg = STATUS_CONFIG[stage];
                      const isActive = selectedLead.status === stage;
                      const isUpdating = updatingStatus === selectedLead.id;
                      return (
                        <button
                          key={stage}
                          onClick={() => !isActive && updateLeadStatus(selectedLead.id, stage)}
                          disabled={isActive || !!updatingStatus}
                          className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 ${
                            isActive
                              ? `${cfg.bg} ${cfg.color} border-current`
                              : "border-white/8 text-gray-500 hover:border-white/20 hover:text-white bg-white/2"
                          }`}
                        >
                          {isUpdating && isActive ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? cfg.dot : "bg-gray-600"}`} />
                          )}
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Contact Info */}
                <div className="rounded-xl border border-white/8 overflow-hidden">
                  <div className="px-4 py-2.5 bg-white/3 border-b border-white/8">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest">Contact</p>
                  </div>
                  <div className="divide-y divide-white/5">
                    <a href={`mailto:${selectedLead.email}`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-colors">
                      <Mail className="w-4 h-4 text-[#39FF14] shrink-0" />
                      <span className="text-sm text-gray-300 truncate">{selectedLead.email}</span>
                    </a>
                    <a href={`tel:${selectedLead.mobile}`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-colors">
                      <Phone className="w-4 h-4 text-[#39FF14] shrink-0" />
                      <span className="text-sm text-gray-300">{selectedLead.mobile}</span>
                    </a>
                    {selectedLead.company && (
                      <div className="flex items-center gap-3 px-4 py-3">
                        <Building2 className="w-4 h-4 text-[#39FF14] shrink-0" />
                        <span className="text-sm text-gray-300">{selectedLead.company}</span>
                      </div>
                    )}
                    {selectedLead.follow_up_date && (
                      <div className="flex items-center gap-3 px-4 py-3">
                        <Calendar className="w-4 h-4 text-[#39FF14] shrink-0" />
                        <span className="text-sm text-gray-300">Follow up: {selectedLead.follow_up_date}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quote Details */}
                <div className="rounded-xl border border-white/8 overflow-hidden">
                  <div className="px-4 py-2.5 bg-white/3 border-b border-white/8">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest">Quote Details</p>
                  </div>
                  <div className="grid grid-cols-2 gap-px bg-white/5">
                    {[
                      { label: "Model", value: selectedLead.product_interest },
                      { label: "Quantity", value: `${selectedLead.quantity} unit${selectedLead.quantity > 1 ? "s" : ""}` },
                      { label: "Use Type", value: selectedLead.use_type },
                      { label: "Budget", value: selectedLead.budget || "—" },
                      { label: "Contact Via", value: selectedLead.contact_method },
                      { label: "Assigned To", value: selectedLead.assigned_to || "Unassigned" },
                    ].map((item) => (
                      <div key={item.label} className="bg-[#0D0D0D] px-3 py-2.5">
                        <p className="text-[10px] text-gray-600 uppercase tracking-wide mb-0.5">{item.label}</p>
                        <p className="text-xs text-gray-200 font-medium truncate">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                {selectedLead.notes && (
                  <div className="rounded-xl border border-white/8 p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-2 font-medium">Notes</p>
                    <p className="text-sm text-gray-300 leading-relaxed italic">"{selectedLead.notes}"</p>
                  </div>
                )}

                {/* Timestamps */}
                <div className="text-xs text-gray-600 space-y-1">
                  <p>Created: {new Date(selectedLead.created_at).toLocaleString("en-PH")}</p>
                  <p>Updated: {new Date(selectedLead.updated_at).toLocaleString("en-PH")}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
