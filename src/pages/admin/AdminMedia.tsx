import { useState } from "react";
import { FileImage, Upload, Search, Trash2, Eye, Copy, Folder } from "lucide-react";
import { toast } from "sonner";

export default function AdminMedia() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const images = [
    { name: "hero-bike.jpg", size: "488 KB", type: "JPEG", url: "/assets/hero-bike.jpg" },
    { name: "bike-delivery.jpg", size: "326 KB", type: "JPEG", url: "/assets/bike-delivery.jpg" },
    { name: "bike-folding.jpg", size: "464 KB", type: "JPEG", url: "/assets/bike-folding.jpg" },
    { name: "bike-mountain.jpg", size: "565 KB", type: "JPEG", url: "/assets/bike-mountain.jpg" }
  ];

  const handleCopy = (url: string, idx: number) => {
    navigator.clipboard.writeText(window.location.origin + url);
    setCopiedIndex(idx);
    toast.success("Asset URL copied to clipboard");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-orbitron font-bold text-3xl text-white">Media Library</h1>
          <p className="text-gray-400 text-sm">Upload, optimize, and manage media assets and images.</p>
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 bg-[#39FF14] text-[#0A0A0A] font-orbitron font-bold text-sm rounded-xl hover:bg-[#39FF14]/80 transition-colors">
          <Upload className="w-4 h-4" />
          UPLOAD FILES
        </button>
      </div>

      <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-xl">
        <Search className="w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search files..."
          className="bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none flex-1"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {images.map((img, idx) => (
          <div key={idx} className="glass rounded-xl border border-white/5 overflow-hidden group hover:border-[#39FF14]/20 transition-all flex flex-col">
            <div className="aspect-square bg-black/40 flex items-center justify-center relative overflow-hidden">
              <span className="text-gray-600 text-xs font-semibold uppercase">{img.type}</span>
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <button className="p-2 bg-white/10 rounded-lg hover:bg-[#39FF14]/20 text-white hover:text-[#39FF14]" title="View file"><Eye className="w-4 h-4" /></button>
                <button onClick={() => handleCopy(img.url, idx)} className="p-2 bg-white/10 rounded-lg hover:bg-[#39FF14]/20 text-white hover:text-[#39FF14]" title="Copy URL">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-3 bg-white/5 flex-1 flex flex-col justify-between">
              <p className="text-xs font-semibold text-white truncate">{img.name}</p>
              <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1">
                <span>{img.size}</span>
                <span className="uppercase text-[#39FF14]/80">{copiedIndex === idx ? "Copied" : img.type}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
