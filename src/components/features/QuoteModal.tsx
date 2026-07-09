import { useState, useEffect, useCallback } from "react";
import { trackQuoteStep, trackQuoteSubmit } from "@/hooks/useTracking";
import { X, CheckCircle, ChevronRight, ChevronLeft, User, Briefcase, Bike, Hash, DollarSign, Phone, FileText, Zap, Building2, Mail, Smartphone, UserPlus, Lock, LayoutDashboard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PRODUCTS } from "@/constants/products";
import { apiClient } from "@/lib/api-client";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import CustomerAuthModal from "@/components/features/CustomerAuthModal";

interface QuoteModalProps {
  open: boolean;
  onClose: () => void;
  preselectedProduct?: string;
}

const STEPS = [
  { id: "info", label: "Your Info", icon: User, desc: "Auto-filled from your account" },
  { id: "use", label: "Use Type", icon: Briefcase, desc: "How will you use it?" },
  { id: "model", label: "Bike Model", icon: Bike, desc: "Choose your TRIP" },
  { id: "qty", label: "Quantity", icon: Hash, desc: "How many units?" },
  { id: "budget", label: "Budget", icon: DollarSign, desc: "Your investment range" },
  { id: "contact", label: "Contact", icon: Phone, desc: "How to reach you" },
  { id: "notes", label: "Confirm", icon: FileText, desc: "Review & submit" },
];

const BUDGET_OPTIONS = [
  { value: "Under ₱100,000", label: "Under ₱100K", desc: "1–2 units, personal use" },
  { value: "₱100,000 – ₱300,000", label: "₱100K – ₱300K", desc: "2–5 units, small business" },
  { value: "₱300,000 – ₱500,000", label: "₱300K – ₱500K", desc: "5–8 units, growing fleet" },
  { value: "₱500,000 – ₱1,000,000", label: "₱500K – ₱1M", desc: "8–15 units, business fleet" },
  { value: "₱1,000,000 – ₱3,000,000", label: "₱1M – ₱3M", desc: "15–50 units, enterprise" },
  { value: "₱3,000,000+", label: "₱3M+", desc: "50+ units, large fleet" },
];

const CONTACT_METHODS = [
  { value: "Email", icon: Mail, desc: "Detailed proposal via email" },
  { value: "Phone Call", icon: Phone, desc: "Direct call from our team" },
  { value: "WhatsApp", icon: Smartphone, desc: "Quick chat on WhatsApp" },
  { value: "Viber", icon: Smartphone, desc: "Reach us on Viber" },
  { value: "In-Person Visit", icon: Building2, desc: "Schedule a showroom visit" },
];

const USE_TYPES = [
  { id: "personal", label: "Personal Use", desc: "Daily commute, recreation, personal transport", emoji: "🚴", detail: "For individual riders seeking sustainable mobility" },
  { id: "business", label: "Business / SME", desc: "Small fleet for business operations (2–9 units)", emoji: "🏢", detail: "Delivery, courier, or logistics for your business" },
  { id: "fleet", label: "Fleet Purchase", desc: "Enterprise-scale deployment (10+ units)", emoji: "🚀", detail: "Dedicated account manager + custom terms available" },
];

export default function QuoteModal({ open, onClose, preselectedProduct }: QuoteModalProps) {
  const { customer } = useCustomerAuth();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [leadScore, setLeadScore] = useState(0);
  const [quotationId, setQuotationId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    company: "",
    useType: "",
    product: preselectedProduct || "",
    quantity: 1,
    budget: "",
    contactMethod: "",
    notes: "",
    referrer: sessionStorage.getItem("referrer_code") || sessionStorage.getItem("referral_code") || "",
  });

  // Auto-fill from customer account
  useEffect(() => {
    if (customer) {
      setForm(f => ({
        ...f,
        name: customer.username || f.name,
        email: customer.email || f.email,
      }));
    }
  }, [customer]);

  useEffect(() => {
    if (preselectedProduct && open) {
      setForm(f => ({ ...f, product: preselectedProduct }));
    }
  }, [preselectedProduct, open]);

  useEffect(() => {
    if (open) {
      const ref = sessionStorage.getItem("referrer_code") || sessionStorage.getItem("referral_code") || "";
      setForm(f => ({ ...f, referrer: ref }));
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep(0);
        setSubmitted(false);
        setLoading(false);
        setShowAuthModal(false);
        setForm({
          name: customer?.username || "",
          email: customer?.email || "",
          mobile: "",
          company: "",
          useType: "",
          product: preselectedProduct || "",
          quantity: 1,
          budget: "",
          contactMethod: "",
          notes: "",
          referrer: sessionStorage.getItem("referrer_code") || sessionStorage.getItem("referral_code") || "",
        });
      }, 300);
    }
  }, [open, customer, preselectedProduct]);

  if (!open) return null;

  const handleNext = () => {
    // Gate: require account before proceeding from step 0
    if (step === 0 && !customer) {
      setShowAuthModal(true);
      return;
    }
    trackQuoteStep(step, STEPS[step].label, { product: form.product, use_type: form.useType });
    if (step < STEPS.length - 1) setStep(step + 1);
    else handleSubmit();
  };

  const handleBack = () => { if (step > 0) setStep(step - 1); };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    toast.success("Account verified! Continuing with your quote...");
    setStep(1);
  };

  const handleSubmit = async () => {
    setLoading(true);

    // Call submit-quote endpoint to score the lead and save the quotation
    const { data, error } = await apiClient.post("/submit-quote.php", {
      name: form.name,
      email: form.email,
      mobile: form.mobile,
      company: form.company || undefined,
      use_type: form.useType,
      product_interest: form.product,
      quantity: form.quantity,
      budget: form.budget,
      contact_method: form.contactMethod,
      notes: form.notes || undefined,
      customer_id: customer?.id,
      referrer_code: form.referrer || undefined,
    });

    if (error) {
      console.error("Quote error:", error.message);
      toast.error("Failed to submit. Please try again.");
      setLoading(false);
      return;
    }

    if (data && data.quotation_id) {
      setQuotationId(String(data.quotation_id));
    }

    setLeadScore(data?.score || 0);
    trackQuoteSubmit({ product: form.product, quantity: form.quantity, useType: form.useType, budget: form.budget, leadScore: data?.score });
    setSubmitted(true);
    setLoading(false);
    toast.success("Quote submitted! Check your email for confirmation.");
  };

  const canProceed = () => {
    switch (step) {
      case 0: return form.name.trim() && form.email.trim() && form.mobile.trim();
      case 1: return !!form.useType;
      case 2: return !!form.product;
      case 3: return form.quantity >= 1;
      case 4: return !!form.budget;
      case 5: return !!form.contactMethod;
      default: return true;
    }
  };

  const CurrentStepIcon = STEPS[step]?.icon || User;

  return (
    <>
      {/* Customer Auth Modal */}
      <CustomerAuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
        prefilledEmail={form.email}
        title="Account Required"
        subtitle="Create a free TRIP account to submit your quote and track it in your personal dashboard. Takes just 60 seconds."
      />

      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />

        <div className="relative w-full max-w-2xl flex flex-col max-h-[92vh] rounded-2xl overflow-hidden shadow-2xl border border-white/10"
          style={{ background: "linear-gradient(145deg, #0F0F0F 0%, #0A0A0A 100%)" }}>
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#39FF14] to-[#00FFFF]" />

          {/* Header */}
          <div className="flex-shrink-0 px-7 pt-6 pb-4">
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#39FF14]/10 border border-[#39FF14]/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-[#39FF14]" />
                </div>
                <div>
                  <p className="text-[10px] text-[#39FF14] tracking-[0.2em] uppercase font-semibold">TRIP Mobility</p>
                  <h2 className="font-orbitron font-bold text-xl text-white leading-tight">
                    {submitted ? "Quote Submitted!" : "Request a Quote"}
                  </h2>
                </div>
              </div>
              <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl border border-white/10 text-gray-500 hover:text-white hover:border-white/30 transition-all shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            {!submitted && (
              <>
                {/* Customer status bar */}
                {customer ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#39FF14]/5 border border-[#39FF14]/20 mb-4">
                    <div className="w-6 h-6 rounded-full bg-[#39FF14]/15 flex items-center justify-center font-bold text-[#39FF14] text-xs">
                      {customer.username[0].toUpperCase()}
                    </div>
                    <p className="text-xs text-gray-300">Signed in as <span className="text-[#39FF14] font-semibold">{customer.email}</span></p>
                    <CheckCircle className="w-3.5 h-3.5 text-[#39FF14] ml-auto" />
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[#39FF14]/25 bg-[#39FF14]/5 hover:bg-[#39FF14]/10 transition-all mb-4 group"
                  >
                    <UserPlus className="w-4 h-4 text-[#39FF14]" />
                    <p className="text-xs text-gray-400 group-hover:text-gray-300">
                      <span className="text-[#39FF14] font-semibold">Create / Sign In</span> — Required to submit quote & track status
                    </p>
                    <ChevronRight className="w-3 h-3 text-gray-600 ml-auto" />
                  </button>
                )}

                {/* Step pills */}
                <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-none">
                  {STEPS.map((s, i) => {
                    const Icon = s.icon;
                    const isComplete = i < step;
                    const isCurrent = i === step;
                    return (
                      <div key={s.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-300 ${
                        isCurrent ? "bg-[#39FF14]/15 border border-[#39FF14]/40 text-[#39FF14]"
                        : isComplete ? "bg-white/8 border border-white/10 text-white"
                        : "bg-white/3 border border-white/5 text-gray-600"
                      }`}>
                        {isComplete ? <CheckCircle className="w-3 h-3 text-[#39FF14]" /> : <Icon className="w-3 h-3" />}
                        <span className="hidden sm:inline">{s.label}</span>
                        <span className="sm:hidden">{i + 1}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#39FF14] to-[#00FFFF] rounded-full transition-all duration-500" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
                </div>
              </>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-7 pb-7">
            {submitted ? (
              <div className="text-center py-6">
                <div className="relative inline-block mb-6">
                  <div className="w-20 h-20 rounded-full bg-[#39FF14]/10 border border-[#39FF14]/30 flex items-center justify-center mx-auto">
                    <CheckCircle className="w-10 h-10 text-[#39FF14]" />
                  </div>
                  <div className="absolute -inset-3 rounded-full border border-[#39FF14]/15 animate-ping" />
                </div>
                <h3 className="font-orbitron font-bold text-2xl text-white mb-2">Thank You, {form.name.split(" ")[0]}!</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-6 max-w-md mx-auto">
                  Your quote is confirmed. Our e-mobility specialist will contact you via <span className="text-[#39FF14] font-semibold">{form.contactMethod}</span> within 24 business hours.<br /><br />
                  A <strong className="text-white">confirmation email with brochures & financing info</strong> was sent to <span className="text-[#39FF14]">{form.email}</span>.
                </p>

                <div className="rounded-xl border border-white/10 overflow-hidden mb-5 text-left" style={{ background: "rgba(57,255,20,0.03)" }}>
                  <div className="px-4 py-3 border-b border-white/5">
                    <p className="text-xs text-[#39FF14] font-semibold tracking-widest uppercase">Quote Summary</p>
                  </div>
                  <div className="grid grid-cols-2 gap-px bg-white/5">
                    {[
                      { label: "Model", value: form.product },
                      { label: "Quantity", value: `${form.quantity} unit${form.quantity > 1 ? "s" : ""}` },
                      { label: "Use Type", value: form.useType.charAt(0).toUpperCase() + form.useType.slice(1) },
                      { label: "Budget", value: form.budget },
                    ].map((item) => (
                      <div key={item.label} className="bg-[#0D0D0D] px-4 py-3">
                        <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                        <p className="text-sm text-white font-semibold">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {customer && (
                  <button
                    onClick={() => { onClose(); navigate("/my-quotes"); }}
                    className="w-full btn-primary flex items-center justify-center gap-2 mb-3"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Track My Quote in Dashboard
                  </button>
                )}
                <button onClick={onClose} className="w-full btn-outline text-sm">Explore More Models</button>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 mb-5 mt-2">
                  <div className="w-9 h-9 rounded-lg bg-[#39FF14]/10 border border-[#39FF14]/20 flex items-center justify-center shrink-0">
                    <CurrentStepIcon className="w-4 h-4 text-[#39FF14]" />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-base">{STEPS[step].label}</p>
                    <p className="text-xs text-gray-500">{STEPS[step].desc}</p>
                  </div>
                  <div className="ml-auto text-xs text-gray-600 font-medium">{step + 1} / {STEPS.length}</div>
                </div>

                {/* Step 0 */}
                {step === 0 && (
                  <div className="space-y-4">
                    {customer && (
                      <div className="p-3 rounded-xl bg-[#39FF14]/5 border border-[#39FF14]/15 mb-2">
                        <p className="text-xs text-gray-400"><span className="text-[#39FF14]">✓</span> Account verified — your details are auto-filled below</p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs text-gray-400 mb-2 uppercase tracking-widest font-medium">Full Name <span className="text-[#39FF14]">*</span></label>
                        <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Juan Dela Cruz" autoComplete="name" className="w-full border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-[#39FF14]/50 transition-all text-sm" style={{ background: "#1C1C1C" }} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-2 uppercase tracking-widest font-medium">Email <span className="text-[#39FF14]">*</span></label>
                        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="juan@company.ph" autoComplete="email" className="w-full border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-[#39FF14]/50 transition-all text-sm" style={{ background: "#1C1C1C" }} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-2 uppercase tracking-widest font-medium">Mobile <span className="text-[#39FF14]">*</span></label>
                        <input type="tel" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} placeholder="+63 917 000 0000" autoComplete="tel" className="w-full border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-[#39FF14]/50 transition-all text-sm" style={{ background: "#1C1C1C" }} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs text-gray-400 mb-2 uppercase tracking-widest font-medium">Company <span className="text-gray-600">(optional)</span></label>
                        <input type="text" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Your company name" autoComplete="organization" className="w-full border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-[#39FF14]/50 transition-all text-sm" style={{ background: "#1C1C1C" }} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs text-gray-400 mb-2 uppercase tracking-widest font-medium">Referrer Code <span className="text-gray-600">(optional)</span></label>
                        <input type="text" value={form.referrer} onChange={(e) => setForm({ ...form, referrer: e.target.value })} placeholder="REF-XXXXXX or TRIP-XXXXXX" className="w-full border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-[#39FF14]/50 transition-all text-sm" style={{ background: "#1C1C1C" }} />
                      </div>
                    </div>
                    {!customer && (
                      <div className="p-4 rounded-xl border border-[#39FF14]/20 bg-[#39FF14]/5">
                        <p className="text-xs text-[#39FF14] font-semibold mb-1">⚡ Account required to submit</p>
                        <p className="text-xs text-gray-400">Click "Continue" below — you'll be prompted to create your free account.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 1 */}
                {step === 1 && (
                  <div className="space-y-3">
                    {USE_TYPES.map((opt) => (
                      <button key={opt.id} onClick={() => setForm({ ...form, useType: opt.id })} className={`w-full text-left px-5 py-4 rounded-xl border transition-all duration-200 ${form.useType === opt.id ? "border-[#39FF14]/60 bg-[#39FF14]/8 shadow-[0_0_20px_rgba(57,255,20,0.08)]" : "border-white/8 bg-white/2 hover:border-white/20 hover:bg-white/4"}`}>
                        <div className="flex items-center gap-4">
                          <span className="text-2xl">{opt.emoji}</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className={`font-semibold text-sm ${form.useType === opt.id ? "text-[#39FF14]" : "text-white"}`}>{opt.label}</p>
                              {opt.id === "fleet" && <span className="text-[10px] px-2 py-0.5 bg-[#39FF14]/15 border border-[#39FF14]/30 rounded-full text-[#39FF14] font-semibold">PRIORITY</span>}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                            {form.useType === opt.id && <p className="text-xs text-[#39FF14]/70 mt-1.5 italic">{opt.detail}</p>}
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 shrink-0 ${form.useType === opt.id ? "border-[#39FF14] bg-[#39FF14]" : "border-white/20"}`}>
                            {form.useType === opt.id && <div className="w-full h-full rounded-full flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-[#0A0A0A]" /></div>}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Step 2 */}
                {step === 2 && (
                  <div className="space-y-3">
                    {PRODUCTS.map((product) => (
                      <button key={product.id} onClick={() => setForm({ ...form, product: product.name })} className={`w-full text-left px-4 py-4 rounded-xl border transition-all duration-200 ${form.product === product.name ? "border-[#39FF14]/60 bg-[#39FF14]/8" : "border-white/8 bg-white/2 hover:border-white/20 hover:bg-white/4"}`}>
                        <div className="flex items-center gap-4">
                          <img src={product.image} alt={product.name} className="w-16 h-12 object-cover rounded-lg shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`font-semibold text-sm ${form.product === product.name ? "text-[#39FF14]" : "text-white"}`}>{product.name}</p>
                              {product.badge && <span className="text-[9px] px-1.5 py-0.5 bg-[#39FF14]/20 text-[#39FF14] rounded font-bold uppercase">{product.badge}</span>}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{product.specs.motor} · {product.specs.range}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-orbitron font-bold text-sm text-[#39FF14]">₱{product.price.toLocaleString()}</p>
                            <p className="text-[10px] text-gray-600">starting at</p>
                          </div>
                        </div>
                      </button>
                    ))}
                    <button onClick={() => setForm({ ...form, product: "Not decided yet" })} className={`w-full text-left px-5 py-4 rounded-xl border transition-all ${form.product === "Not decided yet" ? "border-[#39FF14]/60 bg-[#39FF14]/8" : "border-white/8 bg-white/2 hover:border-white/20"}`}>
                      <p className={`font-semibold text-sm ${form.product === "Not decided yet" ? "text-[#39FF14]" : "text-white"}`}>Not decided yet</p>
                      <p className="text-xs text-gray-500 mt-0.5">Help me choose — I need expert guidance</p>
                    </button>
                  </div>
                )}

                {/* Step 3 */}
                {step === 3 && (
                  <div>
                    <div className="flex items-center justify-center gap-8 py-6">
                      <button onClick={() => setForm({ ...form, quantity: Math.max(1, form.quantity - 1) })} className="w-14 h-14 flex items-center justify-center rounded-2xl border border-white/15 text-white hover:border-[#39FF14]/50 hover:text-[#39FF14] hover:bg-[#39FF14]/5 transition-all text-3xl font-light">−</button>
                      <div className="text-center min-w-[100px]">
                        <p className="font-orbitron font-black text-6xl text-[#39FF14] leading-none">{form.quantity}</p>
                        <p className="text-sm text-gray-500 mt-2">unit{form.quantity > 1 ? "s" : ""}</p>
                        {form.quantity >= 10 && <p className="text-xs text-[#39FF14]/70 mt-1 font-medium">Fleet pricing available</p>}
                      </div>
                      <button onClick={() => setForm({ ...form, quantity: form.quantity + 1 })} className="w-14 h-14 flex items-center justify-center rounded-2xl border border-white/15 text-white hover:border-[#39FF14]/50 hover:text-[#39FF14] hover:bg-[#39FF14]/5 transition-all text-3xl font-light">+</button>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {[1, 5, 10, 20, 50, 100].map((qty) => (
                        <button key={qty} onClick={() => setForm({ ...form, quantity: qty })} className={`py-2.5 rounded-xl border text-xs font-semibold transition-all ${form.quantity === qty ? "border-[#39FF14]/60 bg-[#39FF14]/10 text-[#39FF14]" : "border-white/8 text-gray-500 hover:border-white/20 hover:text-white bg-white/2"}`}>{qty}</button>
                      ))}
                    </div>
                    {form.quantity >= 10 && (
                      <div className="mt-4 p-4 rounded-xl bg-[#39FF14]/5 border border-[#39FF14]/20">
                        <p className="text-xs text-[#39FF14] font-semibold mb-1">🎉 Fleet Buyer Benefits</p>
                        <ul className="text-xs text-gray-400 space-y-1">
                          <li>• Dedicated account manager assigned</li>
                          <li>• Volume pricing & custom payment terms</li>
                          <li>• Priority delivery & pre-delivery inspection</li>
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 4 */}
                {step === 4 && (
                  <div className="space-y-2.5">
                    {BUDGET_OPTIONS.map((opt) => (
                      <button key={opt.value} onClick={() => setForm({ ...form, budget: opt.value })} className={`w-full text-left px-5 py-3.5 rounded-xl border transition-all duration-200 ${form.budget === opt.value ? "border-[#39FF14]/60 bg-[#39FF14]/8" : "border-white/8 bg-white/2 hover:border-white/20 hover:bg-white/4"}`}>
                        <div className="flex items-center justify-between">
                          <p className={`font-semibold text-sm ${form.budget === opt.value ? "text-[#39FF14]" : "text-white"}`}>{opt.label}</p>
                          <p className="text-xs text-gray-500">{opt.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Step 5 */}
                {step === 5 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {CONTACT_METHODS.map((method) => {
                      const Icon = method.icon;
                      return (
                        <button key={method.value} onClick={() => setForm({ ...form, contactMethod: method.value })} className={`text-left px-5 py-4 rounded-xl border transition-all duration-200 ${form.contactMethod === method.value ? "border-[#39FF14]/60 bg-[#39FF14]/8" : "border-white/8 bg-white/2 hover:border-white/20"}`}>
                          <Icon className={`w-5 h-5 mb-2 ${form.contactMethod === method.value ? "text-[#39FF14]" : "text-gray-500"}`} />
                          <p className={`font-semibold text-sm ${form.contactMethod === method.value ? "text-[#39FF14]" : "text-white"}`}>{method.value}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{method.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Step 6: Confirm */}
                {step === 6 && (
                  <div className="space-y-5">
                    <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any special requirements, delivery timeline, branding needs, or questions..." rows={3} className="w-full border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-[#39FF14]/50 transition-all resize-none text-sm" style={{ background: "#1C1C1C" }} />
                    <div className="rounded-xl border border-white/8 overflow-hidden">
                      <div className="px-4 py-2.5 bg-white/3 border-b border-white/8">
                        <p className="text-xs text-[#39FF14] font-semibold tracking-widest uppercase">Confirm Your Quote</p>
                      </div>
                      <div className="grid grid-cols-2 gap-px bg-white/5">
                        {[
                          { label: "Name", value: form.name },
                          { label: "Email", value: form.email },
                          { label: "Mobile", value: form.mobile },
                          { label: "Model", value: form.product },
                          { label: "Quantity", value: `${form.quantity} unit${form.quantity > 1 ? "s" : ""}` },
                          { label: "Budget", value: form.budget },
                        ].map((item) => (
                          <div key={item.label} className="bg-[#0D0D0D] px-4 py-2.5">
                            <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">{item.label}</p>
                            <p className="text-xs text-white font-medium truncate">{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    {customer && (
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#39FF14]/5 border border-[#39FF14]/15">
                        <Lock className="w-3.5 h-3.5 text-[#39FF14]" />
                        <p className="text-xs text-gray-400">Track this quote in your <span className="text-[#39FF14] font-semibold">customer dashboard</span> after submission.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Navigation */}
                <div className="flex gap-3 mt-6 pt-4 border-t border-white/5">
                  {step > 0 && (
                    <button onClick={handleBack} className="flex items-center gap-2 px-5 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all text-sm font-semibold">
                      <ChevronLeft className="w-4 h-4" />
                      Back
                    </button>
                  )}
                  <button
                    onClick={handleNext}
                    disabled={!canProceed() || loading}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                      canProceed() && !loading
                        ? "bg-[#39FF14] text-[#0A0A0A] hover:bg-[#4FFF2A] shadow-[0_0_20px_rgba(57,255,20,0.3)] hover:shadow-[0_0_30px_rgba(57,255,20,0.5)]"
                        : "bg-white/5 text-gray-600 border border-white/8 cursor-not-allowed"
                    }`}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Submitting...
                      </span>
                    ) : step === 0 && !customer ? (
                      <><UserPlus className="w-4 h-4" /> Continue — Create / Sign In</>
                    ) : step === STEPS.length - 1 ? (
                      <><Zap className="w-4 h-4" /> Submit Quote Request</>
                    ) : (
                      <>Continue <ChevronRight className="w-4 h-4" /></>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
