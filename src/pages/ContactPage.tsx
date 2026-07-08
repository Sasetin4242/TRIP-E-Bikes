import { useState, useEffect } from "react";
import { MapPin, Phone, Mail, Clock, Send, CheckCircle, Navigation, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import SectionObserver from "@/components/features/SectionObserver";
import ParticleField from "@/components/features/ParticleField";
import { apiClient } from "@/lib/api-client";
import { trackContactFormSubmit, trackCTAClick, trackPageView } from "@/hooks/useTracking";

const INQUIRY_TYPES = [
  "General Inquiry",
  "Product Information",
  "Quote Request",
  "Fleet Solutions",
  "Service & Warranty",
  "Partnership / Dealership",
  "Media & Press",
  "Careers",
];

const SERVICE_CENTERS = [
  {
    city: "Mandaluyong City — Head Office & Flagship Showroom",
    address: "123 EDSA, Mandaluyong City, Metro Manila 1550",
    hours: "Mon–Sat: 8:00 AM – 6:00 PM · Sun: 9:00 AM – 3:00 PM",
    phone: "+63 2 8123 4567",
    mapsUrl: "https://maps.google.com/?q=Mandaluyong+City+EDSA+Metro+Manila",
    flagship: true,
  },
  {
    city: "Quezon City — North Branch",
    address: "456 Commonwealth Ave., Quezon City, Metro Manila",
    hours: "Mon–Sat: 9:00 AM – 6:00 PM",
    phone: "+63 2 8234 5678",
    mapsUrl: "https://maps.google.com/?q=Commonwealth+Ave+Quezon+City",
    flagship: false,
  },
  {
    city: "Cebu City — Visayas Hub",
    address: "789 Osmeña Blvd., Cebu City, Cebu 6000",
    hours: "Mon–Sat: 9:00 AM – 5:30 PM",
    phone: "+63 32 234 5678",
    mapsUrl: "https://maps.google.com/?q=Osmena+Boulevard+Cebu+City",
    flagship: false,
  },
  {
    city: "Davao City — Mindanao Hub",
    address: "321 Quirino Ave., Davao City, Davao del Sur 8000",
    hours: "Mon–Sat: 9:00 AM – 5:30 PM",
    phone: "+63 82 345 6789",
    mapsUrl: "https://maps.google.com/?q=Quirino+Avenue+Davao+City",
    flagship: false,
  },
  {
    city: "Pampanga — Central Luzon",
    address: "654 MacArthur Hwy., Angeles City, Pampanga 2009",
    hours: "Mon–Fri: 9:00 AM – 5:00 PM · Sat: 9:00 AM – 3:00 PM",
    phone: "+63 45 345 6789",
    mapsUrl: "https://maps.google.com/?q=MacArthur+Highway+Angeles+City+Pampanga",
    flagship: false,
  },
  {
    city: "Iloilo City — Western Visayas",
    address: "987 Iznart St., Iloilo City, Iloilo 5000",
    hours: "Mon–Sat: 9:00 AM – 5:00 PM",
    phone: "+63 33 456 7890",
    mapsUrl: "https://maps.google.com/?q=Iznart+Street+Iloilo+City",
    flagship: false,
  },
];

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    inquiryType: "General Inquiry",
    message: "",
  });

  useEffect(() => {
    trackPageView("/contact", "Contact Us — TRIP Mobility");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    trackCTAClick("Contact Form Submit", "contact_page", "contact_form");

    const { data, error } = await apiClient.post("/contact-form.php", {
      name: form.name,
      email: form.email,
      phone: form.phone || undefined,
      inquiry_type: form.inquiryType,
      message: form.message,
    });

    if (error) {
      console.error("Contact form error:", error.message);
      toast.error("Failed to send. Please try again or email us directly.");
      setLoading(false);
      return;
    }

    trackContactFormSubmit(form.inquiryType);
    setSubmitted(true);
    setLoading(false);
    toast.success("Message sent! We will respond within 24 hours.");
  };

  const inputCls = "w-full bg-white/4 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-[#39FF14]/50 focus:bg-[#39FF14]/3 transition-all text-sm";
  const labelCls = "block text-xs text-gray-400 mb-2 uppercase tracking-widest font-medium";

  return (
    <div className="bg-[#0A0A0A] min-h-screen">
      {/* BreadcrumbList Schema */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://tripmobility.ph" },
          { "@type": "ListItem", "position": 2, "name": "Contact Us", "item": "https://tripmobility.ph/contact" },
        ]
      })}} />

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <ParticleField />
        <div className="absolute inset-0 bg-hero-gradient" />
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <p className="section-label mb-4">Get in Touch</p>
          <h1 className="font-orbitron font-black text-5xl sm:text-6xl text-white mb-6">
            Talk to an <span className="gradient-text">Expert</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Our e-mobility specialists are ready to help you find the perfect TRIP solution for your needs.
          </p>
        </div>
      </section>

      {/* Quick Contact Bar */}
      <div className="bg-[#0D0D0D] border-y border-white/5 py-5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: Phone, label: "Call Us", value: "+63 2 8123 4567", href: "tel:+6328123456", action: "Call Now" },
              { icon: Mail, label: "Email Us", value: "sales@tripmobility.ph", href: "mailto:sales@tripmobility.ph", action: "Send Email" },
              { icon: Clock, label: "Business Hours", value: "Mon–Sat: 8AM – 6PM", href: null, action: null },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 p-4 glass rounded-xl border border-white/5">
                <div className="w-10 h-10 rounded-lg bg-[#39FF14]/10 border border-[#39FF14]/20 flex items-center justify-center shrink-0">
                  <item.icon className="w-4 h-4 text-[#39FF14]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">{item.label}</p>
                  {item.href ? (
                    <a href={item.href} className="text-white text-sm font-semibold hover:text-[#39FF14] transition-colors truncate block">{item.value}</a>
                  ) : (
                    <p className="text-white text-sm font-semibold">{item.value}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
            {/* Form — wider */}
            <SectionObserver className="lg:col-span-3">
              <div className="glass rounded-2xl border border-white/5 overflow-hidden">
                <div className="px-8 py-6 border-b border-white/5 bg-white/2">
                  <h2 className="font-orbitron font-bold text-2xl text-white">Send Us a Message</h2>
                  <p className="text-gray-500 text-sm mt-1">We respond within 24 business hours</p>
                </div>
                <div className="p-8">
                  {submitted ? (
                    <div className="text-center py-12">
                      <div className="relative inline-block mb-6">
                        <div className="w-20 h-20 rounded-full bg-[#39FF14]/10 border border-[#39FF14]/30 flex items-center justify-center mx-auto">
                          <CheckCircle className="w-10 h-10 text-[#39FF14]" />
                        </div>
                        <div className="absolute -inset-3 rounded-full border border-[#39FF14]/15 animate-ping" />
                      </div>
                      <h3 className="font-orbitron font-bold text-2xl text-white mb-3">Message Sent!</h3>
                      <p className="text-gray-400 leading-relaxed mb-2">
                        Thank you, <span className="text-white font-semibold">{form.name}</span>!
                      </p>
                      <p className="text-gray-500 text-sm mb-6">
                        A confirmation was sent to <span className="text-[#39FF14]">{form.email}</span>. Our team will respond within 24 hours.
                      </p>
                      <button
                        onClick={() => { setSubmitted(false); setForm({ name: "", email: "", phone: "", inquiryType: "General Inquiry", message: "" }); }}
                        className="btn-outline"
                      >
                        Send Another Message
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className={labelCls}>Full Name <span className="text-[#39FF14]">*</span></label>
                          <input required type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Juan Dela Cruz" className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}>Email Address <span className="text-[#39FF14]">*</span></label>
                          <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="juan@company.ph" className={inputCls} />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className={labelCls}>Phone / Mobile</label>
                          <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+63 917 000 0000" className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}>Inquiry Type <span className="text-[#39FF14]">*</span></label>
                          <select
                            value={form.inquiryType}
                            onChange={(e) => setForm({ ...form, inquiryType: e.target.value })}
                            className={inputCls}
                            style={{ background: "#111" }}
                          >
                            {INQUIRY_TYPES.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className={labelCls}>Your Message <span className="text-[#39FF14]">*</span></label>
                        <textarea
                          required
                          value={form.message}
                          onChange={(e) => setForm({ ...form, message: e.target.value })}
                          placeholder="Tell us how we can help — include details like quantity, use case, timeline, or any specific requirements..."
                          rows={5}
                          className={`${inputCls} resize-none`}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading || !form.name || !form.email || !form.message}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Sending...
                          </span>
                        ) : (
                          <><Send className="w-4 h-4" />Send Message</>
                        )}
                      </button>

                      <p className="text-xs text-gray-600 text-center">
                        Or call us directly: <a href="tel:+6328123456" className="text-[#39FF14] hover:underline">+63 2 8123 4567</a>
                      </p>
                    </form>
                  )}
                </div>
              </div>
            </SectionObserver>

            {/* Sidebar */}
            <SectionObserver delay={150} className="lg:col-span-2">
              <div className="space-y-6">
                {/* FAQ quick links */}
                <div className="glass rounded-2xl border border-white/5 p-6">
                  <h3 className="font-orbitron font-bold text-lg text-white mb-4">Quick Answers</h3>
                  <div className="space-y-3">
                    {[
                      { q: "How fast can I get a quote?", a: "Within 2 business hours" },
                      { q: "Do you offer test rides?", a: "Yes — at all our service centers" },
                      { q: "What is the warranty?", a: "3-year frame, 1-year motor & battery" },
                      { q: "Can I get fleet pricing?", a: "Yes for orders of 10+ units" },
                    ].map((item, i) => (
                      <div key={i} className="flex gap-3 p-3 rounded-xl bg-white/2 border border-white/5">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#39FF14] shrink-0 mt-1.5" />
                        <div>
                          <p className="text-xs font-semibold text-white">{item.q}</p>
                          <p className="text-xs text-[#39FF14] mt-0.5">{item.a}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Social / channels */}
                <div className="glass rounded-2xl border border-white/5 p-6">
                  <h3 className="font-orbitron font-bold text-lg text-white mb-4">Other Channels</h3>
                  <div className="space-y-3">
                    {[
                      { label: "Facebook", handle: "@TRIPMobilityPH", href: "https://facebook.com" },
                      { label: "Instagram", handle: "@tripmobility.ph", href: "https://instagram.com" },
                      { label: "WhatsApp Business", handle: "+63 917 123 4567", href: "https://wa.me/639171234567" },
                      { label: "Viber", handle: "+63 917 123 4567", href: "viber://contact?number=639171234567" },
                    ].map((item, i) => (
                      <a key={i} href={item.href} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 rounded-xl bg-white/2 border border-white/5 hover:border-[#39FF14]/30 transition-all group"
                      >
                        <div>
                          <p className="text-xs font-semibold text-white group-hover:text-[#39FF14] transition-colors">{item.label}</p>
                          <p className="text-xs text-gray-500">{item.handle}</p>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-gray-600 group-hover:text-[#39FF14] transition-colors" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </SectionObserver>
          </div>
        </div>
      </section>

      {/* Service Centers */}
      <section className="py-16 bg-[#0D0D0D] border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <SectionObserver>
            <div className="text-center mb-12">
              <p className="section-label mb-3">Where to Find Us</p>
              <h2 className="font-orbitron font-bold text-3xl sm:text-4xl text-white">
                Service <span className="gradient-text">Centers</span>
              </h2>
              <p className="text-gray-500 text-sm mt-3">Visit any of our 6 locations nationwide for test rides, service, and support</p>
            </div>
          </SectionObserver>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {SERVICE_CENTERS.map((center, i) => (
              <SectionObserver key={i} delay={i * 80}>
                <div className={`glass rounded-xl border p-5 h-full flex flex-col transition-all hover:scale-[1.01] ${center.flagship ? "border-[#39FF14]/30 bg-[#39FF14]/3" : "border-white/5 hover:border-white/10"}`}>
                  {center.flagship && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#39FF14] text-[#0A0A0A] text-[10px] font-black rounded-full uppercase mb-3 self-start">
                      ★ Flagship
                    </span>
                  )}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-[#39FF14]/10 flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4 text-[#39FF14]" />
                    </div>
                    <p className={`font-semibold text-sm leading-snug ${center.flagship ? "text-[#39FF14]" : "text-white"}`}>
                      {center.city.split(" — ")[0]}
                    </p>
                  </div>
                  {center.city.includes(" — ") && (
                    <p className="text-xs text-[#39FF14]/70 mb-2 font-medium pl-11">{center.city.split(" — ")[1]}</p>
                  )}
                  <p className="text-xs text-gray-400 mb-1 pl-11">{center.address}</p>
                  <div className="flex items-center gap-1.5 pl-11 mb-1">
                    <Clock className="w-3 h-3 text-gray-600 shrink-0" />
                    <p className="text-xs text-gray-500">{center.hours}</p>
                  </div>
                  <div className="flex items-center gap-1.5 pl-11 mb-4">
                    <Phone className="w-3 h-3 text-gray-600 shrink-0" />
                    <a href={`tel:${center.phone.replace(/\s/g, "")}`} className="text-xs text-gray-400 hover:text-[#39FF14] transition-colors">{center.phone}</a>
                  </div>
                  <a
                    href={center.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-auto flex items-center gap-2 text-xs text-[#39FF14] hover:text-[#4FFF2A] font-semibold transition-colors group"
                  >
                    <Navigation className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    Get Directions
                    <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                  </a>
                </div>
              </SectionObserver>
            ))}
          </div>
        </div>
      </section>

      {/* CTA strip */}
      <section className="py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#39FF14]/8 via-transparent to-[#00FFFF]/5" />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <SectionObserver>
            <h2 className="font-orbitron font-bold text-3xl text-white mb-4">
              Ready for a <span className="gradient-text">Test Ride?</span>
            </h2>
            <p className="text-gray-400 mb-8">Visit any service center — no appointment needed Mon–Sat. Or book a fleet demo for your team.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href="tel:+6328123456" className="btn-primary flex items-center justify-center gap-2">
                <Phone className="w-4 h-4" /> Book a Visit
              </a>
              <a href="mailto:fleet@tripmobility.ph" className="btn-outline flex items-center justify-center gap-2">
                <Mail className="w-4 h-4" /> Fleet Demo Request
              </a>
            </div>
          </SectionObserver>
        </div>
      </section>
    </div>
  );
}
