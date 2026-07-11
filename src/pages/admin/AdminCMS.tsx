import { useState } from "react";
import { Globe, Save, ArrowUp, ArrowDown, Edit3, Trash2, Plus, LayoutGrid, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Section {
  id: string;
  name: string;
  type: string;
  visibility: boolean;
}

export default function AdminCMS() {
  const [sections, setSections] = useState<Section[]>([
    { id: "hero", name: "Hero Banner", type: "Hero Section", visibility: true },
    { id: "possibilities", name: "Explore Possibilities", type: "Feature Grid", visibility: true },
    { id: "assembly", name: "Assembled for Performance", type: "Video & Specifications", visibility: true },
    { id: "pricing", name: "Flexible Financing Plans", type: "Pricing Tables", visibility: true },
    { id: "faq", name: "Frequently Asked Questions", type: "Accordions", visibility: true }
  ]);

  const handleToggle = (id: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, visibility: !s.visibility } : s));
    toast.success("Section visibility updated");
  };

  const handleSave = () => {
    toast.success("Homepage layout published successfully!");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-orbitron font-bold text-3xl text-white">Website CMS</h1>
          <p className="text-gray-400 text-sm">Manage homepage modules, custom segments, and sections.</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#39FF14] text-[#0A0A0A] font-orbitron font-bold text-sm rounded-xl hover:bg-[#39FF14]/80 transition-colors"
        >
          <Save className="w-4 h-4" />
          PUBLISH CHANGES
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="glass rounded-2xl border border-white/5 p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-[#39FF14]" />
              Homepage Layout Sections
            </h2>

            <div className="space-y-3">
              {sections.map((section, idx) => (
                <div key={section.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:border-white/20 transition-all">
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-500 font-mono">#{idx + 1}</span>
                    <div>
                      <p className="text-sm font-semibold text-white">{section.name}</p>
                      <p className="text-xs text-gray-400">{section.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggle(section.id)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${section.visibility ? "bg-[#39FF14]/15 text-[#39FF14]" : "bg-white/5 text-gray-500"}`}
                    >
                      {section.visibility ? "Active" : "Hidden"}
                    </button>
                    <button className="p-1.5 text-gray-400 hover:text-white"><ArrowUp className="w-4 h-4" /></button>
                    <button className="p-1.5 text-gray-400 hover:text-white"><ArrowDown className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass rounded-2xl border border-white/5 p-6 space-y-4">
            <h2 className="text-base font-semibold text-white">Section Editor</h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              Drag sections to reorder, add new sections or update visual margins.
            </p>
            <button className="w-full flex items-center justify-center gap-2 p-3 border border-dashed border-white/10 hover:border-[#39FF14]/30 rounded-xl text-xs text-gray-400 hover:text-white transition-colors">
              <Plus className="w-4 h-4" />
              Add Custom Banner Section
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
