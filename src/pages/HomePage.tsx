import { useState, useEffect } from "react";
import { trackPageView, trackCTAClick, trackQuoteModalOpen } from "@/hooks/useTracking";
import { Link } from "react-router-dom";
import {
  Zap, ChevronDown, ArrowRight, Play, Star, Battery, Gauge, Award,
  Leaf, Shield, Users, TrendingUp, CheckCircle, Quote, Landmark,
  Compass, GraduationCap, Truck
} from "lucide-react";
import heroBike from "@/assets/hero-bike.jpg";
import particleBg from "@/assets/particle-bg.jpg";
import sustainabilityBg from "@/assets/sustainability-bg.jpg";
import useCaseDelivery from "@/assets/use-case-delivery.jpg";
import useCaseCorporate from "@/assets/use-case-corporate.jpg";
import { PRODUCTS } from "@/constants/products";
import { MOCK_TESTIMONIALS, FINANCING_OPTIONS } from "@/constants/data";
import ProductCard from "@/components/features/ProductCard";
import ParticleField from "@/components/features/ParticleField";
import SectionObserver from "@/components/features/SectionObserver";
import QuoteModal from "@/components/features/QuoteModal";
import BikeAssemblyAnimation from "@/components/features/BikeAssemblyAnimation";
import { CompareBar, CompareModal } from "@/components/features/ProductComparison";

const STATS = [
  { value: "3,000+", label: "Units Deployed", icon: Zap },
  { value: "100+", label: "km Max Range", icon: Battery },
  { value: "200+", label: "Business Clients", icon: Users },
  { value: "3-Year", label: "Warranty", icon: Shield },
];

export default function HomePage() {
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | undefined>();

  useEffect(() => {
    trackPageView("/", "Home — TRIP Mobility | Premium Electric Bikes Philippines");
    document.title = "TRIP Mobility | Premium Electric Bikes Philippines";
    // Organization schema injection
    const existing = document.getElementById("org-schema");
    if (!existing) {
      const script = document.createElement("script");
      script.id = "org-schema";
      script.type = "application/ld+json";
      script.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "TRIP Mobility",
        "url": "https://tripmobility.ph",
        "logo": "https://tripmobility.ph/favicon.svg",
        "description": "Philippines' #1 premium electric bike brand. Purpose-built e-bikes for delivery, corporate fleets, and personal mobility.",
        "foundingDate": "2022",
        "areaServed": "PH",
        "contactPoint": [
          { "@type": "ContactPoint", "contactType": "Sales", "telephone": "+63-2-8888-8747", "email": "sales@tripmobility.ph", "availableLanguage": ["English", "Filipino"] },
          { "@type": "ContactPoint", "contactType": "Customer Support", "telephone": "+63-917-888-8747", "email": "support@tripmobility.ph" }
        ],
        "address": { "@type": "PostalAddress", "streetAddress": "123 Electric Avenue, Barangay TRIP", "addressLocality": "Mandaluyong City", "addressRegion": "Metro Manila", "postalCode": "1550", "addressCountry": "PH" },
        "sameAs": [
          "https://facebook.com/tripmobility",
          "https://instagram.com/tripmobility",
          "https://tiktok.com/@tripmobility",
          "https://linkedin.com/company/tripmobility"
        ]
      });
      document.head.appendChild(script);
    }
    return () => { const s = document.getElementById("org-schema"); if (s) s.remove(); };
  }, []);

  const handleProductQuote = (productName: string) => {
    setSelectedProduct(productName);
    trackQuoteModalOpen("product_card", productName);
    setQuoteOpen(true);
  };

  return (
    <div className="bg-[#0A0A0A]">
      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Particle layer */}
        <ParticleField />

        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src={heroBike}
            alt="TRIP E-Bike"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A]/60 via-transparent to-[#0A0A0A]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A]/80 via-transparent to-[#0A0A0A]/60" />
        </div>

        {/* Radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#39FF14]/8 rounded-full blur-[120px] pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#39FF14]/30 bg-[#39FF14]/5 mb-8 animate-fade-up">
            <span className="w-2 h-2 rounded-full bg-[#39FF14] animate-pulse" />
            <span className="text-xs text-[#39FF14] font-medium tracking-widest uppercase">Introducing TRIP BIKES</span>
          </div>

          <h1 className="font-orbitron font-black text-5xl sm:text-6xl lg:text-8xl text-white mb-6 leading-tight animate-fade-up">
            RIDE THE{" "}
            <span className="gradient-text">FUTURE.</span>
            <br />
            A NEW KIND OF <span className="gradient-text">TRIP.</span>
          </h1>

          <p className="text-gray-400 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-up">
            Premium electric bikes engineered for Philippine roads. From last-mile delivery to mountain trails — TRIP Mobility powers every journey.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up">
            <button
              onClick={() => { trackQuoteModalOpen("hero_cta"); trackCTAClick("Get a Free Quote", "hero"); setQuoteOpen(true); }}
              className="btn-primary text-sm flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Get a Free Quote
            </button>
            <Link to="/products" className="btn-outline text-sm flex items-center justify-center gap-2">
              Explore Models
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Floating stats */}
          <div className="mt-20 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {STATS.map((stat, i) => (
              <div key={i} className="glass rounded-xl p-4 border border-white/5">
                <stat.icon className="w-5 h-5 text-[#39FF14] mb-2" />
                <p className="font-orbitron font-bold text-2xl text-white">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
            <p className="text-xs text-gray-600 tracking-widest uppercase">Scroll</p>
            <ChevronDown className="w-4 h-4 text-gray-600" />
          </div>
        </div>
      </section>

      {/* ── WHY TRIP ── */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-section-gradient" />
        <div className="relative max-w-7xl mx-auto px-6">
          <SectionObserver>
            <div className="text-center mb-16">
              <p className="section-label mb-3">Why Choose TRIP</p>
              <h2 className="font-orbitron font-bold text-4xl sm:text-5xl text-white">
                Built Different. Built{" "}
                <span className="gradient-text">Better.</span>
              </h2>
            </div>
          </SectionObserver>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Zap,
                title: "Premium Performance",
                desc: "500W–750W motors with enterprise-grade components. Every TRIP bike undergoes 72-point quality checks before delivery.",
              },
              {
                icon: Battery,
                title: "Longest Range",
                desc: "Dual-battery systems deliver up to 120km per charge — the longest range in its class for Philippine conditions.",
              },
              {
                icon: Shield,
                title: "3-Year Warranty",
                desc: "Industry-leading warranty coverage with nationwide service centers and genuine spare parts guaranteed.",
              },
              {
                icon: TrendingUp,
                title: "Proven ROI",
                desc: "Clients report 80% reduction in fuel costs. Average ROI achieved within 4–6 months of fleet deployment.",
              },
              {
                icon: Leaf,
                title: "Zero Emissions",
                desc: "Each TRIP e-bike eliminates approximately 1.2 tons of CO₂ annually compared to petrol motorcycles.",
              },
              {
                icon: Award,
                title: "After-Sales Excellence",
                desc: "Dedicated support team, same-day spare parts delivery, and nationwide service network across the Philippines.",
              },
            ].map((feature, i) => (
              <SectionObserver key={i} delay={i * 100}>
                <div className="glass rounded-xl p-6 border border-white/5 hover:border-[#39FF14]/30 transition-all duration-500 group h-full">
                  <div className="w-12 h-12 rounded-xl bg-[#39FF14]/10 border border-[#39FF14]/20 flex items-center justify-center mb-4 group-hover:bg-[#39FF14]/20 transition-colors">
                    <feature.icon className="w-6 h-6 text-[#39FF14]" />
                  </div>
                  <h3 className="font-orbitron font-bold text-lg text-white mb-2 group-hover:text-[#39FF14] transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
                </div>
              </SectionObserver>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRODUCTS ── */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6">
          <SectionObserver>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-16 gap-4">
              <div>
                <p className="section-label mb-3">Our Lineup</p>
                <h2 className="font-orbitron font-bold text-4xl sm:text-5xl text-white">
                  The TRIP{" "}
                  <span className="gradient-text">Collection</span>
                </h2>
              </div>
              <Link to="/products" className="btn-outline text-sm whitespace-nowrap flex items-center gap-2">
                View All Models <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </SectionObserver>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {PRODUCTS.map((product, i) => (
              <SectionObserver key={product.id} delay={i * 150}>
                <ProductCard
                  product={product}
                  onQuote={() => handleProductQuote(product.name)}
                />
              </SectionObserver>
            ))}
          </div>
        </div>
      </section>

      {/* ── BIKE ASSEMBLY ANIMATION ── */}
      <BikeAssemblyAnimation />

      {/* ── CINEMATIC SHOWCASE ── */}
      <section className="relative py-32 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${particleBg})` }}
        />
        <div className="absolute inset-0 bg-[#0A0A0A]/70" />
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <SectionObserver>
            <p className="section-label mb-4">Performance Metrics</p>
            <h2 className="font-orbitron font-bold text-4xl sm:text-6xl text-white mb-6">
              By the <span className="gradient-text">Numbers</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto mb-16">
              Real-world performance data from 3,000+ TRIP e-bikes deployed across the Philippines.
            </p>
          </SectionObserver>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {[
              { metric: "120km", label: "Max Single Charge Range", bar: 100 },
              { metric: "50km/h", label: "Peak Top Speed", bar: 83 },
              { metric: "180kg", label: "Max Payload Capacity", bar: 72 },
            ].map((item, i) => (
              <SectionObserver key={i} delay={i * 150}>
                <div className="glass-green rounded-2xl p-8 text-center">
                  <p className="font-orbitron font-black text-5xl text-[#39FF14] mb-2">{item.metric}</p>
                  <p className="text-gray-400 text-sm mb-6">{item.label}</p>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="metric-bar"
                      style={{ width: `${item.bar}%` }}
                    />
                  </div>
                </div>
              </SectionObserver>
            ))}
          </div>
        </div>
      </section>

      {/* ── USE CASES ── */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <SectionObserver>
            <div className="text-center mb-16">
              <p className="section-label mb-3">Industries We Serve</p>
              <h2 className="font-orbitron font-bold text-4xl sm:text-5xl text-white">
                Powering Every <span className="gradient-text">Sector</span>
              </h2>
            </div>
          </SectionObserver>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <SectionObserver>
              <div className="relative rounded-2xl overflow-hidden h-80 group">
                <img src={useCaseDelivery} alt="Delivery" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/40 to-transparent" />
                <div className="absolute bottom-0 left-0 p-8">
                  <span className="section-label mb-2 block">Delivery & Logistics</span>
                  <h3 className="font-orbitron font-bold text-2xl text-white mb-2">Built for the Last Mile</h3>
                  <p className="text-gray-300 text-sm mb-4">100+ km range powers full delivery shifts without stops</p>
                  <Link to="/industries" className="btn-compact-primary">
                    Learn More <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </SectionObserver>

            <SectionObserver delay={150}>
              <div className="relative rounded-2xl overflow-hidden h-80 group">
                <img src={useCaseCorporate} alt="Corporate" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/40 to-transparent" />
                <div className="absolute bottom-0 left-0 p-8">
                  <span className="section-label mb-2 block">Corporate & Enterprise</span>
                  <h3 className="font-orbitron font-bold text-2xl text-white mb-2">Fleet Solutions at Scale</h3>
                  <p className="text-gray-300 text-sm mb-4">Custom branding, centralized management, dedicated support</p>
                  <Link to="/industries" className="btn-compact-primary">
                    Learn More <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </SectionObserver>
          </div>

          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Government", icon: Landmark, color: "hover:border-purple-500/50 hover:shadow-[0_0_30px_rgba(168,85,247,0.25)]" },
              { label: "Tourism & Resorts", icon: Compass, color: "hover:border-cyan-500/50 hover:shadow-[0_0_30px_rgba(6,182,212,0.25)]" },
              { label: "Universities", icon: GraduationCap, color: "hover:border-blue-500/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.25)]" },
              { label: "Logistics", icon: Truck, color: "hover:border-[#39FF14]/50 hover:shadow-[0_0_30px_rgba(57,255,20,0.25)]" },
            ].map((item, i) => (
              <SectionObserver key={i} delay={i * 80}>
                <Link
                  to="/industries"
                  className={`glass rounded-xl p-6 text-center border border-white/5 transition-all duration-300 group block hover:scale-[1.03] ${item.color}`}
                >
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-[#39FF14]/10 group-hover:border-[#39FF14]/30 transition-all duration-300">
                    <item.icon className="w-6 h-6 text-gray-400 group-hover:text-[#39FF14] group-hover:scale-110 transition-all duration-300" />
                  </div>
                  <p className="text-sm text-gray-300 group-hover:text-white font-orbitron font-bold tracking-wide transition-colors">
                    {item.label}
                  </p>
                </Link>
              </SectionObserver>
            ))}
          </div>
        </div>
      </section>

      {/* ── SUSTAINABILITY ── */}
      <section className="relative py-24 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${sustainabilityBg})` }}
        />
        <div className="absolute inset-0 bg-[#0A0A0A]/85" />
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <SectionObserver>
              <p className="section-label mb-4">Sustainability</p>
              <h2 className="font-orbitron font-bold text-4xl sm:text-5xl text-white mb-6">
                Riding Towards a <span className="gradient-text">Greener PH</span>
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed mb-8">
                Every TRIP e-bike on the road removes a petrol motorbike that emits 2.5kg of CO₂ per day. Our mission is to electrify 100,000 journeys across the Philippines by 2027.
              </p>
              <div className="space-y-4">
                {[
                  "1.2 tons of CO₂ saved per bike annually",
                  "Zero tailpipe emissions in Philippine cities",
                  "Recyclable lithium-ion battery program",
                  "Solar charging partnerships in development",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-[#39FF14] shrink-0" />
                    <p className="text-gray-300 text-sm">{item}</p>
                  </div>
                ))}
              </div>
            </SectionObserver>

            <SectionObserver delay={200}>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: "3,600+", label: "Tons CO₂ Saved", color: "from-green-500/20" },
                  { value: "100K", label: "Goal by 2027", color: "from-cyan-500/20" },
                  { value: "₱0", label: "Fuel Cost/Day", color: "from-yellow-500/20" },
                  { value: "12 LGUs", label: "Government Partners", color: "from-purple-500/20" },
                ].map((item, i) => (
                  <div key={i} className={`glass rounded-xl p-6 bg-gradient-to-br ${item.color} to-transparent border border-white/5`}>
                    <p className="font-orbitron font-black text-3xl text-[#39FF14] mb-1">{item.value}</p>
                    <p className="text-xs text-gray-400">{item.label}</p>
                  </div>
                ))}
              </div>
            </SectionObserver>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <SectionObserver>
            <div className="text-center mb-16">
              <p className="section-label mb-3">Customer Stories</p>
              <h2 className="font-orbitron font-bold text-4xl sm:text-5xl text-white">
                Trusted by <span className="gradient-text">Thousands</span>
              </h2>
            </div>
          </SectionObserver>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {MOCK_TESTIMONIALS.map((t, i) => (
              <SectionObserver key={t.id} delay={i * 100}>
                <div className="glass rounded-xl p-6 border border-white/5 hover:border-[#39FF14]/20 transition-all h-full flex flex-col">
                  <Quote className="w-6 h-6 text-[#39FF14]/40 mb-3" />
                  <p className="text-gray-300 text-sm leading-relaxed mb-6 flex-1">{t.review}</p>
                  <div>
                    <div className="flex mb-3">
                      {Array.from({ length: t.rating }).map((_, j) => (
                        <Star key={j} className="w-4 h-4 text-[#39FF14] fill-[#39FF14]" />
                      ))}
                    </div>
                    <p className="font-semibold text-white text-sm">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.role} · {t.company}</p>
                    <p className="text-xs text-[#39FF14] mt-1">{t.product}</p>
                  </div>
                </div>
              </SectionObserver>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINANCING PREVIEW ── */}
      <section className="py-24 bg-[#0D0D0D]">
        <div className="max-w-7xl mx-auto px-6">
          <SectionObserver>
            <div className="text-center mb-16">
              <p className="section-label mb-3">Flexible Financing</p>
              <h2 className="font-orbitron font-bold text-4xl sm:text-5xl text-white">
                Own a TRIP E-Bike <span className="gradient-text">Your Way</span>
              </h2>
              <p className="text-gray-400 mt-4 max-w-xl mx-auto">
                From individual riders to enterprise fleets — we have financing options that make owning a TRIP e-bike accessible.
              </p>
            </div>
          </SectionObserver>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FINANCING_OPTIONS.map((option, i) => (
              <SectionObserver key={option.id} delay={i * 120}>
                <div
                  className={`rounded-2xl p-8 h-full flex flex-col transition-all duration-500 ${
                    option.highlight
                      ? "glass-green border border-[#39FF14]/30 relative"
                      : "glass border border-white/5"
                  }`}
                >
                  {option.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#39FF14] text-[#0A0A0A] text-xs font-bold rounded-full uppercase">
                      Most Popular
                    </div>
                  )}
                  <div className="mb-6">
                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">{option.target}</p>
                    <h3 className="font-orbitron font-bold text-2xl text-white">{option.title}</h3>
                    <p className="text-sm text-gray-400 mt-2">
                      <span className="text-[#39FF14] font-semibold">{option.downPayment}</span> down · {option.terms}
                    </p>
                  </div>
                  <ul className="space-y-3 flex-1">
                    {option.features.map((feat, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-gray-300">
                        <CheckCircle className="w-4 h-4 text-[#39FF14] shrink-0 mt-0.5" />
                        {feat}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => setQuoteOpen(true)}
                    className={`mt-8 w-full ${option.highlight ? "btn-primary" : "btn-outline"} text-sm`}
                  >
                    Get This Plan
                  </button>
                </div>
              </SectionObserver>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#39FF14]/10 via-transparent to-[#00FFFF]/8" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#39FF14]/5 rounded-full blur-[80px]" />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <SectionObserver>
            <p className="section-label mb-4">Ready to Go Electric?</p>
            <h2 className="font-orbitron font-black text-5xl sm:text-6xl text-white mb-6">
              Your Journey Starts <span className="gradient-text">Here.</span>
            </h2>
            <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto">
              Talk to a TRIP e-mobility expert today. Get a personalized quote, discover our financing options, and join the Philippine E-Mobility revolution.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setQuoteOpen(true)}
                className="btn-primary text-sm flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Get a Personalized Quote
              </button>
              <Link to="/contact" className="btn-outline text-sm">
                Contact Our Team
              </Link>
            </div>
          </SectionObserver>
        </div>
      </section>

      <QuoteModal
        open={quoteOpen}
        onClose={() => { setQuoteOpen(false); setSelectedProduct(undefined); }}
        preselectedProduct={selectedProduct}
      />

      {/* Product comparison - available from homepage cards too */}
      <CompareBar onOpen={() => {
        // Navigate to products page to see full comparison
        window.location.href = '/products';
      }} />
    </div>
  );
}
