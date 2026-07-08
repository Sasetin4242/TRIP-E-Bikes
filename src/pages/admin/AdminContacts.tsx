import { useState, useEffect, useCallback } from "react";
import {
  MessageSquare, Loader2, AlertCircle, RefreshCw, Search,
  Mail, Phone, Tag, Clock, CheckCircle, Reply, User, X,
  Square, CheckSquare, Trash2, StickyNote
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  inquiry_type: string;
  message: string;
  status: string;
  created_at: string;
}

const INQUIRY_COLORS: Record<string, string> = {
  "General": "bg-gray-500/20 text-gray-300 border-gray-500/30",
  "Product Inquiry": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "Fleet / Business": "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "Financing": "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  "Service / Repair": "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "Partnership": "bg-[#39FF14]/20 text-[#39FF14] border-[#39FF14]/30",
  "Press / Media": "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  unread:  { label: "Unread",  color: "text-yellow-400",  bg: "bg-yellow-500/15",  border: "border-yellow-500/30", icon: Clock },
  read:    { label: "Read",    color: "text-blue-400",    bg: "bg-blue-500/15",    border: "border-blue-500/30",   icon: CheckCircle },
  replied: { label: "Replied", color: "text-[#39FF14]",  bg: "bg-[#39FF14]/15",  border: "border-[#39FF14]/30",  icon: Reply },
};

const STATUS_ORDER = ["unread", "read", "replied"];

export default function AdminContacts() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState("");

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await apiClient.get("/contacts.php");
    if (err) setError(err.message);
    else setMessages(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 30000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    const { error } = await apiClient.put(`/contacts.php?id=${id}`, { status: newStatus });
    if (error) {
      toast.error("Update failed: " + error.message);
    } else {
      toast.success(`Marked as ${STATUS_CONFIG[newStatus]?.label}`);
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: newStatus } : m))
      );
      if (selected?.id === id) setSelected((s) => s ? { ...s, status: newStatus } : null);
    }
    setUpdatingId(null);
  };

  // Bulk actions
  const handleBulkAction = async (action: string) => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    let updateData: Record<string, any> = {};
    if (action === "read") updateData = { status: "read" };
    else if (action === "replied") updateData = { status: "replied", reply_count: 1 };
    else if (action === "unread") updateData = { status: "unread" };

    for (const id of ids) {
      await apiClient.put(`/contacts.php?id=${id}`, updateData);
    }
    toast.success(`${ids.length} message${ids.length > 1 ? "s" : ""} updated.`);
    setSelectedIds(new Set());
    fetchMessages();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(m => m.id)));
  };

  const saveNotes = async (id: string) => {
    const { error } = await apiClient.put(`/contacts.php?id=${id}`, { internal_notes: notesValue });
    if (!error) {
      toast.success("Notes saved.");
      setMessages(prev => prev.map(m => m.id === id ? { ...m, internal_notes: notesValue } : m));
      if (selected?.id === id) setSelected(s => s ? { ...s, internal_notes: notesValue } as any : null);
    }
    setEditingNotes(null);
  };

  const handleReply = (msg: ContactMessage) => {
    const subject = encodeURIComponent(`Re: Your TRIP Mobility Inquiry — ${msg.inquiry_type}`);
    const body = encodeURIComponent(
      `Hi ${msg.name},\n\nThank you for reaching out to TRIP Mobility!\n\nRegarding your inquiry: "${msg.message}"\n\n`
    );
    window.open(`mailto:${msg.email}?subject=${subject}&body=${body}`, "_blank");
    // Auto-mark as replied
    if (msg.status !== "replied") updateStatus(msg.id, "replied");
  };

  const filtered = messages.filter((m) => {
    const matchStatus = filterStatus === "all" || m.status === filterStatus;
    const matchType = filterType === "all" || m.inquiry_type === filterType;
    const matchSearch = !search ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      m.message.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchType && matchSearch;
  });

  const counts = {
    unread: messages.filter((m) => m.status === "unread").length,
    read: messages.filter((m) => m.status === "read").length,
    replied: messages.filter((m) => m.status === "replied").length,
  };

  const inquiryTypes = Array.from(new Set(messages.map((m) => m.inquiry_type)));

  const getLastRepliedLabel = (msg: any) => {
    if (!msg.last_replied_at) return null;
    const d = new Date(msg.last_replied_at);
    const days = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (days === 0) return "Replied today";
    if (days === 1) return "Replied yesterday";
    return `Last replied ${days}d ago`;
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const formatDateShort = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHrs = diffMs / (1000 * 60 * 60);
    if (diffHrs < 1) return `${Math.floor(diffMs / 60000)}m ago`;
    if (diffHrs < 24) return `${Math.floor(diffHrs)}h ago`;
    return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-orbitron font-bold text-2xl text-white">Contact Messages</h1>
          <p className="text-gray-500 text-sm mt-1">
            {messages.length} total · {counts.unread} unread
          </p>
        </div>
        <button
          onClick={fetchMessages}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 glass rounded-xl border border-white/10 text-gray-400 hover:text-white text-xs font-semibold transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {STATUS_ORDER.map((s) => {
          const cfg = STATUS_CONFIG[s];
          const StatusIcon = cfg.icon;
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(filterStatus === s ? "all" : s)}
              className={`glass rounded-xl p-5 border text-left transition-all ${filterStatus === s ? `${cfg.border} ${cfg.bg}` : "border-white/5 hover:border-white/10"}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <StatusIcon className={`w-4 h-4 ${cfg.color}`} />
                <p className={`text-xs font-semibold uppercase tracking-wide ${cfg.color}`}>{cfg.label}</p>
              </div>
              <p className={`font-orbitron font-bold text-3xl ${cfg.color}`}>{counts[s as keyof typeof counts] || 0}</p>
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
            placeholder="Search by name, email, or message..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#39FF14]/30 transition-all"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#39FF14]/30"
        >
          <option value="all">All Inquiry Types</option>
          {inquiryTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
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

      {/* Content */}
      {loading && messages.length === 0 ? (
        <div className="flex items-center justify-center py-16 gap-3">
          <Loader2 className="w-8 h-8 text-[#39FF14] animate-spin" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center py-16 gap-3">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-gray-400 text-sm">{error}</p>
          <button onClick={fetchMessages} className="btn-outline text-xs">Retry</button>
        </div>
      ) : (
        /* Bulk Actions Bar */
        selectedIds.size > 0 && (
          <div className="flex items-center gap-3 mb-4 px-4 py-3 glass rounded-xl border border-[#39FF14]/20 bg-[#39FF14]/5">
            <p className="text-sm text-[#39FF14] font-semibold">{selectedIds.size} selected</p>
            <div className="flex gap-2 ml-auto">
              {[{a:"read",l:"Mark Read"},{a:"replied",l:"Mark Replied"},{a:"unread",l:"Mark Unread"}].map(({a,l}) => (
                <button key={a} onClick={() => handleBulkAction(a)} className="px-3 py-1.5 text-xs font-semibold glass rounded-lg border border-white/15 text-gray-300 hover:text-white transition-all">{l}</button>
              ))}
              <button onClick={() => setSelectedIds(new Set())} className="p-1.5 text-gray-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
            </div>
          </div>
        )
      )}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <MessageSquare className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500">No messages found.</p>
        </div>
      ) : (
        <div className={`gap-6 ${selected ? "grid grid-cols-1 lg:grid-cols-3" : ""} mt-2`}>
          {/* Message List */}
          <div className={`${selected ? "lg:col-span-2" : ""} space-y-3`}>
            {filtered.map((msg) => {
              const cfg = STATUS_CONFIG[msg.status] || STATUS_CONFIG.unread;
              const StatusIcon = cfg.icon;
              const inquiryColor = INQUIRY_COLORS[msg.inquiry_type] || "bg-gray-500/20 text-gray-300 border-gray-500/30";
              const isSelected = selected?.id === msg.id;

              return (
                <div
                  key={msg.id}
                  onClick={() => {
                    setSelected(isSelected ? null : msg);
                    if (!isSelected && msg.status === "unread") updateStatus(msg.id, "read");
                  }}
                  onContextMenu={e => { e.preventDefault(); toggleSelect(msg.id); }}
                  className={`glass rounded-xl border p-5 cursor-pointer transition-all ${
                    isSelected ? "border-[#39FF14]/30 bg-[#39FF14]/3" : "border-white/5 hover:border-white/10"
                  } ${msg.status === "unread" ? "border-l-2 border-l-yellow-500/60" : ""}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <div className="shrink-0" onClick={e => { e.stopPropagation(); toggleSelect(msg.id); }}>
                      {selectedIds.has(msg.id) ? <CheckSquare className="w-4 h-4 text-[#39FF14]" /> : <Square className="w-4 h-4 text-gray-600 hover:text-gray-400 transition-colors" />}
                    </div>
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-white/8 border border-white/10 flex items-center justify-center shrink-0 font-bold text-white text-sm">
                      {msg.name[0].toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-white text-sm">{msg.name}</p>
                          {msg.status === "unread" && (
                            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${inquiryColor}`}>
                            {msg.inquiry_type}
                          </span>
                          <span className="text-[10px] text-gray-600">{formatDateShort(msg.created_at)}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{msg.email}{msg.phone ? ` · ${msg.phone}` : ""}</p>
                      <p className="text-sm text-gray-300 line-clamp-2 leading-relaxed">{msg.message}</p>
                      {(msg as any).reply_count > 0 && (msg as any).last_replied_at && (
                        <p className="text-[10px] text-[#39FF14]/70 mt-1">{getLastRepliedLabel(msg)}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detail Panel */}
          {selected && (() => {
            const cfg = STATUS_CONFIG[selected.status] || STATUS_CONFIG.unread;
            const StatusIcon = cfg.icon;
            const nextStatuses = STATUS_ORDER.filter((s) => s !== selected.status);

            return (
              <div className="glass rounded-xl border border-white/8 overflow-hidden h-fit sticky top-24">
                {/* Panel header */}
                <div className="px-5 py-4 border-b border-white/5 bg-white/2 flex items-center justify-between">
                  <p className="font-semibold text-white text-sm">Message Detail</p>
                  <button
                    onClick={() => setSelected(null)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-white border border-white/10 transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-5 space-y-5">
                  {/* Contact Info */}
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-white/8 border border-white/10 flex items-center justify-center font-bold text-white text-lg">
                        {selected.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{selected.name}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${INQUIRY_COLORS[selected.inquiry_type] || "bg-gray-500/20 text-gray-300 border-gray-500/30"}`}>
                          {selected.inquiry_type}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Mail className="w-3.5 h-3.5 text-[#39FF14] shrink-0" />
                        <a href={`mailto:${selected.email}`} className="hover:text-white transition-colors truncate">{selected.email}</a>
                      </div>
                      {selected.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Phone className="w-3.5 h-3.5 text-[#39FF14] shrink-0" />
                          <a href={`tel:${selected.phone}`} className="hover:text-white transition-colors">{selected.phone}</a>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Clock className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                        <span className="text-xs">{formatDate(selected.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Message */}
                  <div className="rounded-xl border border-white/8 p-4 bg-white/2">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">Message</p>
                    <p className="text-sm text-gray-300 leading-relaxed">{selected.message}</p>
                  </div>

                  {/* Status badge */}
                  <div className={`rounded-xl border p-3 flex items-center gap-3 ${cfg.bg} ${cfg.border}`}>
                    <StatusIcon className={`w-4 h-4 ${cfg.color}`} />
                    <p className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</p>
                    <p className="text-xs text-gray-500 ml-auto">Current status</p>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <button
                      onClick={() => handleReply(selected)}
                      className="w-full btn-primary flex items-center justify-center gap-2 text-sm"
                    >
                      <Reply className="w-4 h-4" />
                      Reply via Email
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      {nextStatuses.map((s) => {
                        const c = STATUS_CONFIG[s];
                        return (
                          <button
                            key={s}
                            onClick={() => updateStatus(selected.id, s)}
                            disabled={updatingId === selected.id}
                            className={`py-2.5 rounded-xl border text-xs font-semibold transition-all ${c.bg} ${c.border} ${c.color} hover:opacity-80 disabled:opacity-50`}
                          >
                            Mark {c.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <p className="text-[10px] text-gray-700 text-center">
                    Ref: #{selected.id.substring(0, 8).toUpperCase()}
                  </p>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
