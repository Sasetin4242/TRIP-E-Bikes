import { useState } from "react";
import { Compass, Save, ArrowUpRight, CheckCircle, Search, Edit } from "lucide-react";
import { toast } from "sonner";

export default function AdminSEO() {
  const [pages, setPages] = useState([
    { path: "/", title: "TRIP Mobility — Premium Electric Bikes Philippines", score: 92 },
    { path: "/about", title: "About Us — TRIP Mobility", score: 85 },
    { path: "/products", title: "All Models — TRIP Mobility", score: 88 },
    { path: "/financing", title: "Financing Plans — TRIP Mobility", score: 79 }
  ]);

  const handleSave = () => {
    toast.success("SEO Metadata updated and indexed");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-orbitron font-bold text-3xl text-white">SEO Settings</h1>
          <p className="text-gray-400 text-sm">Manage dynamic metadata, redirects, sitemaps, and indexing headers.</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#39FF14] text-[#0A0A0A] font-orbitron font-bold text-sm rounded-xl hover:bg-[#39FF14]/80 transition-colors"
        >
          <Save className="w-4 h-4" />
          SAVE METADATA
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass rounded-2xl border border-white/5 overflow-hidden">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Metadata Index</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-[#0E0E0E] text-[10px] text-gray-500 uppercase tracking-widest font-semibold">
                  <th className="py-4 px-6">Route Path</th>
                  <th className="py-4 px-6">Meta Title Tag</th>
                  <th className="py-4 px-6 text-center">SEO Score</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((p, idx) => (
                  <tr key={idx} className="border-b border-white/5 hover:bg-white/2 transition-colors text-sm text-white">
                    <td className="py-4 px-6 font-mono text-xs text-gray-400">{p.path}</td>
                    <td className="py-4 px-6 truncate max-w-[200px]">{p.title}</td>
                    <td className="py-4 px-6 text-center">
                      <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${p.score >= 90 ? "text-[#39FF14] bg-[#39FF14]/15" : "text-yellow-400 bg-yellow-400/10"}`}>
                        {p.score}/100
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass rounded-2xl border border-white/5 p-6 space-y-4">
            <h3 className="text-base font-semibold text-white">Sitemap Options</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Auto-generate sitemaps and manifest headers for indexing engines.
            </p>
            <button className="w-full flex items-center justify-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs text-white border border-white/10 transition-colors">
              <ArrowUpRight className="w-4 h-4" />
              Submit to Google Search Console
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
