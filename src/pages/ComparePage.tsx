import { useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  Zap, Battery, Gauge, Weight, Package, Check, X, Plus, ChevronRight,
  Star, ArrowRight, Info, Minus, Shield, Clock, BarChart3
} from "lucide-react";
import { PRODUCTS } from "@/constants/products";
import QuoteModal from "@/components/features/QuoteModal";
import CustomerAuthModal from "@/components/features/CustomerAuthModal";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";

const SPEC_LABELS: Record<string, { label: string; icon: any }> = {
  motor:        { label: "Motor Power", icon: Zap },
  battery:      { label: "Battery", icon: Battery },
  range:        { label: "Range", icon: BarChart3 },
  topSpeed:     { label: "Top Speed", icon: Gauge },
  weight:       { label: "Bike Weight", icon: Weight },
  payload:      { label: "Max Payload", icon: Package },
  chargeTime:   { label: "Charge Time", icon: Clock },
  frame:        { label: "Frame", icon: Shield },
  brakes:       { label: "Brakes", icon: Shield },
  tires:        { label: "Tires", icon: Shield },
};

const ACCENT_COLORS = ["#39FF14", "#00FFFF", "#FF6B35"];
const COL_BORDERS  = ["border-[#39FF14]/30", "border-[#00FFFF]/30", "border-[#FF6B35]/30"];
const COL_BG       = ["bg-[#39FF14]/5", "bg-[#00FFFF]/5", "bg-[#FF6B35]/5"];
const COL_TEXT     = ["text-[#39FF14]", "text-[#00FFFF]", "text-[#FF6B35]"];
const COL_BADGE    = ["bg-[#39FF14] text-[#0A0A0A]", "bg-[#00FFFF] text-[#0A0A0A]", "bg-[#FF6B35] text-white"];

export default function ComparePage() {
  const { customer } = useCustomerAuth();
  const [selected, setSelected] = useState<string[]>(["delivery-ebike", "folding-ebike"]);
  const [quoteProduct, setQuoteProduct] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<string | null>(null);

  const selectedProducts = PRODUCTS.filter(p => selected.includes(p.id));
  const allProductIds = PRODUCTS.map(p => p.id);

  const toggleProduct = (id: string) => {
    setSelected(prev => {
      if (prev.includes(id)) {
        if (prev.length <= 2) return prev; // Keep at least 2
        return prev.filter(p => p !== id);
      }
      if (prev.length >= 3) {
        // Replace the last one
        return [...prev.slice(0, 2), id];
      }
      return [...prev, id];
    });
  };

  const handleRequestQuote = (productId: string) => {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;
    if (!customer) {
      setPendingProduct(productId);
      setShowAuth(true);
    } else {
      setQuoteProduct(product.name);
    }
  };

  const handleAuthSuccess = useCallback(() => {
    setShowAuth(false);
    if (pendingProduct) {
      const product = PRODUCTS.find(p => p.id === pendingProduct);
      if (product) setQuoteProduct(product.name);
      setPendingProduct(null);
    }
  }, [pendingProduct]);

  // Check if a spec value differs across selected products
  const specDiffers = (key: string) => {
    const vals = selectedProducts.map(p => (p.specs as any)[key]);
    return new Set(vals).size > 1;
  };

  const priceMin = Math.min(...selectedProducts.map(p => p.price));
  const priceMax = Math.max(...selectedProducts.map(p => p.price));

  return (
    <div className="min-h-screen bg-[#0A0A0A] pb-24">
      <Helmet>
        <title>Compare E-Bike Models — TRIP Mobility</title>
        <meta name="description" content="Compare TRIP Mobility e-bike models side-by-side. Full specs, pricing, features, and use cases to help you choose the perfect electric bike." />
      </Helmet>

      {/* Hero */}
      <section className="relative pt-32 pb-16 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#39FF14]/3 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#39FF14]/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="max-w-7xl mx-auto relative text-center">
          <p className="section-label mb-4">Side-by-Side Comparison</p>
          <h1 className="font-orbitron font-black text-4xl md:text-5xl text-white mb-4">
            Find Your <span className="gradient-text">Perfect Ride</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Compare up to 3 TRIP e-bike models across all specifications, features, and pricing to make an informed decision.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6">

        {/* ── Model Selector ── */}
        <div className="glass rounded-2xl border border-white/8 p-6 mb-10">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-white text-sm">Select Models to Compare</h2>
              <p className="text-xs text-gray-500 mt-0.5">Choose 2–3 models · {selected.length}/3 selected</p>
            </div>
            <div className="flex gap-1.5">
              {selected.length < 3 && (
                <span className="text-xs text-gray-500 flex items-center gap-1.5 px-3 py-1.5 glass rounded-lg border border-white/8">
                  <Plus className="w-3.5 h-3.5" />Add another model
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PRODUCTS.map((p, i) => {
              const isSelected = selected.includes(p.id);
              const selIdx = selected.indexOf(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => toggleProduct(p.id)}
                  className={`relative flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                    isSelected
                      ? `${COL_BORDERS[selIdx] || "border-[#39FF14]/30"} ${COL_BG[selIdx] || "bg-[#39FF14]/5"}`
                      : "border-white/5 hover:border-white/15 glass"
                  }`}
                >
                  <div className="w-16 h-12 rounded-lg overflow-hidden shrink-0 bg-white/5 border border-white/10">
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-orbitron font-bold text-sm text-white truncate">{p.name}</p>
                    <p className={`font-bold text-sm ${isSelected ? (COL_TEXT[selIdx] || "text-[#39FF14]") : "text-gray-400"}`}>
                      ₱{p.price.toLocaleString()}
                    </p>
                  </div>
                  {isSelected && (
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${COL_BADGE[selIdx] || COL_BADGE[0]}`}>
                      {selIdx + 1}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Comparison Table ── */}
        {selectedProducts.length >= 2 && (
          <div className="space-y-6">

            {/* Product Header Cards */}
            <div className={`grid gap-6`} style={{ gridTemplateColumns: `200px repeat(${selectedProducts.length}, 1fr)` }}>
              {/* Empty corner */}
              <div />
              {selectedProducts.map((p, i) => (
                <div key={p.id} className={`glass rounded-2xl border ${COL_BORDERS[i]} overflow-hidden`}>
                  <div className={`h-1 w-full`} style={{ background: ACCENT_COLORS[i] }} />
                  <div className="p-5">
                    <div className="relative h-40 rounded-xl overflow-hidden mb-4 bg-[#111] border border-white/5">
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent" />
                      {p.badge && (
                        <span className={`absolute top-2 left-2 px-2 py-1 rounded-full text-[10px] font-black ${COL_BADGE[i]}`}>
                          {p.badge}
                        </span>
                      )}
                      <div className="absolute bottom-3 right-3 flex items-center gap-1">
                        {[1,2,3,4,5].map(s => <Star key={s} className={`w-3 h-3 fill-current ${s <= 4 ? COL_TEXT[i] : "text-gray-700"}`} />)}
                      </div>
                    </div>
                    <p className={`text-[10px] font-semibold tracking-widest uppercase mb-1 ${COL_TEXT[i]}`}>{p.category}</p>
                    <h3 className="font-orbitron font-black text-lg text-white mb-1">{p.name}</h3>
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">{p.tagline}</p>

                    {/* Price */}
                    <div className={`rounded-xl border p-3 ${COL_BORDERS[i]} ${COL_BG[i]} text-center mb-4`}>
                      <p className="text-xs text-gray-400 mb-0.5">Starting From</p>
                      <p className={`font-orbitron font-black text-2xl ${COL_TEXT[i]}`}>₱{p.price.toLocaleString()}</p>
                      {p.price === priceMin && selectedProducts.length > 1 && (
                        <p className="text-[10px] text-gray-400 mt-1">Most Affordable</p>
                      )}
                      {p.price === priceMax && selectedProducts.length > 1 && (
                        <p className="text-[10px] text-gray-400 mt-1">Premium Option</p>
                      )}
                    </div>

                    {/* CTA */}
                    <button
                      onClick={() => handleRequestQuote(p.id)}
                      className="w-full py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95"
                      style={{ background: ACCENT_COLORS[i], color: "#0A0A0A" }}
                    >
                      Request Quote
                    </button>
                    <Link
                      to={`/products/${p.id}`}
                      className="flex items-center justify-center gap-1.5 mt-2 text-xs text-gray-500 hover:text-white transition-colors py-1.5"
                    >
                      View Details <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Quick Highlights Row ── */}
            <div className="glass rounded-2xl border border-white/8 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/8 bg-white/2">
                <h3 className="font-semibold text-white text-sm">Key Highlights</h3>
              </div>
              <div className={`grid`} style={{ gridTemplateColumns: `200px repeat(${selectedProducts.length}, 1fr)` }}>
                <div className="p-4 flex items-center">
                  <span className="text-xs text-gray-600 uppercase tracking-widest font-semibold">Metric</span>
                </div>
                {selectedProducts.map((_, i) => (
                  <div key={i} className={`p-4 text-center border-l border-white/5 ${COL_BG[i]}`}>
                    <span className={`text-xs font-bold uppercase tracking-widest ${COL_TEXT[i]}`}>Model {i + 1}</span>
                  </div>
                ))}
              </div>
              {[
                { key: "motor", icon: Zap, label: "Motor" },
                { key: "range", icon: BarChart3, label: "Range" },
                { key: "topSpeed", icon: Gauge, label: "Top Speed" },
                { key: "payload", icon: Package, label: "Max Payload" },
              ].map(({ key, icon: Icon, label }, rowIdx) => {
                const differs = specDiffers(key);
                return (
                  <div
                    key={key}
                    className={`grid border-t border-white/5 ${rowIdx % 2 === 0 ? "" : "bg-white/1"}`}
                    style={{ gridTemplateColumns: `200px repeat(${selectedProducts.length}, 1fr)` }}
                  >
                    <div className="p-4 flex items-center gap-2">
                      <Icon className="w-4 h-4 text-gray-500 shrink-0" />
                      <span className="text-xs text-gray-400">{label}</span>
                      {differs && (
                        <span className="ml-auto w-2 h-2 rounded-full bg-yellow-400" title="Values differ" />
                      )}
                    </div>
                    {selectedProducts.map((p, i) => {
                      const val = (p.specs as any)[key];
                      return (
                        <div key={p.id} className="p-4 text-center border-l border-white/5">
                          <span className={`text-sm font-semibold ${differs ? COL_TEXT[i] : "text-white"}`}>
                            {val || "—"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* ── Full Specs Table ── */}
            <div className="glass rounded-2xl border border-white/8 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/8 bg-white/2 flex items-center justify-between">
                <h3 className="font-semibold text-white text-sm">Full Specifications</h3>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
                  Yellow dot = values differ
                </div>
              </div>
              {/* Header Row */}
              <div
                className="grid border-b border-white/8"
                style={{ gridTemplateColumns: `200px repeat(${selectedProducts.length}, 1fr)` }}
              >
                <div className="px-6 py-3">
                  <span className="text-xs text-gray-600 uppercase tracking-widest">Specification</span>
                </div>
                {selectedProducts.map((p, i) => (
                  <div key={p.id} className={`px-4 py-3 border-l border-white/5 ${COL_BG[i]} text-center`}>
                    <span className={`text-xs font-bold ${COL_TEXT[i]}`}>{p.name}</span>
                  </div>
                ))}
              </div>
              {/* Spec Rows */}
              {Object.entries(SPEC_LABELS).map(([key, { label, icon: Icon }], rowIdx) => {
                const differs = specDiffers(key);
                const allVals = selectedProducts.map(p => (p.specs as any)[key] || "—");
                return (
                  <div
                    key={key}
                    className={`grid border-b border-white/5 ${rowIdx % 2 === 0 ? "" : "bg-white/1"}`}
                    style={{ gridTemplateColumns: `200px repeat(${selectedProducts.length}, 1fr)` }}
                  >
                    <div className="px-6 py-3.5 flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                      <span className="text-xs text-gray-400">{label}</span>
                      {differs && <span className="ml-auto w-2 h-2 rounded-full bg-yellow-400" />}
                    </div>
                    {selectedProducts.map((p, i) => {
                      const val = (p.specs as any)[key] || "—";
                      const isHighlight = differs;
                      return (
                        <div key={p.id} className="px-4 py-3.5 text-center border-l border-white/5">
                          <span className={`text-sm ${isHighlight ? `font-bold ${COL_TEXT[i]}` : "text-gray-300"}`}>
                            {val}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* ── Features Comparison ── */}
            <div className="glass rounded-2xl border border-white/8 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/8 bg-white/2">
                <h3 className="font-semibold text-white text-sm">Key Features</h3>
              </div>
              {/* Get all unique features */}
              {(() => {
                const allFeatures = [...new Set(selectedProducts.flatMap(p => p.features))];
                return allFeatures.map((feat, i) => (
                  <div
                    key={i}
                    className={`grid border-b border-white/5 ${i % 2 === 0 ? "" : "bg-white/1"}`}
                    style={{ gridTemplateColumns: `1fr repeat(${selectedProducts.length}, 80px)` }}
                  >
                    <div className="px-6 py-3 flex items-center gap-2">
                      <span className="text-xs text-gray-400">{feat}</span>
                    </div>
                    {selectedProducts.map((p, pi) => {
                      const has = p.features.some(f => f.toLowerCase().includes(feat.toLowerCase().split(" ")[0]));
                      return (
                        <div key={p.id} className="px-4 py-3 flex items-center justify-center border-l border-white/5">
                          {has
                            ? <Check className={`w-4 h-4 ${COL_TEXT[pi]}`} />
                            : <Minus className="w-4 h-4 text-gray-700" />
                          }
                        </div>
                      );
                    })}
                  </div>
                ));
              })()}
            </div>

            {/* ── Use Cases ── */}
            <div className="glass rounded-2xl border border-white/8 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/8 bg-white/2">
                <h3 className="font-semibold text-white text-sm">Ideal Use Cases</h3>
              </div>
              <div
                className="grid divide-x divide-white/5"
                style={{ gridTemplateColumns: `200px repeat(${selectedProducts.length}, 1fr)` }}
              >
                <div className="p-4 flex items-center">
                  <span className="text-xs text-gray-500">Best for:</span>
                </div>
                {selectedProducts.map((p, i) => (
                  <div key={p.id} className="p-4">
                    <div className="space-y-2">
                      {p.useCases.map((uc, j) => (
                        <div key={j} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${COL_BG[i]} border ${COL_BORDERS[i]}`}>
                          <Check className={`w-3 h-3 shrink-0 ${COL_TEXT[i]}`} />
                          <span className="text-gray-300">{uc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── CTA Footer ── */}
            <div className="glass rounded-2xl border border-white/8 p-8">
              <div className={`grid gap-6`} style={{ gridTemplateColumns: `repeat(${selectedProducts.length}, 1fr)` }}>
                {selectedProducts.map((p, i) => (
                  <div key={p.id} className={`text-center p-6 rounded-xl border ${COL_BORDERS[i]} ${COL_BG[i]}`}>
                    <p className={`font-orbitron font-black text-lg ${COL_TEXT[i]} mb-1`}>{p.name}</p>
                    <p className={`font-orbitron font-bold text-3xl text-white mb-2`}>₱{p.price.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mb-5">{p.tagline}</p>
                    <button
                      onClick={() => handleRequestQuote(p.id)}
                      className="w-full py-3 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                      style={{ background: ACCENT_COLORS[i], color: "#0A0A0A" }}
                    >
                      Request Quote <ArrowRight className="w-4 h-4" />
                    </button>
                    <Link
                      to={`/products/${p.id}`}
                      className="flex items-center justify-center gap-1.5 mt-2.5 text-xs text-gray-500 hover:text-white transition-colors"
                    >
                      Full Details <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* Help Banner */}
        <div className="mt-10 glass rounded-2xl border border-[#39FF14]/15 p-6 flex flex-col sm:flex-row items-center gap-5">
          <div className="w-12 h-12 rounded-xl bg-[#39FF14]/10 border border-[#39FF14]/20 flex items-center justify-center shrink-0">
            <Info className="w-6 h-6 text-[#39FF14]" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className="font-semibold text-white text-sm mb-1">Not sure which model fits you?</p>
            <p className="text-xs text-gray-500">Our e-mobility specialists can help you choose the right bike for your needs, budget, and use case — completely free consultation.</p>
          </div>
          <Link to="/contact" className="btn-primary text-sm flex items-center gap-2 whitespace-nowrap">
            Talk to an Expert <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Quote Modal */}
      {quoteProduct && (
        <QuoteModal
          productName={quoteProduct}
          onClose={() => setQuoteProduct(null)}
        />
      )}
      {showAuth && (
        <CustomerAuthModal
          onClose={() => { setShowAuth(false); setPendingProduct(null); }}
          onSuccess={handleAuthSuccess}
        />
      )}
    </div>
  );
}
