import { useState, useEffect, useCallback } from "react";
import {
  Calendar, Clock, User, Phone, Mail, Wrench, MapPin,
  CheckCircle, Loader2, RefreshCw, Search, Filter,
  ChevronLeft, ChevronRight, X, Save, AlertCircle,
  Bike, Package, Plus, FileText, Star
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { CustomSelect } from "@/components/ui/custom-select";

interface Appointment {
  id: string;
  name: string;
  email: string;
  phone: string;
  service_center: string;
  service_type: string;
  preferred_date: string;
  preferred_time: string;
  bike_model: string | null;
  issue_description: string | null;
  status: string;
  notes: string | null;
  technician: string | null;
  parts_used: { name: string; qty: number; cost: number }[];
  confirmation_sent: boolean;
  estimated_cost: number | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  pending:     { label: "Pending",     color: "text-yellow-400",  bg: "bg-yellow-500/15",  border: "border-yellow-500/30",  dot: "bg-yellow-400" },
  confirmed:   { label: "Confirmed",   color: "text-blue-400",    bg: "bg-blue-500/15",    border: "border-blue-500/30",    dot: "bg-blue-400" },
  "in-progress": { label: "In Progress", color: "text-orange-400",  bg: "bg-orange-500/15",  border: "border-orange-500/30",  dot: "bg-orange-400" },
  completed:   { label: "Completed",   color: "text-[#39FF14]",   bg: "bg-[#39FF14]/15",   border: "border-[#39FF14]/30",   dot: "bg-[#39FF14]" },
  cancelled:   { label: "Cancelled",   color: "text-red-400",     bg: "bg-red-500/15",     border: "border-red-500/30",     dot: "bg-red-400" },
};

const SERVICE_CENTERS = [
  "Mandaluyong City", "Quezon City", "Cebu City", "Davao City", "Iloilo City", "Pampanga"
];

const TECHNICIANS = [
  "Marco Santos", "Jessa Reyes", "Carlo Delos Santos", "Maria Cruz", "Kevin Tan", "Ana Villanueva"
];

const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([value, cfg]) => ({
  value, label: cfg.label, color: cfg.dot.replace("bg-", "#").replace("[", "").replace("]", "")
}));

const CENTER_OPTIONS = [{ value: "all", label: "All Centers" }, ...SERVICE_CENTERS.map(c => ({ value: c, label: c }))];
const STATUS_FILTER_OPTIONS = [{ value: "all", label: "All Statuses" }, ...STATUS_OPTIONS];

const inp = "w-full border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#39FF14]/50 transition-all";
const INP_STYLE = { style: { background: "#1A1A1A" } };

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCenter, setFilterCenter] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [editForm, setEditForm] = useState<{
    status: string;
    technician: string;
    notes: string;
    estimated_cost: string;
    parts_used: { name: string; qty: number; cost: number }[];
  }>({ status: "", technician: "", notes: "", estimated_cost: "", parts_used: [] });

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    const { data, error } = await apiClient.get("/appointments.php");
    if (!error) setAppointments(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const openDetail = (apt: Appointment) => {
    setSelected(apt);
    setEditForm({
      status: apt.status,
      technician: apt.technician || "",
      notes: apt.notes || "",
      estimated_cost: apt.estimated_cost?.toString() || "",
      parts_used: apt.parts_used || [],
    });
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    const payload = {
      status: editForm.status,
      notes: editForm.notes,
    };
    const { error } = await apiClient.put(`/appointments.php?id=${selected.id}`, payload);
    if (error) { toast.error(error.message); }
    else {
      toast.success("Appointment updated!");
      fetchAppointments();
      setSelected(prev => prev ? { ...prev, ...payload } : null);
    }
    setSaving(false);
  };

  const sendConfirmation = async (apt: Appointment) => {
    await apiClient.put(`/appointments.php?id=${apt.id}`, { confirmation_sent: true });
    fetchAppointments();
  };

  const addPart = () => setEditForm(f => ({ ...f, parts_used: [...f.parts_used, { name: "", qty: 1, cost: 0 }] }));
  const removePart = (i: number) => setEditForm(f => ({ ...f, parts_used: f.parts_used.filter((_, j) => j !== i) }));
  const updatePart = (i: number, field: string, val: any) => {
    setEditForm(f => {
      const parts = [...f.parts_used];
      parts[i] = { ...parts[i], [field]: val };
      return { ...f, parts_used: parts };
    });
  };

  // Calendar helpers
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  const getAptsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return appointments.filter(a => a.preferred_date === dateStr);
  };

  const filtered = appointments.filter(a => {
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase()) || a.service_type.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || a.status === filterStatus;
    const matchCenter = filterCenter === "all" || a.service_center === filterCenter;
    const matchDate = !filterDate || a.preferred_date === filterDate;
    return matchSearch && matchStatus && matchCenter && matchDate;
  });

  const stats = {
    total: appointments.length,
    pending: appointments.filter(a => a.status === "pending").length,
    confirmed: appointments.filter(a => a.status === "confirmed").length,
    inProgress: appointments.filter(a => a.status === "in-progress").length,
    completed: appointments.filter(a => a.status === "completed").length,
  };

  const formatDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-orbitron font-bold text-2xl text-white">Service Appointments</h1>
          <p className="text-gray-500 text-sm mt-1">{appointments.length} total · {stats.pending} pending confirmation</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 glass rounded-xl border border-white/10 p-1">
            <button onClick={() => setViewMode("list")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === "list" ? "bg-[#39FF14]/20 text-[#39FF14]" : "text-gray-500"}`}><FileText className="w-3.5 h-3.5" />List</button>
            <button onClick={() => setViewMode("calendar")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === "calendar" ? "bg-[#39FF14]/20 text-[#39FF14]" : "text-gray-500"}`}><Calendar className="w-3.5 h-3.5" />Calendar</button>
          </div>
          <button onClick={fetchAppointments} disabled={loading} className="flex items-center gap-2 px-4 py-2.5 glass rounded-xl border border-white/10 text-gray-400 hover:text-white text-xs font-semibold transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />Refresh
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        {[
          { label: "Total", value: stats.total, color: "text-white" },
          { label: "Pending", value: stats.pending, color: "text-yellow-400" },
          { label: "Confirmed", value: stats.confirmed, color: "text-blue-400" },
          { label: "In Progress", value: stats.inProgress, color: "text-orange-400" },
          { label: "Completed", value: stats.completed, color: "text-[#39FF14]" },
        ].map(s => (
          <div key={s.label} className="glass rounded-xl p-4 border border-white/5 text-center">
            <p className={`font-orbitron font-bold text-2xl ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, service type..." className="w-full border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#39FF14]/30 transition-all" style={{ background: "#111" }} />
        </div>
        <CustomSelect value={filterStatus} onChange={setFilterStatus} options={STATUS_FILTER_OPTIONS} size="sm" className="w-44" />
        <CustomSelect value={filterCenter} onChange={setFilterCenter} options={CENTER_OPTIONS} size="sm" className="w-48" />
        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#39FF14]/30 transition-all" style={{ background: "#111" }} />
        {(filterDate || filterStatus !== "all" || filterCenter !== "all" || search) && (
          <button onClick={() => { setFilterDate(""); setFilterStatus("all"); setFilterCenter("all"); setSearch(""); }} className="px-4 py-2.5 glass rounded-xl border border-white/10 text-xs text-gray-400 hover:text-white transition-all flex items-center gap-2">
            <X className="w-3.5 h-3.5" />Clear
          </button>
        )}
      </div>

      {viewMode === "calendar" ? (
        /* ── Calendar View ── */
        <div className="glass rounded-2xl border border-white/8 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
            <button onClick={() => setCalendarDate(new Date(year, month - 1, 1))} className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="font-orbitron font-bold text-lg text-white">{MONTHS[month]} {year}</h3>
            <button onClick={() => setCalendarDate(new Date(year, month + 1, 1))} className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map(d => <div key={d} className="text-center text-xs text-gray-500 font-semibold py-2">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const dayApts = getAptsForDay(day);
                const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
                return (
                  <div key={day} className={`min-h-20 rounded-xl p-2 border transition-all ${isToday ? "border-[#39FF14]/40 bg-[#39FF14]/5" : "border-white/5 hover:border-white/10 bg-white/2"}`}>
                    <p className={`text-xs font-bold mb-1 ${isToday ? "text-[#39FF14]" : "text-gray-400"}`}>{day}</p>
                    <div className="space-y-1">
                      {dayApts.slice(0, 3).map(a => {
                        const cfg = STATUS_CONFIG[a.status] || STATUS_CONFIG.pending;
                        return (
                          <div key={a.id} onClick={() => openDetail(a)} className={`text-[10px] px-1.5 py-1 rounded cursor-pointer truncate ${cfg.bg} ${cfg.color} border ${cfg.border} hover:opacity-80 transition-all`}>
                            {a.preferred_time} {a.name}
                          </div>
                        );
                      })}
                      {dayApts.length > 3 && <p className="text-[10px] text-gray-500">+{dayApts.length - 3} more</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-[#39FF14] animate-spin" /></div>
      ) : (
        <div className={selected ? "grid grid-cols-1 lg:grid-cols-3 gap-6" : ""}>
          {/* List */}
          <div className={`${selected ? "lg:col-span-2" : ""} space-y-3`}>
            {filtered.length === 0 ? (
              <div className="text-center py-16">
                <Calendar className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500">No appointments found.</p>
              </div>
            ) : filtered.map(apt => {
              const cfg = STATUS_CONFIG[apt.status] || STATUS_CONFIG.pending;
              return (
                <div key={apt.id} onClick={() => openDetail(apt)}
                  className={`glass rounded-xl border p-5 cursor-pointer transition-all ${selected?.id === apt.id ? "border-[#39FF14]/30 bg-[#39FF14]/3" : "border-white/5 hover:border-white/10"}`}>
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center shrink-0">
                      <p className="font-orbitron font-bold text-lg text-white leading-none">{new Date(apt.preferred_date + "T00:00:00").getDate()}</p>
                      <p className="text-[10px] text-gray-500">{MONTHS[new Date(apt.preferred_date + "T00:00:00").getMonth()].slice(0, 3)}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="font-semibold text-white text-sm">{apt.name}</p>
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                          <span className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.dot} mr-1.5 align-middle`} />{cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-[#39FF14] font-semibold mb-1">{apt.service_type}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{apt.service_center}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{apt.preferred_time}</span>
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{apt.phone}</span>
                        {apt.technician && <span className="flex items-center gap-1"><User className="w-3 h-3 text-[#39FF14]" />{apt.technician}</span>}
                        {apt.bike_model && <span className="flex items-center gap-1"><Bike className="w-3 h-3" />{apt.bike_model}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detail Panel */}
          {selected && (
            <div className="glass rounded-xl border border-white/8 overflow-hidden h-fit sticky top-24">
              <div className="h-[2px] bg-gradient-to-r from-transparent via-[#39FF14] to-transparent" />
              <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
                <p className="font-semibold text-white text-sm">Appointment Detail</p>
                <button onClick={() => setSelected(null)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-white border border-white/10 transition-all"><X className="w-3.5 h-3.5" /></button>
              </div>
              <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
                {/* Customer info */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-white/8 border border-white/10 flex items-center justify-center font-bold text-white">{selected.name[0].toUpperCase()}</div>
                    <div>
                      <p className="font-semibold text-white text-sm">{selected.name}</p>
                      <p className="text-xs text-[#39FF14]">{selected.service_type}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { icon: Mail, label: selected.email },
                      { icon: Phone, label: selected.phone },
                      { icon: MapPin, label: selected.service_center },
                      { icon: Calendar, label: formatDate(selected.preferred_date) + " · " + selected.preferred_time },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-gray-400 col-span-2">
                        <item.icon className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </div>
                    ))}
                  </div>
                  {selected.bike_model && <p className="text-xs text-gray-500 flex items-center gap-1.5"><Bike className="w-3.5 h-3.5" />{selected.bike_model}</p>}
                  {selected.issue_description && (
                    <div className="p-3 rounded-xl bg-white/3 border border-white/5">
                      <p className="text-xs text-gray-500 mb-1">Issue Reported</p>
                      <p className="text-xs text-gray-300">{selected.issue_description}</p>
                    </div>
                  )}
                </div>

                {/* Status Update */}
                <div>
                  <label className="block text-xs text-gray-400 mb-2 uppercase tracking-widest">Status</label>
                  <CustomSelect value={editForm.status} onChange={v => setEditForm(f => ({ ...f, status: v }))} options={STATUS_OPTIONS} size="sm" />
                </div>

                {/* Technician */}
                <div>
                  <label className="block text-xs text-gray-400 mb-2 uppercase tracking-widest">Assigned Technician</label>
                  <CustomSelect value={editForm.technician || ""} onChange={v => setEditForm(f => ({ ...f, technician: v }))}
                    options={[{ value: "", label: "Unassigned" }, ...TECHNICIANS.map(t => ({ value: t, label: t }))]} size="sm" />
                </div>

                {/* Estimated Cost */}
                <div>
                  <label className="block text-xs text-gray-400 mb-2 uppercase tracking-widest">Estimated Cost (PHP)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₱</span>
                    <input type="number" value={editForm.estimated_cost} onChange={e => setEditForm(f => ({ ...f, estimated_cost: e.target.value }))} placeholder="0" className={inp + " pl-8"} {...INP_STYLE} />
                  </div>
                </div>

                {/* Parts Used */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-gray-400 uppercase tracking-widest">Parts Used</label>
                    <button onClick={addPart} className="text-xs text-[#39FF14] hover:underline flex items-center gap-1"><Plus className="w-3 h-3" />Add Part</button>
                  </div>
                  {editForm.parts_used.length === 0 ? (
                    <p className="text-xs text-gray-600 text-center py-3">No parts recorded yet</p>
                  ) : editForm.parts_used.map((part, i) => (
                    <div key={i} className="grid grid-cols-7 gap-2 mb-2 items-center">
                      <input value={part.name} onChange={e => updatePart(i, "name", e.target.value)} placeholder="Part name" className={inp + " py-2 col-span-3 text-xs"} {...INP_STYLE} />
                      <input type="number" value={part.qty} onChange={e => updatePart(i, "qty", parseInt(e.target.value) || 1)} className={inp + " py-2 col-span-1 text-xs text-center"} {...INP_STYLE} />
                      <input type="number" value={part.cost} onChange={e => updatePart(i, "cost", parseFloat(e.target.value) || 0)} placeholder="₱" className={inp + " py-2 col-span-2 text-xs"} {...INP_STYLE} />
                      <button onClick={() => removePart(i)} className="text-red-400 hover:text-red-300 transition-colors"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                  {editForm.parts_used.length > 0 && (
                    <p className="text-xs text-gray-500 text-right mt-1">
                      Parts total: ₱{editForm.parts_used.reduce((s, p) => s + p.qty * p.cost, 0).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs text-gray-400 mb-2 uppercase tracking-widest">Internal Notes</label>
                  <textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Service notes, findings, recommendations..." className={inp + " resize-none"} {...INP_STYLE} />
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <button onClick={handleSave} disabled={saving} className="w-full btn-primary flex items-center justify-center gap-2 text-sm">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                  {!selected.confirmation_sent && (
                    <button onClick={() => sendConfirmation(selected)} className="w-full flex items-center justify-center gap-2 py-2.5 glass rounded-xl border border-[#39FF14]/30 text-[#39FF14] text-sm font-semibold hover:bg-[#39FF14]/10 transition-all">
                      <Mail className="w-4 h-4" />Send Confirmation Email
                    </button>
                  )}
                  {selected.confirmation_sent && (
                    <p className="text-center text-xs text-[#39FF14] flex items-center justify-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" />Confirmation email sent
                    </p>
                  )}
                </div>

                <p className="text-[10px] text-gray-600 text-center">Ref: #{selected.id.substring(0, 8).toUpperCase()}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
