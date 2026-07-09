import { useState, useEffect } from "react";
import { PRODUCTS, PRODUCT_CATEGORIES } from "@/constants/products";
import ProductCard from "@/components/features/ProductCard";
import QuoteModal from "@/components/features/QuoteModal";
import SectionObserver from "@/components/features/SectionObserver";
import ParticleField from "@/components/features/ParticleField";
import { CompareBar, CompareModal } from "@/components/features/ProductComparison";
import { SlidersHorizontal, GitCompare, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import ProductQuiz from "@/components/features/ProductQuiz";
import type { Product } from "@/types";

export default function ProductsPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | undefined>();
  const [compareOpen, setCompareOpen] = useState(false);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const { data, error } = await apiClient.get("products");
        if (data && Array.isArray(data) && data.length > 0) {
          const mapped: Product[] = data.map((p: any) => ({
            id: p.product_key || String(p.id),
            name: p.name,
            tagline: p.tagline,
            description: p.description,
            price: Number(p.price),
            category: p.category?.toLowerCase()?.includes("cargo") || p.category?.toLowerCase() === "delivery" ? "delivery" : p.category?.toLowerCase()?.includes("folding") ? "folding" : "mountain",
            image: p.primary_image_url || "/placeholder.svg",
            badge: p.badge || undefined,
            specs: {
              motor: p.specs?.motor || "",
              battery: p.specs?.battery || "",
              range: p.specs?.range || "",
              topSpeed: p.specs?.topSpeed || p.specs?.chargingTime || "",
              weight: p.specs?.weight || "",
              payload: p.specs?.payload || "",
              chargeTime: p.specs?.chargeTime || p.specs?.chargingTime || "",
              frame: p.specs?.frame || "",
              brakes: p.specs?.brakes || "",
              tires: p.specs?.tires || "",
            },
            features: p.features || [],
            useCases: p.use_cases || [],
            colors: p.colors || [],
            inStock: p.in_stock ?? true,
          }));
          setProducts(mapped);
        } else {
          setProducts(PRODUCTS);
        }
      } catch (err) {
        console.error("Error fetching products:", err);
        setProducts(PRODUCTS);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  const filtered = activeCategory === "all"
    ? products
    : products.filter((p) => p.category === activeCategory);

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

      {/* AI Product Quiz */}
      <section className="py-4 border-t border-b border-white/5 bg-[#0D0D0D]">
        <ProductQuiz />
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
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-[#39FF14] animate-spin mb-4" />
              <p className="text-gray-500 text-sm">Loading electric bike fleet...</p>
            </div>
          ) : (
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
          )}
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
                    {(products.length > 0 ? products : PRODUCTS).map((p) => (
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
                      {(products.length > 0 ? products : PRODUCTS).map((p) => (
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
