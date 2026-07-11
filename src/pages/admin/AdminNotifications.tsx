import { Bell, Check, Zap, AlertCircle, ShieldAlert } from "lucide-react";

export default function AdminNotifications() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Alert Hub</p>
          <h1 className="font-orbitron font-bold text-3xl text-white">Notifications</h1>
          <p className="text-gray-400 text-sm mt-1">Review system logs, leads registrations, appointments booking alerts, and audit updates.</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white hover:bg-white/10 transition-all font-semibold">
          <Check className="w-4 h-4 text-[#39FF14]" /> Mark All Read
        </button>
      </div>

      <div className="glass rounded-xl border border-white/5 divide-y divide-white/5">
        {[
          { type: "lead", title: "New Lead Registered", detail: "Juan Dela Cruz submitted a quote request for TRIP Model T-206 Max (3 units).", time: "3 minutes ago", icon: Zap, iconClass: "text-[#39FF14] bg-[#39FF14]/10" },
          { type: "appointment", title: "Test Ride Appointment Booked", detail: "Maria Santos scheduled a test ride on Tuesday, July 14 at 2:00 PM.", time: "1 hour ago", icon: Bell, iconClass: "text-blue-400 bg-blue-500/10" },
          { type: "security", title: "Security Login Verification", detail: "Successful login from IP address 122.54.33.109 (Admin Panel Access).", time: "4 hours ago", icon: ShieldAlert, iconClass: "text-yellow-400 bg-yellow-500/10" },
          { type: "system", title: "System Database Sync Complete", detail: "Automatic sync with main enterprise postgres server finished with zero errors.", time: "12 hours ago", icon: AlertCircle, iconClass: "text-emerald-400 bg-emerald-500/10" }
        ].map((item, idx) => (
          <div key={idx} className="p-4 hover:bg-white/2 transition-colors flex gap-4 items-start">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${item.iconClass}`}>
              <item.icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline">
                <p className="text-sm font-semibold text-white truncate">{item.title}</p>
                <span className="text-[10px] text-gray-500 shrink-0">{item.time}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
