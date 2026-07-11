import { useState } from "react";
import { Megaphone, Plus, Percent, Check, Calendar, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function AdminMarketing() {
  const [promos, setPromos] = useState([
    { code: "TRIPSUMMER", discount: "10% OFF", status: "Active", usage: 145 },
    { code: "FLEETPROMO", discount: "₱15,000 Flat", status: "Active", usage: 22 },
    { code: "WELCOME5", discount: "5% OFF", status: "Expired", usage: 389 }
  ]);

  const handleAddPromo = () => {
    toast.success("Promo code created successfully!");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-orbitron font-bold text-3xl text-white">Marketing</h1>
          <p className="text-gray-400 text-sm">Create and moderate promo codes, campaigns, and audience tracks.</p>
        </div>
        <button
          onClick={handleAddPromo}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#39FF14] text-[#0A0A0A] font-orbitron font-bold text-sm rounded-xl hover:bg-[#39FF14]/80 transition-colors"
        >
          <Plus className="w-4 h-4" />
          CREATE PROMO
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass rounded-2xl border border-white/5 p-6 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase">Total Campaigns</p>
            <p className="font-orbitron font-bold text-3xl text-white mt-1">12 Active</p>
          </div>
          <Megaphone className="w-10 h-10 text-[#39FF14]/40" />
        </div>
        <div className="glass rounded-2xl border border-white/5 p-6 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase">Promo Redemptions</p>
            <p className="font-orbitron font-bold text-3xl text-white mt-1">556 times</p>
          </div>
          <Percent className="w-10 h-10 text-cyan-400/40" />
        </div>
        <div className="glass rounded-2xl border border-white/5 p-6 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase">Campaign Sales ROI</p>
            <p className="font-orbitron font-bold text-3xl text-white mt-1">3.4x</p>
          </div>
          <TrendingUp className="w-10 h-10 text-emerald-400/40" />
        </div>
      </div>

      <div className="glass rounded-2xl border border-white/5 overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Active Promo Codes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/2 bg-[#0E0E0E] text-[10px] text-gray-500 uppercase tracking-widest font-semibold">
                <th className="py-4 px-6">Promo Code</th>
                <th className="py-4 px-6">Discount Value</th>
                <th className="py-4 px-6">Redemptions</th>
                <th className="py-4 px-6">Status</th>
              </tr>
            </thead>
            <tbody>
              {promos.map((promo, idx) => (
                <tr key={idx} className="border-b border-white/5 hover:bg-white/2 transition-colors text-sm text-white">
                  <td className="py-4 px-6 font-mono font-bold text-[#39FF14]">{promo.code}</td>
                  <td className="py-4 px-6">{promo.discount}</td>
                  <td className="py-4 px-6 font-mono">{promo.usage}</td>
                  <td className="py-4 px-6">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${promo.status === "Active" ? "bg-[#39FF14]/15 text-[#39FF14]" : "bg-red-500/10 text-red-400"}`}>
                      {promo.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
