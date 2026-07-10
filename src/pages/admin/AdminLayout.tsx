import { useState, useEffect, useRef, useCallback } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Package, FileText, UserCog,
  Zap, Bell, Search, Menu, X, ExternalLink, LogOut,
  ChevronRight, BarChart3, Receipt, MessageSquare, MessageCircle,
  Calendar, Settings
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import NotificationBell from "@/components/features/NotificationBell";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/admin" },
  { icon: Users, label: "Leads & CRM", href: "/admin/leads" },
  { icon: Receipt, label: "Quotations", href: "/admin/quotations" },
  { icon: MessageSquare, label: "Contacts", href: "/admin/contacts" },
  { icon: BarChart3, label: "Analytics", href: "/admin/analytics" },
  { icon: Package, label: "Products", href: "/admin/products" },
  { icon: FileText, label: "Content", href: "/admin/content" },
  { icon: MessageCircle, label: "Live Chat", href: "/admin/chat" },
  { icon: Calendar, label: "Appointments", href: "/admin/appointments" },
  { icon: UserCog, label: "Users", href: "/admin/users" },
  { icon: Settings, label: "Settings", href: "/admin/settings" },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [newLeadsCount, setNewLeadsCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Poll for new leads count
  useEffect(() => {
    const fetchNewLeads = async () => {
      const { data, error } = await apiClient.get("/leads.php");
      if (!error && data) {
        const newLeads = data.filter((l: any) => l.status === "new");
        setNewLeadsCount(newLeads.length);
      }
    };
    fetchNewLeads();
    const interval = setInterval(fetchNewLeads, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await apiClient.post("/auth.php?action=logout");
    localStorage.removeItem("token");
    logout();
    navigate("/admin/login");
    toast.success("Signed out from admin panel");
  };

  return (
    <div className="min-h-screen bg-[#070707] flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "w-64" : "w-16"} flex-shrink-0 bg-[#0D0D0D] border-r border-white/5 flex flex-col transition-all duration-300 fixed top-0 left-0 h-full z-50`}>
        {/* Logo */}
        <div className="p-4 border-b border-white/5 flex items-center gap-3">
          <div className="w-9 h-9 flex items-center justify-center bg-[#39FF14]/15 rounded-lg border border-[#39FF14]/20 shrink-0">
            <Zap className="w-5 h-5 text-[#39FF14]" fill="#39FF14" />
          </div>
          {sidebarOpen && (
            <div>
              <p className="font-orbitron font-black text-sm text-white">TRIP</p>
              <p className="text-[8px] text-[#39FF14] tracking-widest">ADMIN PANEL</p>
            </div>
          )}
        </div>

        {/* User info */}
        {sidebarOpen && user && (
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#39FF14]/10 border border-[#39FF14]/20 flex items-center justify-center font-bold text-[#39FF14] text-sm shrink-0">
              {(user.username || "A")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user.username}</p>
              <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.href ||
              (item.href !== "/admin" && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-xl mb-1 transition-all duration-200 relative ${
                  isActive
                    ? "bg-[#39FF14]/15 text-[#39FF14] border border-[#39FF14]/20"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
                {/* New leads badge on CRM nav */}
                {item.href === "/admin/leads" && newLeadsCount > 0 && (
                  <span className={`${sidebarOpen ? "ml-auto" : "absolute -top-1 -right-1"} w-5 h-5 flex items-center justify-center rounded-full bg-[#39FF14] text-[#0A0A0A] text-[10px] font-black`}>
                    {newLeadsCount > 9 ? "9+" : newLeadsCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-4 border-t border-white/5 space-y-2">
          {sidebarOpen && (
            <Link to="/" className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-1.5 rounded-lg hover:bg-white/5">
              <ExternalLink className="w-4 h-4" />
              View Website
            </Link>
          )}
          {sidebarOpen && (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 text-xs text-gray-500 hover:text-red-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-500/5 text-left"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className={`flex-1 flex flex-col min-h-screen ${sidebarOpen ? "ml-64" : "ml-16"} transition-all duration-300`}>
        {/* Top Bar */}
        <header className="sticky top-0 z-40 bg-[#0D0D0D]/90 backdrop-blur-xl border-b border-white/5 h-16 flex items-center px-6 gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search leads, products..."
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#39FF14]/30"
            />
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <NotificationBell isAdmin={true} />
            <div className="w-9 h-9 rounded-full bg-[#39FF14]/20 border border-[#39FF14]/30 flex items-center justify-center font-orbitron font-bold text-sm text-[#39FF14]">
              {user?.username?.[0]?.toUpperCase() || "A"}
            </div>
            <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-red-400 transition-colors hidden md:block">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
