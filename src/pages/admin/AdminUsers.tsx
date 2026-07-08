import { useState } from "react";
import { ADMIN_USERS } from "@/constants/data";
import type { AdminUser } from "@/types";
import { Plus, Edit, Trash2, Shield, Clock } from "lucide-react";
import { toast } from "sonner";

const ROLE_CONFIG: Record<AdminUser["role"], { label: string; color: string; bg: string }> = {
  super_admin: { label: "Super Admin", color: "text-[#39FF14]", bg: "bg-[#39FF14]/20" },
  admin: { label: "Admin", color: "text-cyan-400", bg: "bg-cyan-500/20" },
  sales_manager: { label: "Sales Manager", color: "text-yellow-400", bg: "bg-yellow-500/20" },
  sales_agent: { label: "Sales Agent", color: "text-blue-400", bg: "bg-blue-500/20" },
  content_editor: { label: "Content Editor", color: "text-purple-400", bg: "bg-purple-500/20" },
  marketing: { label: "Marketing", color: "text-pink-400", bg: "bg-pink-500/20" },
};

const ROLES: AdminUser["role"][] = ["super_admin", "admin", "sales_manager", "sales_agent", "content_editor", "marketing"];

const PERMISSIONS: Record<AdminUser["role"], string[]> = {
  super_admin: ["Full system access", "User management", "All CMS access", "Financial data", "System settings"],
  admin: ["User management", "All CMS access", "Lead management", "Product management"],
  sales_manager: ["Lead management", "Pipeline management", "Team reporting", "Quote approval"],
  sales_agent: ["Own leads", "Quote creation", "Customer contact", "Basic reporting"],
  content_editor: ["Blog posts", "FAQs", "Testimonials", "Media library"],
  marketing: ["Blog posts", "Banners", "SEO settings", "Email campaigns"],
};

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>(ADMIN_USERS);
  const [showAdd, setShowAdd] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "sales_agent" as AdminUser["role"] });

  const handleAdd = () => {
    const user: AdminUser = {
      id: `u-${Date.now()}`,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      lastActive: new Date().toISOString(),
    };
    setUsers([...users, user]);
    setShowAdd(false);
    setNewUser({ name: "", email: "", role: "sales_agent" });
    toast.success("User added successfully.");
  };

  const handleDelete = (id: string) => {
    setUsers(users.filter((u) => u.id !== id));
    toast.success("User removed.");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-orbitron font-bold text-2xl text-white">User Management</h1>
          <p className="text-gray-500 text-sm mt-1">{users.length} active users</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary text-xs flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users List */}
        <div className="lg:col-span-2 space-y-4">
          {users.map((user) => {
            const cfg = ROLE_CONFIG[user.role];
            return (
              <div key={user.id} className="glass rounded-xl border border-white/5 hover:border-white/10 transition-all p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#39FF14]/20 to-[#00FFFF]/10 flex items-center justify-center font-orbitron font-bold text-lg text-[#39FF14] shrink-0">
                  {user.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="font-semibold text-white">{user.name}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-0.5">{user.email}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3 text-gray-600" />
                    <p className="text-xs text-gray-600">
                      Last active: {new Date(user.lastActive).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button className="p-2 glass rounded-lg border border-white/10 text-gray-400 hover:text-white transition-colors">
                    <Edit className="w-4 h-4" />
                  </button>
                  {user.role !== "super_admin" && (
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="p-2 glass rounded-lg border border-white/10 text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Roles & Permissions */}
        <div className="glass rounded-xl border border-white/5 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="w-5 h-5 text-[#39FF14]" />
            <h2 className="font-orbitron font-bold text-lg text-white">Role Permissions</h2>
          </div>
          <div className="space-y-6">
            {ROLES.map((role) => {
              const cfg = ROLE_CONFIG[role];
              const perms = PERMISSIONS[role];
              return (
                <div key={role}>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cfg.bg} ${cfg.color} mb-2 inline-block`}>
                    {cfg.label}
                  </span>
                  <ul className="space-y-1 mt-2">
                    {perms.map((perm) => (
                      <li key={perm} className="text-xs text-gray-400 flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-[#39FF14]" />
                        {perm}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative glass rounded-2xl border border-white/10 w-full max-w-md p-8">
            <h2 className="font-orbitron font-bold text-xl text-white mb-6">Add New User</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wide">Full Name *</label>
                <input
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Full name"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#39FF14]/50"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wide">Email *</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="user@tripmobility.ph"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#39FF14]/50"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wide">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as AdminUser["role"] })}
                  className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#39FF14]/50"
                >
                  {ROLES.filter((r) => r !== "super_admin").map((role) => (
                    <option key={role} value={role}>{ROLE_CONFIG[role].label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAdd}
                disabled={!newUser.name || !newUser.email}
                className="btn-primary flex-1"
              >
                Create User
              </button>
              <button onClick={() => setShowAdd(false)} className="btn-outline">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
