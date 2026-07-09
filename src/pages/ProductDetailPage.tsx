import { useState, lazy, Suspense, useEffect } from "react";
import { trackProductView, trackCTAClick } from "@/hooks/useTracking";
import { useParams, Link, Navigate } from "react-router-dom";
import ProductReviews from "@/components/features/ProductReviews";
import CustomerAuthModal from "@/components/features/CustomerAuthModal";
import {
  Battery, Gauge, Zap, Shield, ArrowLeft, CheckCircle,
  Download, Share2, ChevronDown, ChevronUp, RotateCcw, Loader2
} from "lucide-react";
import { PRODUCTS } from "@/constants/products";
import QuoteModal from "@/components/features/QuoteModal";
import SectionObserver from "@/components/features/SectionObserver";
import { apiClient } from "@/lib/api-client";
import type { Product } from "@/types";

const BikeViewer3D = lazy(() => import("@/components/features/BikeViewer3D"));

const FAQ_ITEMS = [
  { q: "What is included in the warranty?", a: "All TRIP e-bikes come with a 3-year frame warranty, 1-year motor warranty, and 1-year battery warranty. This covers manufacturing defects and component failures under normal use." },
  { q: "How long does delivery take?", a: "Metro Manila: 2–3 business days. Provincial: 5–7 business days. Fleet orders of 10+ units: 2–3 weeks including pre-delivery inspection and branding." },
  { q: "Can I test ride before buying?", a: "Yes! Visit our flagship showroom in Mandaluyong City. Test rides are available Mon–Sat 9am–5pm. Contact us to schedule an appointment." },
  { q: "Is financing available?", a: "Yes. We offer installment plans starting at 20% down with 12–36 month terms through our banking partners. Fleet clients can access up to 60-month terms." },
  { q: "How do I charge the battery?", a: "Simply plug the charger into any standard Philippine 220V outlet. A full charge takes 5–6 hours. The smart BMS prevents overcharging automatically." },
  { q: "Is the bike waterproof?", a: "The motor, controller, and battery are IP65-rated, making them splash and rain resistant. We do not recommend deep water immersion or pressure washing." },
];

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"3d" | "features" | "specs" | "usecases">("3d");
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    const fetchProductData = async () => {
      try {
        setLoading(true);
        const { data } = await apiClient.get("products");
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
          const found = mapped.find((p) => p.id === id);
          if (found) {
            setProduct(found);
            setRelatedProducts(mapped.filter((p) => p.id !== found.id));
          } else {
            const staticFound = PRODUCTS.find((p) => p.id === id);
            if (staticFound) {
              setProduct(staticFound);
              setRelatedProducts(PRODUCTS.filter((p) => p.id !== id));
            }
          }
        } else {
          const staticFound = PRODUCTS.find((p) => p.id === id);
          if (staticFound) {
            setProduct(staticFound);
            setRelatedProducts(PRODUCTS.filter((p) => p.id !== id));
          }
        }
      } catch (err) {
        console.error("Error fetching product details:", err);
        const staticFound = PRODUCTS.find((p) => p.id === id);
        if (staticFound) {
          setProduct(staticFound);
          setRelatedProducts(PRODUCTS.filter((p) => p.id !== id));
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProductData();
  }, [id]);

  useEffect(() => {
    if (product) {
      trackProductView(product.name, product.id, product.price);
    }
  }, [product?.id]);

  if (loading) {
    return (
      <div className="bg-[#0A0A0A] min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#39FF14] animate-spin mb-4" />
        <p className="text-gray-500 text-sm font-medium">Loading product specifications...</p>
      </div>
    );
  }

  if (!product) return <Navigate to="/products" replace />;

  return (
    <div className="bg-[#0A0A0A] min-h-screen">
      {/* Product Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            description: product.description,
            brand: { "@type": "Brand", name: "TRIP Mobility" },
            image: [window.location.origin + product.image],
            sku: product.id,
            offers: {
              "@type": "Offer",
              price: product.price,
              priceCurrency: "PHP",
              availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
              url: `https://tripmobility.ph/products/${product.id}`,
              priceValidUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split("T")[0],
              seller: { "@type": "Organization", name: "TRIP Mobility" },
            },
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: "4.9",
              reviewCount: "47",
              bestRating: "5",
            },
          }),
        }}
      />
      {/* FAQ Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ_ITEMS.map((faq) => ({
              "@type": "Question",
              name: faq.q,
              acceptedAnswer: { "@type": "Answer", text: faq.a },
            })),
          }),
        }}
      />
      {/* BreadcrumbList Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://tripmobility.ph" },
              { "@type": "ListItem", position: 2, name: "Models", item: "https://tripmobility.ph/products" },
              { "@type": "ListItem", position: 3, name: product.name, item: `https://tripmobility.ph/products/${product.id}` },
            ],
          }),
        }}
      />

      {/* Breadcrumb */}
      <div className="pt-24 pb-4 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 flex items-center gap-3">
          <Link to="/" className="text-gray-600 hover:text-gray-400 text-xs transition-colors">Home</Link>
          <span className="text-gray-700 text-xs">›</span>
          <Link to="/products" className="text-gray-600 hover:text-gray-400 text-xs transition-colors">Models</Link>
          <span className="text-gray-700 text-xs">›</span>
          <span className="text-[#39FF14] text-xs font-medium">{product.name}</span>
        </div>
      </div>

      {/* Main Hero */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-start">
            {/* Left: Product image */}
            <SectionObserver>
              <div className="relative">
                {product.badge && (
                  <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-[#39FF14] text-[#0A0A0A] text-xs font-bold rounded-full uppercase shadow-[0_0_15px_rgba(57,255,20,0.5)]">
                    {product.badge}
                  </div>
                )}
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-white/3 to-transparent border border-white/10 group">
                  <img src={product.image} alt={product.name} className="w-full object-cover aspect-[4/3] transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/40 to-transparent" />
                  {/* Radial glow */}
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(57,255,20,0.05)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
                {/* Color options */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {product.colors.map((color, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 glass rounded-full border border-white/10 text-xs text-gray-400">
                      <div className="w-2 h-2 rounded-full bg-[#39FF14]" />
                      {color}
                    </div>
                  ))}
                </div>
              </div>
            </SectionObserver>

            {/* Right: Info */}
            <SectionObserver delay={150}>
              <div>
                <p className="section-label mb-3">{product.tagline}</p>
                <h1 className="font-orbitron font-black text-4xl sm:text-5xl text-white mb-4 leading-tight">
                  {product.name}
                </h1>
                <p className="text-gray-400 leading-relaxed mb-8 text-base">{product.description}</p>

                {/* Key Specs */}
                <div className="grid grid-cols-3 gap-3 mb-8">
                  {[
                    { icon: Zap, label: "Motor", value: product.specs.motor.split(" ")[0] },
                    { icon: Battery, label: "Range", value: product.specs.range },
                    { icon: Gauge, label: "Top Speed", value: product.specs.topSpeed },
                  ].map((spec, i) => (
                    <div key={i} className="glass rounded-xl p-4 text-center border border-white/5 hover:border-[#39FF14]/20 transition-colors group">
                      <spec.icon className="w-5 h-5 text-[#39FF14] mx-auto mb-2 group-hover:scale-110 transition-transform" />
                      <p className="text-xs text-gray-500 mb-1">{spec.label}</p>
                      <p className="font-orbitron font-bold text-base text-white">{spec.value}</p>
                    </div>
                  ))}
                </div>

                {/* Pricing Card */}
                <div className="glass-green rounded-2xl p-6 mb-8 border border-[#39FF14]/20 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#39FF14]/5 rounded-full blur-2xl" />
                  <div className="relative flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Starting Price</p>
                      <p className="font-orbitron font-black text-5xl text-[#39FF14]">
                        ₱{product.price.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">or ≈ ₱{Math.ceil((product.price * 0.8) / 24 / 100) * 100}/mo · 24-month plan</p>
                    </div>
                    <div className="text-right space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <Shield className="w-4 h-4 text-[#39FF14]" />
                        <span className="text-xs text-gray-300">3-Year Warranty</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#39FF14]/10 border border-[#39FF14]/30 rounded-full">
                        <span className="w-2 h-2 rounded-full bg-[#39FF14] animate-pulse" />
                        <span className="text-xs text-[#39FF14] font-semibold">In Stock</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CTAs */}
                <div className="flex gap-3 mb-8">
                  <button onClick={() => { trackCTAClick("Get a Quote", "product_detail", "quote_modal"); setQuoteOpen(true); }} className="btn-primary flex-1 flex items-center justify-center gap-2">
                    <Zap className="w-4 h-4" />
                    Get a Quote
                  </button>
                  <button className="w-12 h-12 flex items-center justify-center glass rounded-xl border border-white/10 text-gray-400 hover:border-[#39FF14]/50 hover:text-[#39FF14] transition-all" title="Download Brochure">
                    <Download className="w-4 h-4" />
                  </button>
                  <button className="w-12 h-12 flex items-center justify-center glass rounded-xl border border-white/10 text-gray-400 hover:border-[#39FF14]/50 hover:text-[#39FF14] transition-all" title="Share">
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Trust badges */}
                <div className="flex flex-wrap gap-3">
                  {["Free Metro Manila Delivery", "Official Philippines Warranty", "72-Point QC Inspection"].map((badge) => (
                    <div key={badge} className="flex items-center gap-1.5 text-xs text-gray-500">
                      <CheckCircle className="w-3.5 h-3.5 text-[#39FF14]" />
                      {badge}
                    </div>
                  ))}
                </div>
              </div>
            </SectionObserver>
          </div>
        </div>
      </section>

      {/* Tabs Section */}
      <section className="py-8 bg-[#0D0D0D] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          {/* Tab Nav */}
          <div className="flex gap-1 overflow-x-auto border-b border-white/10 mb-8 pb-0 scrollbar-none">
            {([
              { id: "3d", label: "3D Viewer", icon: RotateCcw },
              { id: "features", label: "Features" },
              { id: "specs", label: "Full Specifications" },
              { id: "usecases", label: "Use Cases" },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-5 py-3 text-sm font-semibold transition-all border-b-2 -mb-px whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-[#39FF14] text-[#39FF14]"
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                {tab.id === "3d" && <RotateCcw className="w-3.5 h-3.5" />}
                {tab.label}
                {tab.id === "3d" && <span className="ml-1 text-[9px] px-1.5 py-0.5 bg-[#39FF14]/20 text-[#39FF14] rounded font-bold">INTERACTIVE</span>}
              </button>
            ))}
          </div>

          {/* 3D Viewer */}
          {activeTab === "3d" && (
            <div>
              <div className="mb-4">
                <h3 className="font-orbitron font-bold text-xl text-white mb-1">Interactive 3D Model</h3>
                <p className="text-gray-500 text-sm">Drag to rotate · Scroll to zoom · Click the glowing dots to explore components</p>
              </div>
              <Suspense fallback={
                <div className="w-full rounded-2xl border border-white/10 bg-[#080808] flex items-center justify-center" style={{ height: "460px" }}>
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-[#39FF14] animate-spin" />
                    <p className="text-gray-500 text-sm">Loading 3D viewer...</p>
                  </div>
                </div>
              }>
                <BikeViewer3D />
              </Suspense>
              <p className="text-xs text-gray-600 text-center mt-3">
                Geometric representation — actual product may vary. Contact us for real photos.
              </p>
            </div>
          )}

          {activeTab === "features" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {product.features.map((feat, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/2 transition-colors group">
                  <CheckCircle className="w-5 h-5 text-[#39FF14] shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                  <p className="text-gray-300 text-sm leading-relaxed">{feat}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === "specs" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 rounded-xl border border-white/8 overflow-hidden">
              {Object.entries(product.specs).map(([key, value], i) => (
                <div key={key} className={`flex items-center justify-between py-3.5 px-5 border-b border-white/5 ${i % 2 === 0 ? "bg-white/2" : "bg-transparent"} hover:bg-[#39FF14]/3 transition-colors`}>
                  <span className="text-gray-500 text-sm capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                  <span className="text-gray-200 text-sm font-semibold">{value}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "usecases" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {product.useCases.map((useCase, i) => (
                <div key={i} className="glass rounded-xl p-5 border border-white/5 hover:border-[#39FF14]/20 flex items-center gap-4 transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-[#39FF14]/10 flex items-center justify-center shrink-0 group-hover:bg-[#39FF14]/20 transition-colors">
                    <CheckCircle className="w-5 h-5 text-[#39FF14]" />
                  </div>
                  <p className="text-gray-300 text-sm font-medium">{useCase}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FAQs */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-6">
          <SectionObserver>
            <h2 className="font-orbitron font-bold text-3xl text-white mb-8 text-center">
              Frequently Asked <span className="gradient-text">Questions</span>
            </h2>
          </SectionObserver>
          <div className="space-y-3">
            {FAQ_ITEMS.map((faq, i) => (
              <SectionObserver key={i} delay={i * 60}>
                <div className="glass rounded-xl border border-white/5 overflow-hidden hover:border-white/10 transition-colors">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-white/2 transition-colors"
                  >
                    <span className="text-sm font-semibold text-white pr-4 leading-relaxed">{faq.q}</span>
                    {openFaq === i
                      ? <ChevronUp className="w-4 h-4 text-[#39FF14] shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                    }
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-5 text-sm text-gray-400 leading-relaxed border-t border-white/5 pt-4">
                      {faq.a}
                    </div>
                  )}
                </div>
              </SectionObserver>
            ))}
          </div>
        </div>
      </section>

      {/* Related Models */}
      <section className="py-16 bg-[#0D0D0D]">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="font-orbitron font-bold text-2xl text-white mb-8">Explore Other Models</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {relatedProducts.slice(0, 2).map((p) => (
              <Link key={p.id} to={`/products/${p.id}`} className="glass rounded-xl p-4 border border-white/5 hover:border-[#39FF14]/30 transition-all group flex gap-4">
                <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0">
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-orbitron font-bold text-lg text-white group-hover:text-[#39FF14] transition-colors">{p.name}</p>
                  <p className="text-xs text-gray-500 mb-2">{p.specs.motor} · {p.specs.range} range</p>
                  <p className="font-orbitron font-bold text-[#39FF14] text-base">₱{p.price.toLocaleString()}</p>
                  {p.badge && <span className="text-[10px] px-2 py-0.5 bg-[#39FF14]/15 text-[#39FF14] rounded font-bold uppercase mt-1 inline-block">{p.badge}</span>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#39FF14]/8 via-transparent to-[#00FFFF]/5" />
        <div className="relative max-w-2xl mx-auto px-6">
          <p className="section-label mb-4">Ready to Ride Electric?</p>
          <h2 className="font-orbitron font-bold text-4xl text-white mb-4">
            Get Your <span className="gradient-text">Personalized Quote</span>
          </h2>
          <p className="text-gray-400 mb-8">Our specialists will build a custom proposal for the {product.name} tailored to your exact needs.</p>
          <button onClick={() => setQuoteOpen(true)} className="btn-primary flex items-center gap-2 mx-auto">
            <Zap className="w-4 h-4" />
            Request Quote for {product.name}
          </button>
        </div>
      </section>

      {/* ── Product Reviews ── */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-6">
          <ProductReviews
            productId={product.id}
            productName={product.name}
            onRequestAuth={() => setAuthModalOpen(true)}
          />
        </div>
      </section>

      <QuoteModal open={quoteOpen} onClose={() => setQuoteOpen(false)} preselectedProduct={product.name} />
      <CustomerAuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => setAuthModalOpen(false)}
        title="Sign In to Review"
        subtitle="Create a free TRIP account or sign in to write a review for this product."
      />
    </div>
  );
}
