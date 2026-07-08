import { useState } from "react";
import { Package, Building2, Shield, MapPin, Truck, GraduationCap, CheckCircle, ArrowRight } from "lucide-react";
import { INDUSTRIES } from "@/constants/data";
import SectionObserver from "@/components/features/SectionObserver";
import ParticleField from "@/components/features/ParticleField";
import QuoteModal from "@/components/features/QuoteModal";

const ICON_MAP: Record<string, React.ElementType> = {
  Package, Building2, Shield, MapPin, Truck, GraduationCap
};

const INDUSTRY_DETAILS: Record<string, { benefits: string[]; caseStudy: { title: string; result: string } }> = {
  delivery: {
    benefits: ["100+ km range enables full shift operations", "80% lower fuel cost vs petrol motorcycles", "Heavy-duty rack supports 50kg payload", "Dual battery for zero downtime"],
    caseStudy: { title: "QuickBites Delivery", result: "20 units deployed, ROI in 4 months, ₱800K annual savings" },
  },
  corporate: {
    benefits: ["Custom branding and livery available", "Centralized fleet management dashboard", "Dedicated account manager", "Volume pricing up to 20% off"],
    caseStudy: { title: "Ayala Corporation", result: "50 units for campus mobility, 100% employee satisfaction" },
  },
  government: {
    benefits: ["Silent patrol operations", "Emergency priority spare parts", "Extended 5-year government warranty", "LGU financing programs available"],
    caseStudy: { title: "Quezon City LGU", result: "15 Ranger 750 patrol units, 40% reduction in patrol costs" },
  },
  tourism: {
    benefits: ["Eco-friendly brand positioning for resorts", "Custom color and logo wraps", "Easy charging station setup", "Guest experience enhancement"],
    caseStudy: { title: "Palawan Island Resort", result: "8 Fold X units, 95% guest satisfaction score" },
  },
  logistics: {
    benefits: ["GPS tracking included", "Real-time fleet monitoring", "On-site maintenance contracts", "Bulk purchase 15% discount"],
    caseStudy: { title: "Speed Logistics Inc.", result: "30 Cargo Pro units, ₱2M annual operational savings" },
  },
  education: {
    benefits: ["20% educational institution discount", "Semester-based payment plans", "Campus charging infrastructure support", "Student safety training included"],
    caseStudy: { title: "Ateneo de Manila", result: "20 Fold X units pending, campus mobility program launch" },
  },
};

export default function IndustriesPage() {
  const [activeIndustry, setActiveIndustry] = useState("delivery");
  const [quoteOpen, setQuoteOpen] = useState(false);
  const active = INDUSTRIES.find((i) => i.id === activeIndustry)!;
  const details = INDUSTRY_DETAILS[activeIndustry];

  return (
    <div className="bg-[#0A0A0A] min-h-screen">
      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <ParticleField />
        <div className="absolute inset-0 bg-hero-gradient" />
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <p className="section-label mb-4">Industry Solutions</p>
          <h1 className="font-orbitron font-black text-5xl sm:text-6xl text-white mb-6">
            E-Mobility for Every <span className="gradient-text">Sector</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            From individual delivery riders to government fleets — TRIP Mobility has purpose-built solutions for every Philippine industry.
          </p>
        </div>
      </section>

      {/* Industry Navigator */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-12">
            {INDUSTRIES.map((ind) => {
              const Icon = ICON_MAP[ind.icon];
              return (
                <button
                  key={ind.id}
                  onClick={() => setActiveIndustry(ind.id)}
                  className={`p-4 rounded-xl border transition-all duration-300 flex flex-col items-center gap-2 ${
                    activeIndustry === ind.id
                      ? "border-[#39FF14]/60 bg-[#39FF14]/10 text-[#39FF14]"
                      : "border-white/10 text-gray-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-semibold text-center leading-tight">{ind.title}</span>
                </button>
              );
            })}
          </div>

          {/* Active Industry Detail */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <SectionObserver>
              <div className={`rounded-2xl p-8 bg-gradient-to-br ${active.color} border border-white/5`}>
                <div className="mb-6">
                  <p className="text-[#39FF14] font-bold text-sm uppercase tracking-widest mb-2">{active.stat}</p>
                  <h2 className="font-orbitron font-bold text-3xl text-white mb-4">{active.title}</h2>
                  <p className="text-gray-400 leading-relaxed">{active.description}</p>
                </div>

                <div className="space-y-3 mb-8">
                  {details.benefits.map((b, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-[#39FF14] shrink-0 mt-0.5" />
                      <p className="text-gray-300 text-sm">{b}</p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setQuoteOpen(true)}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  Get Industry Quote <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </SectionObserver>

            <SectionObserver delay={150}>
              <div>
                <p className="section-label mb-3">Case Study</p>
                <div className="glass rounded-2xl p-8 border border-white/5 mb-6">
                  <h3 className="font-orbitron font-bold text-xl text-white mb-3">{details.caseStudy.title}</h3>
                  <p className="text-gray-300 leading-relaxed">{details.caseStudy.result}</p>
                </div>

                <div className="glass rounded-2xl p-6 border border-[#39FF14]/20 bg-[#39FF14]/5">
                  <p className="text-xs text-[#39FF14] uppercase tracking-widest font-semibold mb-3">Recommended Model</p>
                  <p className="text-white font-bold text-lg">
                    {activeIndustry === "delivery" || activeIndustry === "logistics" ? "TRIP Cargo Pro" : activeIndustry === "mountain" ? "TRIP Ranger 750" : "TRIP Fold X"}
                  </p>
                  <p className="text-gray-400 text-sm mt-2">
                    {activeIndustry === "delivery" ? "500W motor · 100–120 km range · Dual battery" : "500W motor · 40–50 km range · Foldable"}
                  </p>
                </div>
              </div>
            </SectionObserver>
          </div>
        </div>
      </section>

      {/* Stats Band */}
      <section className="py-16 bg-[#0D0D0D]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { value: "200+", label: "Business Clients" },
              { value: "12", label: "LGU Partners" },
              { value: "3,000+", label: "Units in Service" },
              { value: "80%", label: "Avg Cost Reduction" },
            ].map((stat, i) => (
              <SectionObserver key={i} delay={i * 100}>
                <div className="text-center">
                  <p className="font-orbitron font-black text-4xl text-[#39FF14] mb-2">{stat.value}</p>
                  <p className="text-gray-400 text-sm">{stat.label}</p>
                </div>
              </SectionObserver>
            ))}
          </div>
        </div>
      </section>

      <QuoteModal open={quoteOpen} onClose={() => setQuoteOpen(false)} />
    </div>
  );
}
