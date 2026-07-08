import { useState } from "react";
import { PRODUCTS, PRODUCT_CATEGORIES } from "@/constants/products";
import ProductCard from "@/components/features/ProductCard";
import QuoteModal from "@/components/features/QuoteModal";
import SectionObserver from "@/components/features/SectionObserver";
import ParticleField from "@/components/features/ParticleField";
import { CompareBar, CompareModal } from "@/components/features/ProductComparison";
import { SlidersHorizontal, GitCompare } from "lucide-react";

export default function ProductsPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | undefined>();
  const [compareOpen, setCompareOpen] = useState(false);

  const filtered = activeCategory === "all"
    ? PRODUCTS
    : PRODUCTS.filter((p) => p.category === activeCategory);

  return (
    <div className="bg-[#0A0A0A] min-h-screen">
      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <ParticleField />
        <div className="absolute inset-0 bg-hero-gradient" />
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <p className="section-label mb-4">The Lineup</p>
          <h1 className="font-orbitron font-black text-5xl sm:text-6xl text-white mb-6">
            TRIP <span className="gradient-text">E-Bike</span> Collection
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-6">
            Three purpose-built electric bikes engineered for Philippine roads, riders, and businesses.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-400">
            <GitCompare className="w-3.5 h-3.5 text-[#39FF14]" />
            Click the compare icon on any card to compare up to 3 models side by side
          </div>
        </div>
      </section>

      {/* Filter */}
      <div className="sticky top-20 z-40 bg-[#0A0A0A]/90 backdrop-blur-xl border-b border-white/5 py-4">
        <div className="max-w-7xl mx-auto px-6 flex items-center gap-4">
          <SlidersHorizontal className="w-4 h-4 text-gray-500" />
          <div className="flex gap-2 flex-wrap">
            {PRODUCT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
                  activeCategory === cat.id
                    ? "bg-[#39FF14] text-[#0A0A0A]"
                    : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map((product, i) => (
              <SectionObserver key={product.id} delay={i * 120}>
                <ProductCard
                  product={product}
                  onQuote={() => { setSelectedProduct(product.name); setQuoteOpen(true); }}
                />
              </SectionObserver>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 bg-[#0D0D0D]">
        <div className="max-w-7xl mx-auto px-6">
          <SectionObserver>
            <h2 className="font-orbitron font-bold text-3xl text-white mb-10 text-center">
              Quick <span className="gradient-text">Comparison</span>
            </h2>
          </SectionObserver>
          <SectionObserver delay={100}>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-4 px-4 text-xs text-gray-500 uppercase tracking-wide font-medium">Spec</th>
                    {PRODUCTS.map((p) => (
                      <th key={p.id} className="text-center py-4 px-4">
                        <p className="font-orbitron font-bold text-sm text-white">{p.name}</p>
                        <p className="text-xs text-[#39FF14] font-semibold mt-1">₱{p.price.toLocaleString()}</p>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Motor", key: "motor" },
                    { label: "Range", key: "range" },
                    { label: "Top Speed", key: "topSpeed" },
                    { label: "Battery", key: "battery" },
                    { label: "Weight", key: "weight" },
                    { label: "Payload", key: "payload" },
                    { label: "Charge Time", key: "chargeTime" },
                    { label: "Frame", key: "frame" },
                    { label: "Brakes", key: "brakes" },
                  ].map((row, i) => (
                    <tr key={row.key} className={`border-b border-white/5 ${i % 2 === 0 ? "bg-white/1" : ""}`}>
                      <td className="py-4 px-4 text-sm text-gray-500 font-medium">{row.label}</td>
                      {PRODUCTS.map((p) => (
                        <td key={p.id} className="py-4 px-4 text-center text-sm text-gray-300">
                          {p.specs[row.key as keyof typeof p.specs]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionObserver>
        </div>
      </section>

      {/* Floating compare bar + modal */}
      <CompareBar onOpen={() => setCompareOpen(true)} />
      <CompareModal open={compareOpen} onClose={() => setCompareOpen(false)} />

      <QuoteModal open={quoteOpen} onClose={() => setQuoteOpen(false)} preselectedProduct={selectedProduct} />
    </div>
  );
}
