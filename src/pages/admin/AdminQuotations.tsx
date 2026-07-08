import { useState, useEffect, useCallback } from "react";
import {
  FileText, Loader2, AlertCircle, RefreshCw, ChevronDown, ChevronUp,
  CheckCircle, Clock, Send, Search, DollarSign, Calendar,
  MessageSquare, User, Bike, Hash, X, Save, Bell, Download
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";

interface Quotation {
  id: string;
  customer_id: string;
  lead_id: string | null;
  product_name: string;
  quantity: number;
  use_type: string;
  budget: string | null;
  contact_method: string;
  notes: string | null;
  status: string;
  assigned_sales: string | null;
  sales_notes: string | null;
  estimated_price: number | null;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:      { label: "Pending Review", color: "text-yellow-400",  bg: "bg-yellow-500/15", border: "border-yellow-500/30" },
  reviewing:    { label: "Under Review",   color: "text-blue-400",    bg: "bg-blue-500/15",   border: "border-blue-500/30" },
  proposal_sent:{ label: "Proposal Sent",  color: "text-purple-400",  bg: "bg-purple-500/15", border: "border-purple-500/30" },
  approved:     { label: "Approved",        color: "text-[#39FF14]",   bg: "bg-[#39FF14]/15",  border: "border-[#39FF14]/30" },
  rejected:     { label: "Rejected",        color: "text-red-400",     bg: "bg-red-500/15",    border: "border-red-500/30" },
};

const STATUS_ORDER = ["pending", "reviewing", "proposal_sent", "approved", "rejected"];

export default function AdminQuotations() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    status: string;
    estimated_price: string;
    valid_until: string;
    assigned_sales: string;
    sales_notes: string;
  }>({ status: "", estimated_price: "", valid_until: "", assigned_sales: "", sales_notes: "" });
  const [saving, setSaving] = useState(false);

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await apiClient.get("/quotations.php");
    if (err) setError(err.message);
    else {
      const mapped = (data && data.quotations || []).map((q: any) => ({
        ...q,
        id: String(q.id),
        estimated_price: q.quoted_price !== null ? Number(q.quoted_price) : null,
      }));
      setQuotations(mapped);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchQuotations();
    const interval = setInterval(fetchQuotations, 30000);
    return () => clearInterval(interval);
  }, [fetchQuotations]);

  const filtered = quotations.filter((q) => {
    const matchStatus = filterStatus === "all" || q.status === filterStatus;
    const matchSearch = !search ||
      q.product_name.toLowerCase().includes(search.toLowerCase()) ||
      (q.notes || "").toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const openEditor = (q: Quotation) => {
    setEditingId(q.id);
    setEditForm({
      status: q.status,
      estimated_price: q.estimated_price ? String(q.estimated_price) : "",
      valid_until: q.valid_until || "",
      assigned_sales: q.assigned_sales || "",
      sales_notes: q.sales_notes || "",
    });
  };

  const handleSave = async () => {
    if (!editingId) return;
    setSaving(true);

    const { error } = await apiClient.put(`/quotations.php?id=${editingId}`, {
      status: editForm.status,
      quoted_price: editForm.estimated_price ? parseFloat(editForm.estimated_price) : null,
      valid_until: editForm.valid_until || null,
      assigned_sales: editForm.assigned_sales || null,
      sales_notes: editForm.sales_notes || null,
    });

    if (error) {
      toast.error("Update failed: " + error.message);
      setSaving(false);
      return;
    }

    toast.success("Quotation updated successfully.");
    setEditingId(null);
    fetchQuotations();
    setSaving(false);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });

  // Summary counts
  const counts = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = quotations.filter((q) => q.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-orbitron font-bold text-2xl text-white">Quotations Management</h1>
          <p className="text-gray-500 text-sm mt-1">{quotations.length} total · {counts.pending || 0} pending review</p>
        </div>
        <button
          onClick={fetchQuotations}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 glass rounded-xl border border-white/10 text-gray-400 hover:text-white text-xs font-semibold transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Status Pipeline Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
        {STATUS_ORDER.map((s) => {
          const cfg = STATUS_CONFIG[s];
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(filterStatus === s ? "all" : s)}
              className={`glass rounded-xl p-4 border text-left transition-all ${filterStatus === s ? cfg.border + " " + cfg.bg : "border-white/5 hover:border-white/10"}`}
            >
              <p className={`font-orbitron font-bold text-2xl mb-1 ${cfg.color}`}>{counts[s] || 0}</p>
              <p className="text-xs text-gray-500">{cfg.label}</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by product or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#39FF14]/30 transition-all"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#39FF14]/30"
        >
          <option value="all">All Statuses</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-[#39FF14] animate-spin" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center py-16 gap-3">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-gray-400 text-sm">{error}</p>
          <button onClick={fetchQuotations} className="btn-outline text-xs">Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500">No quotations found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => {
            const cfg = STATUS_CONFIG[q.status] || STATUS_CONFIG["pending"];
            const isExpanded = expandedId === q.id;
            const isEditing = editingId === q.id;

            return (
              <div key={q.id} className={`glass rounded-xl border transition-all ${isExpanded ? "border-white/15" : "border-white/5 hover:border-white/10"}`}>
                {/* Row header */}
                <div className="flex items-center gap-4 p-5">
                  <div className="w-10 h-10 rounded-xl bg-[#39FF14]/10 border border-[#39FF14]/20 flex items-center justify-center shrink-0">
                    <Bike className="w-5 h-5 text-[#39FF14]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                        {cfg.label}
                      </span>
                      <span className="text-xs text-gray-600">#{q.id.slice(0, 8)}</span>
                    </div>
                    <p className="font-semibold text-white text-sm">{q.product_name}</p>
                    <div className="flex gap-4 mt-0.5 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Hash className="w-3 h-3" />{q.quantity} unit{q.quantity > 1 ? "s" : ""}</span>
                      <span className="capitalize">{q.use_type}</span>
                      {q.estimated_price && (
                        <span className="text-[#39FF14] font-semibold">₱{q.estimated_price.toLocaleString()}</span>
                      )}
                      <span>{formatDate(q.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openEditor(q)}
                      className="p-2 glass rounded-lg border border-white/10 text-gray-400 hover:text-[#39FF14] hover:border-[#39FF14]/30 transition-all"
                      title="Edit quotation"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : q.id)}
                      className="p-2 glass rounded-lg border border-white/10 text-gray-400 hover:text-white transition-all"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-white/5 pt-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                      {[
                        { label: "Budget", value: q.budget || "—" },
                        { label: "Contact Via", value: q.contact_method },
                        { label: "Valid Until", value: q.valid_until ? formatDate(q.valid_until) : "—" },
                        { label: "Assigned Sales", value: q.assigned_sales || "Unassigned" },
                      ].map((item) => (
                        <div key={item.label} className="bg-white/2 rounded-lg px-3 py-2.5">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">{item.label}</p>
                          <p className="text-xs text-white font-medium">{item.value}</p>
                        </div>
                      ))}
                    </div>
                    {q.notes && (
                      <div className="p-3 rounded-lg bg-white/2 border border-white/5 mb-3">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Customer Notes</p>
                        <p className="text-sm text-gray-300 italic">"{q.notes}"</p>
                      </div>
                    )}
                    {q.sales_notes && (
                      <div className="p-3 rounded-lg bg-[#39FF14]/5 border border-[#39FF14]/15">
                        <p className="text-[10px] text-[#39FF14] uppercase tracking-wide mb-1 font-semibold">Sales Notes (visible to customer)</p>
                        <p className="text-sm text-gray-300">{q.sales_notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Inline editor */}
                {isEditing && (
                  <div className="px-5 pb-5 border-t border-white/5 pt-5">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs text-[#39FF14] font-semibold uppercase tracking-widest">Update Quotation</p>
                      <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-white">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Status</label>
                        <select
                          value={editForm.status}
                          onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                          className="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#39FF14]/50"
                        >
                          {STATUS_ORDER.map((s) => (
                            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                          <DollarSign className="w-3 h-3" /> Estimated Price (PHP)
                        </label>
                        <input
                          type="number"
                          value={editForm.estimated_price}
                          onChange={(e) => setEditForm({ ...editForm, estimated_price: e.target.value })}
                          placeholder="e.g. 285000"
                          className="w-full bg-white/4 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#39FF14]/50 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                          <Calendar className="w-3 h-3" /> Quote Valid Until
                        </label>
                        <input
                          type="date"
                          value={editForm.valid_until}
                          onChange={(e) => setEditForm({ ...editForm, valid_until: e.target.value })}
                          className="w-full bg-white/4 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#39FF14]/50 transition-all"
                          style={{ colorScheme: "dark" }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                          <User className="w-3 h-3" /> Assigned Sales Rep
                        </label>
                        <input
                          type="text"
                          value={editForm.assigned_sales}
                          onChange={(e) => setEditForm({ ...editForm, assigned_sales: e.target.value })}
                          placeholder="e.g. Maria Santos"
                          className="w-full bg-white/4 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#39FF14]/50 transition-all"
                        />
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                        <MessageSquare className="w-3 h-3" /> Sales Notes <span className="text-[#39FF14]">(visible to customer in their dashboard)</span>
                      </label>
                      <textarea
                        value={editForm.sales_notes}
                        onChange={(e) => setEditForm({ ...editForm, sales_notes: e.target.value })}
                        placeholder="e.g. Proposal attached. Price includes free delivery and 1-year service plan..."
                        rows={3}
                        className="w-full bg-white/4 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#39FF14]/50 resize-none transition-all"
                      />
                    </div>
                    <div className="flex gap-3 justify-end items-center">
                      <button
                        onClick={() => {
                          const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>TRIP Admin Quotation #${editingId?.slice(0,8).toUpperCase()}</title><style>body{background:#0A0A0A;color:#F5F5F5;font-family:'Helvetica Neue',Arial,sans-serif;margin:0;padding:40px}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}</style></head><body><div style="text-align:center;margin-bottom:32px;padding-bottom:24px;border-bottom:1px solid rgba(255,255,255,0.1)"><div style="display:inline-block;background:rgba(57,255,20,0.08);border:1px solid rgba(57,255,20,0.25);border-radius:12px;padding:10px 24px;margin-bottom:16px"><span style="color:#39FF14;font-size:22px;font-weight:900;letter-spacing:4px">⚡ TRIP MOBILITY</span></div><h1 style="color:#FFF;font-size:20px;margin:8px 0 4px">Admin Quotation Summary</h1><p style="color:#6B7280;font-size:13px;margin:0">Ref: #${editingId?.slice(0,8).toUpperCase()} · ${new Date().toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'})}</p></div>${editForm.estimated_price ? `<div style="background:#111;border:1px solid rgba(57,255,20,0.2);border-radius:16px;padding:24px;margin-bottom:20px;text-align:center"><p style="color:#9CA3AF;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px">Estimated Price</p><p style="color:#39FF14;font-size:40px;font-weight:900;margin:0;font-family:monospace">₱${parseFloat(editForm.estimated_price).toLocaleString()}</p>${editForm.valid_until ? `<p style="color:#6B7280;font-size:12px;margin:8px 0 0">Valid until ${editForm.valid_until}</p>` : ''}</div>` : ''}<div style="background:#111;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px;margin-bottom:20px"><h2 style="color:#39FF14;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 16px">Quotation Details</h2><table style="width:100%;border-collapse:collapse">${[['Status',editForm.status.replace(/_/g,' ').replace(/\b\w/g,(c)=>c.toUpperCase())],['Assigned Sales',editForm.assigned_sales||'Not assigned'],['Valid Until',editForm.valid_until||'Not set']].map(([l,v])=>`<tr><td style="padding:8px 12px;color:#9CA3AF;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.05)">${l}</td><td style="padding:8px 12px;color:#F5F5F5;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.05)">${v}</td></tr>`).join('')}</table></div>${editForm.sales_notes ? `<div style="background:#111;border:1px solid rgba(57,255,20,0.15);border-radius:16px;padding:20px 24px;margin-bottom:20px"><h2 style="color:#39FF14;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 12px">Sales Notes</h2><p style="color:#D1D5DB;font-size:14px;line-height:1.7;font-style:italic">&ldquo;${editForm.sales_notes}&rdquo;</p></div>` : ''}<div style="text-align:center;margin-top:32px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.08)"><p style="color:#6B7280;font-size:12px">TRIP Mobility · Internal Document · Customer Portal: tripmobility.ph/my-quotes</p></div></body></html>`;
                          const w = window.open('','_blank'); if(w){w.document.write(html);w.document.close();setTimeout(()=>w.print(),500);}
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 glass rounded-lg border border-white/10 text-xs text-gray-400 hover:text-white transition-all"
                      >
                        <Download className="w-3.5 h-3.5" />PDF
                      </button>
                      <button onClick={() => setEditingId(null)} className="btn-outline text-xs px-4 py-2">Cancel</button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="btn-primary flex items-center gap-2 text-xs px-5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {saving ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
