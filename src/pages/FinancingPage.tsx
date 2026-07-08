import { useState } from "react";
import { CheckCircle, Calculator, ArrowRight, DollarSign, Clock, Users, Zap } from "lucide-react";
import { FINANCING_OPTIONS } from "@/constants/data";
import SectionObserver from "@/components/features/SectionObserver";
import ParticleField from "@/components/features/ParticleField";
import QuoteModal from "@/components/features/QuoteModal";
import FleetROICalculator from "@/components/features/FleetROICalculator";
import { PRODUCTS } from "@/constants/products";

export default function FinancingPage() {
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [calcProduct, setCalcProduct] = useState(PRODUCTS[0].price);
  const [calcQty, setCalcQty] = useState(1);
  const [calcTerm, setCalcTerm] = useState(24);
  const [calcDown, setCalcDown] = useState(20);

  const totalPrice = calcProduct * calcQty;
  const downPaymentAmt = totalPrice * (calcDown / 100);
  const loanAmt = totalPrice - downPaymentAmt;
  const monthlyRate = 0.015; // 1.5% monthly interest
  const monthlyPayment = loanAmt * (monthlyRate * Math.pow(1 + monthlyRate, calcTerm)) / (Math.pow(1 + monthlyRate, calcTerm) - 1);

  return (
    <div className="bg-[#0A0A0A] min-h-screen">
      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <ParticleField />
        <div className="absolute inset-0 bg-hero-gradient" />
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <p className="section-label mb-4">Flexible Financing</p>
          <h1 className="font-orbitron font-black text-5xl sm:text-6xl text-white mb-6">
            Own Your <span className="gradient-text">TRIP E-Bike</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Accessible financing from individual riders to enterprise fleets. As low as ₱2,000/month.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <SectionObserver>
            <h2 className="font-orbitron font-bold text-3xl text-white mb-10 text-center">
              Choose Your <span className="gradient-text">Plan</span>
            </h2>
          </SectionObserver>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {FINANCING_OPTIONS.map((option, i) => (
              <SectionObserver key={option.id} delay={i * 120}>
                <div
                  className={`rounded-2xl p-8 h-full flex flex-col relative ${
                    option.highlight
                      ? "glass-green border border-[#39FF14]/30"
                      : "glass border border-white/5"
                  }`}
                >
                  {option.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#39FF14] text-[#0A0A0A] text-xs font-bold rounded-full">
                      Most Popular
                    </div>
                  )}
                  <div className="mb-6">
                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">{option.target}</p>
                    <h3 className="font-orbitron font-bold text-2xl text-white mb-3">{option.title}</h3>
                    <div className="flex gap-4">
                      <div className="glass rounded-lg px-3 py-2 text-center">
                        <p className="text-[#39FF14] font-bold text-lg">{option.downPayment}</p>
                        <p className="text-xs text-gray-500">Down Payment</p>
                      </div>
                      <div className="glass rounded-lg px-3 py-2 text-center">
                        <p className="text-[#39FF14] font-bold text-lg">{option.terms.split("–")[1] || option.terms}</p>
                        <p className="text-xs text-gray-500">Max Term</p>
                      </div>
                    </div>
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
                    Apply for This Plan
                  </button>
                </div>
              </SectionObserver>
            ))}
          </div>
        </div>
      </section>

      {/* Calculator */}
      <section className="py-16 bg-[#0D0D0D]">
        <div className="max-w-4xl mx-auto px-6">
          <SectionObserver>
            <div className="text-center mb-10">
              <p className="section-label mb-3">Payment Estimator</p>
              <h2 className="font-orbitron font-bold text-3xl text-white">
                Calculate Your <span className="gradient-text">Monthly Payment</span>
              </h2>
            </div>
          </SectionObserver>
          <SectionObserver delay={100}>
            <div className="glass rounded-2xl p-8 border border-white/5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wide">Select Model</label>
                    <select
                      value={calcProduct}
                      onChange={(e) => setCalcProduct(Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#39FF14]/50"
                    >
                      {PRODUCTS.map((p) => (
                        <option key={p.id} value={p.price} style={{ background: "#1A1A1A" }}>
                          {p.name} — ₱{p.price.toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wide">Quantity: {calcQty} unit{calcQty > 1 ? "s" : ""}</label>
                    <input
                      type="range" min={1} max={50} value={calcQty}
                      onChange={(e) => setCalcQty(Number(e.target.value))}
                      className="w-full accent-[#39FF14]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wide">Down Payment: {calcDown}%</label>
                    <input
                      type="range" min={10} max={50} step={5} value={calcDown}
                      onChange={(e) => setCalcDown(Number(e.target.value))}
                      className="w-full accent-[#39FF14]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wide">Loan Term: {calcTerm} months</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[12, 24, 36, 48].map((t) => (
                        <button
                          key={t}
                          onClick={() => setCalcTerm(t)}
                          className={`py-2 rounded-lg border text-xs font-semibold transition-all ${
                            calcTerm === t
                              ? "border-[#39FF14]/60 bg-[#39FF14]/10 text-[#39FF14]"
                              : "border-white/10 text-gray-400 hover:border-white/20"
                          }`}
                        >
                          {t}mo
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="glass-green rounded-xl p-6 border border-[#39FF14]/20 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Total Price</p>
                      <p className="font-orbitron font-bold text-2xl text-white">₱{totalPrice.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Down Payment ({calcDown}%)</p>
                      <p className="font-orbitron font-bold text-xl text-gray-300">₱{Math.round(downPaymentAmt).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Loan Amount</p>
                      <p className="font-orbitron font-bold text-xl text-gray-300">₱{Math.round(loanAmt).toLocaleString()}</p>
                    </div>
                    <div className="pt-4 border-t border-[#39FF14]/20">
                      <p className="text-xs text-[#39FF14] uppercase tracking-wide font-bold mb-1">Estimated Monthly Payment</p>
                      <p className="font-orbitron font-black text-4xl text-[#39FF14]">₱{Math.round(monthlyPayment).toLocaleString()}</p>
                      <p className="text-xs text-gray-500 mt-1">*Estimate only. Actual rates may vary.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setQuoteOpen(true)}
                    className="btn-primary w-full mt-6 flex items-center justify-center gap-2"
                  >
                    <Calculator className="w-4 h-4" />
                    Apply Now
                  </button>
                </div>
              </div>
            </div>
          </SectionObserver>
        </div>
      </section>

      {/* Fleet ROI Calculator */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6">
          <SectionObserver>
            <div className="text-center mb-10">
              <p className="section-label mb-3">For Fleet Operators</p>
              <h2 className="font-orbitron font-bold text-3xl text-white">
                Calculate Your <span className="gradient-text">Fleet ROI</span>
              </h2>
              <p className="text-gray-400 text-sm mt-3 max-w-xl mx-auto">
                See exactly how much your business saves by switching from petrol to TRIP E-Bikes
              </p>
            </div>
          </SectionObserver>
          <SectionObserver delay={100}>
            <FleetROICalculator />
          </SectionObserver>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { icon: Zap, title: "Fast Approval", desc: "Get financing approved in as fast as 24 hours" },
              { icon: DollarSign, title: "Low Down Payment", desc: "Start riding with as low as 10% down" },
              { icon: Clock, title: "Flexible Terms", desc: "12 to 60 month terms available" },
              { icon: Users, title: "Fleet Discounts", desc: "Up to 20% discount on bulk fleet orders" },
            ].map((item, i) => (
              <SectionObserver key={i} delay={i * 100}>
                <div className="glass rounded-xl p-6 border border-white/5 text-center hover:border-[#39FF14]/20 transition-all">
                  <item.icon className="w-6 h-6 text-[#39FF14] mx-auto mb-3" />
                  <h3 className="font-bold text-white text-sm mb-2">{item.title}</h3>
                  <p className="text-gray-400 text-xs">{item.desc}</p>
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
