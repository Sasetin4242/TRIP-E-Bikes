import { useState, useEffect } from "react";
import { X, ChevronRight, BarChart2, Zap, Battery, Gauge, Scale, Package, Clock, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { PRODUCTS } from "@/constants/products";
import type { Product } from "@/types";
import { create } from "zustand";

interface CompareStore {
  selectedIds: string[];
  addProduct: (id: string) => void;
  removeProduct: (id: string) => void;
  clear: () => void;
  isSelected: (id: string) => boolean;
}

export const useCompareStore = create<CompareStore>((set, get) => ({
  selectedIds: [],
  addProduct: (id) => {
    const { selectedIds } = get();
    if (selectedIds.length >= 3 || selectedIds.includes(id)) return;
    set({ selectedIds: [...selectedIds, id] });
  },
  removeProduct: (id) => set({ selectedIds: get().selectedIds.filter((s) => s !== id) }),
  clear: () => set({ selectedIds: [] }),
  isSelected: (id) => get().selectedIds.includes(id),
}));

const SPEC_ROWS: { label: string; key: keyof Product["specs"]; icon: React.ElementType; highlight?: boolean }[] = [
  { label: "Motor Power", key: "motor", icon: Zap, highlight: true },
  { label: "Max Range", key: "range", icon: Battery, highlight: true },
  { label: "Top Speed", key: "topSpeed", icon: Gauge, highlight: true },
  { label: "Battery", key: "battery", icon: Battery },
  { label: "Weight", key: "weight", icon: Scale },
  { label: "Payload Capacity", key: "payload", icon: Package },
  { label: "Charge Time", key: "chargeTime", icon: Clock },
  { label: "Frame Material", key: "frame", icon: Shield },
  { label: "Brake System", key: "brakes", icon: Shield },
];

// Floating compare bar
export function CompareBar({ onOpen }: { onOpen: () => void }) {
  const { selectedIds, removeProduct, clear } = useCompareStore();
  const selected = PRODUCTS.filter((p) => selectedIds.includes(p.id));

  if (selected.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-up">
      <div className="flex items-center gap-3 glass px-5 py-3.5 rounded-2xl border border-[#39FF14]/30 shadow-[0_0_30px_rgba(57,255,20,0.15)] backdrop-blur-xl">
        <BarChart2 className="w-4 h-4 text-[#39FF14] shrink-0" />
        <div className="flex items-center gap-2">
          {selected.map((p) => (
            <div key={p.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-lg border border-white/10">
              <span className="text-xs text-white font-medium">{p.name.split(" ").slice(-1)[0]}</span>
              <button
                onClick={() => removeProduct(p.id)}
                className="text-gray-500 hover:text-red-400 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {selected.length < 3 && (
            <div className="px-2.5 py-1 border border-dashed border-white/20 rounded-lg">
              <span className="text-[10px] text-gray-600">+{3 - selected.length} more</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 ml-2">
          <button
            onClick={onOpen}
            disabled={selected.length < 2}
            className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-all ${
              selected.length >= 2
                ? "bg-[#39FF14] text-[#0A0A0A] hover:bg-[#4FFF2A]"
                : "bg-white/10 text-gray-500 cursor-not-allowed"
            }`}
          >
            Compare {selected.length} Models
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={clear}
            className="text-gray-600 hover:text-gray-400 transition-colors"
            title="Clear comparison"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Full-screen comparison modal
export function CompareModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { selectedIds } = useCompareStore();
  const selected = PRODUCTS.filter((p) => selectedIds.includes(p.id));

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open || selected.length < 2) return null;

  // Find specs that differ between products
  const isDifferent = (key: keyof Product["specs"]) => {
    const vals = selected.map((p) => p.specs[key]);
    return new Set(vals).size > 1;
  };

  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-[#070707]/98 backdrop-blur-xl overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0A0A0A]/95 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <BarChart2 className="w-5 h-5 text-[#39FF14]" />
          <h2 className="font-orbitron font-bold text-lg text-white">Model Comparison</h2>
          <span className="px-2 py-0.5 bg-[#39FF14]/15 text-[#39FF14] text-xs font-bold rounded-full">
            {selected.length} models
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/30 transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        {/* Product Headers */}
        <div className="grid gap-4 mb-8" style={{ gridTemplateColumns: `200px repeat(${selected.length}, 1fr)` }}>
          <div /> {/* spacer */}
          {selected.map((product) => (
            <div key={product.id} className="glass rounded-2xl p-5 border border-white/5 text-center relative overflow-hidden group">
              {product.badge && (
                <span className="absolute top-3 left-3 px-2 py-0.5 bg-[#39FF14] text-[#0A0A0A] text-[9px] font-black rounded-full uppercase">
                  {product.badge}
                </span>
              )}
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-32 object-cover rounded-xl mb-4 group-hover:scale-105 transition-transform duration-500"
              />
              <h3 className="font-orbitron font-bold text-white text-sm mb-1">{product.name}</h3>
              <p className="text-[10px] text-[#39FF14] uppercase tracking-wide mb-3">{product.tagline}</p>
              <p className="font-orbitron font-black text-2xl text-[#39FF14] mb-4">
                ₱{product.price.toLocaleString()}
              </p>
              <Link
                to={`/products/${product.id}`}
                className="btn-primary w-full text-xs flex items-center justify-center gap-1.5"
                onClick={onClose}
              >
                <Zap className="w-3 h-3" /> View Details
              </Link>
            </div>
          ))}
        </div>

        {/* Spec Rows */}
        <div className="rounded-2xl border border-white/5 overflow-hidden">
          {/* Price row - always first */}
          <div className="grid items-center border-b border-white/5 bg-[#39FF14]/3" style={{ gridTemplateColumns: `200px repeat(${selected.length}, 1fr)` }}>
            <div className="px-5 py-4">
              <span className="text-xs text-[#39FF14] font-bold uppercase tracking-wide">Starting Price</span>
            </div>
            {selected.map((p) => (
              <div key={p.id} className="px-5 py-4 text-center border-l border-white/5">
                <span className="font-orbitron font-black text-xl text-[#39FF14]">₱{p.price.toLocaleString()}</span>
              </div>
            ))}
          </div>

          {SPEC_ROWS.map((row, i) => {
            const diff = isDifferent(row.key);
            return (
              <div
                key={row.key}
                className={`grid items-center border-b border-white/5 transition-colors ${
                  diff ? "bg-[#39FF14]/2 hover:bg-[#39FF14]/4" : i % 2 === 0 ? "bg-white/1 hover:bg-white/3" : "hover:bg-white/2"
                }`}
                style={{ gridTemplateColumns: `200px repeat(${selected.length}, 1fr)` }}
              >
                <div className="px-5 py-4 flex items-center gap-2">
                  <row.icon className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                  <span className="text-xs text-gray-400 font-medium">{row.label}</span>
                  {diff && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#39FF14] shrink-0" title="Values differ" />
                  )}
                </div>
                {selected.map((p) => (
                  <div key={p.id} className="px-5 py-4 text-center border-l border-white/5">
                    <span className={`text-sm ${row.highlight ? "text-white font-semibold" : "text-gray-300"}`}>
                      {p.specs[row.key]}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}

          {/* In Stock row */}
          <div className="grid items-center" style={{ gridTemplateColumns: `200px repeat(${selected.length}, 1fr)` }}>
            <div className="px-5 py-4">
              <span className="text-xs text-gray-400 font-medium">Availability</span>
            </div>
            {selected.map((p) => (
              <div key={p.id} className="px-5 py-4 text-center border-l border-white/5">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${p.inStock ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {p.inStock ? "In Stock" : "Pre-Order"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-5 flex items-center gap-3 text-xs text-gray-600">
          <span className="w-2 h-2 rounded-full bg-[#39FF14] inline-block" />
          <span>Green dot indicates specs that differ between models</span>
        </div>
      </div>
    </div>
  );
}
