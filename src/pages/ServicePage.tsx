import { useState, useEffect } from "react";
import {
  Shield, Wrench, MapPin, Package, BookOpen, Phone, CheckCircle,
  Clock, ChevronDown, ChevronUp, Navigation, Calendar, User,
  Mail, Bike, AlertCircle, Send, Loader2, Star, X
} from "lucide-react";
import { SERVICE_CENTERS } from "@/constants/data";
import SectionObserver from "@/components/features/SectionObserver";
import ParticleField from "@/components/features/ParticleField";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";

const WARRANTY_ITEMS = [
  { title: "Frame Warranty", duration: "3 Years", desc: "Full coverage on frame, welds, and structural components" },
  { title: "Motor Warranty", duration: "1 Year", desc: "Hub motor, controller, and electrical system coverage" },
  { title: "Battery Warranty", duration: "1 Year", desc: "Lithium-ion battery pack with capacity guarantee (80%+)" },
  { title: "Components", duration: "6 Months", desc: "Brakes, gears, display, lighting, and accessories" },
];

const MAINTENANCE_PLANS = [
  { title: "Basic Care", price: "₱2,500/year", features: ["2 tune-up visits", "Brake inspection", "Tire pressure check", "Basic cleaning"] },
  { title: "Pro Care", price: "₱5,000/year", highlight: true, features: ["4 tune-up visits", "Full drivetrain service", "Battery health check", "Priority scheduling", "Free brake pads"] },
  { title: "Fleet Care", price: "Custom pricing", features: ["On-site maintenance", "Monthly fleet inspection", "Dedicated technician", "24hr emergency support", "Full parts coverage"] },
];

const SERVICE_TYPES = [
  "General Tune-Up", "Battery Check & Replacement", "Motor Service",
  "Brake Adjustment", "Tire Replacement", "Electrical Diagnostics",
  "Warranty Claim", "Accident Repair", "Software Update",
];

const EXTENDED_CENTERS = [
  { city: "Mandaluyong City", address: "123 Electric Avenue, Barangay TRIP", phone: "+63 2 8888-8747", hours: "Mon–Sat 8am–6pm", services: ["Full service", "Test rides", "Parts"], technicians: 4, landmark: "Near SM Megamall", maps: "https://maps.google.com/?q=Mandaluyong+City", rating: 4.9 },
  { city: "Quezon City", address: "456 E-Mobility Blvd, Brgy. Commonwealth", phone: "+63 2 8999-9876", hours: "Mon–Sat 9am–6pm", services: ["Service & repair", "Battery replacement"], technicians: 3, landmark: "Near Fairview Terraces", maps: "https://maps.google.com/?q=Quezon+City", rating: 4.8 },
  { city: "Cebu City", address: "789 Green Transport Hub, Labangon", phone: "+63 32 888-7654", hours: "Mon–Sat 8am–5pm", services: ["Full service", "Fleet maintenance"], technicians: 3, landmark: "Near SM City Cebu", maps: "https://maps.google.com/?q=Cebu+City", rating: 4.7 },
  { city: "Davao City", address: "321 Clean Energy Park, Bajada", phone: "+63 82 777-6543", hours: "Mon–Fri 8am–5pm", services: ["Service & repair", "Parts sales"], technicians: 2, landmark: "Near Abreeza Mall", maps: "https://maps.google.com/?q=Davao+City", rating: 4.8 },
  { city: "Iloilo City", address: "654 Eco Transport Zone, Mandurriao", phone: "+63 33 666-5432", hours: "Mon–Sat 9am–5pm", services: ["Service & repair"], technicians: 2, landmark: "Near SM Iloilo", maps: "https://maps.google.com/?q=Iloilo+City", rating: 4.6 },
  { city: "Pampanga", address: "987 Angeles City Tech Park, Clark", phone: "+63 45 555-4321", hours: "Mon–Sat 8am–5pm", services: ["Fleet service", "Corporate accounts"], technicians: 3, landmark: "Clark Freeport Zone", maps: "https://maps.google.com/?q=Pampanga", rating: 4.9 },
];

const TIMES = ["8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"];

export default function ServicePage() {
  const { customer } = useCustomerAuth();
  const [expandedCenter, setExpandedCenter] = useState<number | null>(null);
  const [showAppointment, setShowAppointment] = useState(false);
  const [prefilledCenter, setPrefilledCenter] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: customer?.username || "",
    email: customer?.email || "",
    phone: "",
    service_center: "",
    service_type: SERVICE_TYPES[0],
    preferred_date: "",
    preferred_time: TIMES[0],
    bike_model: "",
    issue_description: "",
  });

  // Pre-fill customer info when auth state changes
  useEffect(() => {
    if (customer) {
      setForm(f => ({
        ...f,
        name: f.name || customer.username || "",
        email: f.email || customer.email || "",
      }));
    }
  }, [customer]);

  // Handle #appointment hash
  useEffect(() => {
    if (window.location.hash === '#appointment') {
      setTimeout(() => {
        document.getElementById('appointment')?.scrollIntoView({ behavior: 'smooth' });
        setShowAppointment(true);
      }, 500);
    }
  }, []);

  const openAppointment = (center: string) => {
    setPrefilledCenter(center);
    setForm(f => ({ ...f, service_center: center }));
    setShowAppointment(true);
    window.scrollTo({ top: document.getElementById("appointment")?.offsetTop || 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.phone || !form.service_center || !form.preferred_date) {
      toast.error("Please fill in all required fields."); return;
    }
    setSubmitting(true);
    const { error } = await apiClient.post("/appointments.php", {
      customer_name: form.name,
      customer_email: form.email,
      customer_phone: form.phone,
      service_center: form.service_center,
      service_type: form.service_type,
      appointment_date: form.preferred_date,
      appointment_time: form.preferred_time,
      bike_model: form.bike_model || null,
      issue_description: form.issue_description || null,
    });
    if (error) { toast.error("Booking failed: " + error.message); setSubmitting(false); return; }
    setSubmitted(true);
    setSubmitting(false);
    toast.success("Appointment booked! We'll confirm within 24 hours.");
  };

  const inp = "w-full border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#39FF14]/50 transition-all";
  const inpStyle = { style: { background: "#1A1A1A" } };

  return (
    <div className="bg-[#0A0A0A] min-h-screen">
      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <ParticleField />
        <div className="absolute inset-0 bg-hero-gradient" />
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <p className="section-label mb-4">Service & Support</p>
          <h1 className="font-orbitron font-black text-5xl sm:text-6xl text-white mb-6">
            We've Got You <span className="gradient-text">Covered</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-8">
            Industry-leading warranty, 6 nationwide service centers, and a dedicated support team.
          </p>
          <button onClick={() => { setShowAppointment(true); document.getElementById("appointment")?.scrollIntoView({ behavior: "smooth" }); }}
            className="btn-primary flex items-center gap-2 mx-auto">
            <Calendar className="w-4 h-4" />Book Service Appointment
          </button>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-12 bg-[#0D0D0D] border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Shield, label: "Warranty" },
            { icon: Wrench, label: "Service Centers" },
            { icon: Package, label: "Spare Parts" },
            { icon: BookOpen, label: "User Manuals" },
          ].map((item, i) => (
            <div key={i} className="glass rounded-xl p-4 text-center border border-white/5 hover:border-[#39FF14]/30 cursor-pointer transition-all group">
              <item.icon className="w-5 h-5 text-[#39FF14] mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-semibold text-white group-hover:text-[#39FF14] transition-colors">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Warranty */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <SectionObserver>
            <div className="text-center mb-12">
              <p className="section-label mb-3">Warranty Coverage</p>
              <h2 className="font-orbitron font-bold text-4xl text-white">
                Philippines' Best <span className="gradient-text">E-Bike Warranty</span>
              </h2>
            </div>
          </SectionObserver>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {WARRANTY_ITEMS.map((item, i) => (
              <SectionObserver key={i} delay={i * 100}>
                <div className="glass rounded-xl p-6 border border-white/5 hover:border-[#39FF14]/20 transition-all h-full">
                  <div className="w-12 h-12 rounded-xl bg-[#39FF14]/10 border border-[#39FF14]/20 flex items-center justify-center mb-4">
                    <Shield className="w-6 h-6 text-[#39FF14]" />
                  </div>
                  <p className="font-orbitron font-black text-2xl text-[#39FF14] mb-1">{item.duration}</p>
                  <h3 className="font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-gray-400 text-sm">{item.desc}</p>
                </div>
              </SectionObserver>
            ))}
          </div>
        </div>
      </section>

      {/* ── Service Centers ── */}
      <section className="py-24 bg-[#0D0D0D]" id="service-centers">
        <div className="max-w-7xl mx-auto px-6">
          <SectionObserver>
            <div className="text-center mb-12">
              <p className="section-label mb-3">Nationwide Network</p>
              <h2 className="font-orbitron font-bold text-4xl text-white">
                6 Service <span className="gradient-text">Centers</span>
              </h2>
              <p className="text-gray-400 mt-3 max-w-xl mx-auto">Strategically located across the Philippines for fast, convenient access to expert TRIP technicians.</p>
            </div>
          </SectionObserver>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {EXTENDED_CENTERS.map((center, i) => {
              const isExpanded = expandedCenter === i;
              return (
                <SectionObserver key={i} delay={i * 80}>
                  <div className={`glass rounded-2xl border transition-all duration-300 overflow-hidden ${isExpanded ? "border-[#39FF14]/30 bg-[#39FF14]/3" : "border-white/5 hover:border-white/10"}`}>
                    <div className="p-6 cursor-pointer" onClick={() => setExpandedCenter(isExpanded ? null : i)}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <MapPin className="w-4 h-4 text-[#39FF14]" />
                            <h3 className="font-orbitron font-bold text-lg text-white">{center.city}</h3>
                          </div>
                          <p className="text-xs text-gray-400">{center.address}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Star className="w-3.5 h-3.5 text-[#39FF14] fill-[#39FF14]" />
                          <span className="text-xs font-bold text-white">{center.rating}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {center.services.map((s, j) => (
                          <span key={j} className="px-2 py-0.5 bg-white/5 border border-white/8 rounded-full text-[10px] text-gray-400">{s}</span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500 flex items-center gap-2"><Phone className="w-3 h-3" />{center.phone}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-2"><Clock className="w-3 h-3" />{center.hours}</p>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-[#39FF14]" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-6 pb-6 border-t border-white/8 pt-4 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-white/3 rounded-xl border border-white/5">
                            <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Technicians</p>
                            <p className="font-orbitron font-bold text-xl text-[#39FF14]">{center.technicians}</p>
                          </div>
                          <div className="p-3 bg-white/3 rounded-xl border border-white/5">
                            <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Rating</p>
                            <p className="font-orbitron font-bold text-xl text-[#39FF14]">{center.rating}/5.0</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500"><span className="text-gray-400 font-semibold">Landmark:</span> {center.landmark}</p>

                        {/* Inline Google Maps embed */}
                        <div className="rounded-xl overflow-hidden h-32 border border-white/8">
                          <iframe
                            src={`https://maps.google.com/maps?q=${encodeURIComponent(center.city + " Philippines")}&output=embed&zoom=13`}
                            className="w-full h-full"
                            loading="lazy"
                            title={`${center.city} Service Center`}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <a href={center.maps} target="_blank" rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1.5 py-2.5 glass rounded-xl border border-white/10 text-xs text-gray-300 hover:text-white hover:border-white/20 transition-all"
                            onClick={e => e.stopPropagation()}>
                            <Navigation className="w-3.5 h-3.5" />Get Directions
                          </a>
                          <button onClick={e => { e.stopPropagation(); openAppointment(center.city); }}
                            className="flex items-center justify-center gap-1.5 py-2.5 bg-[#39FF14]/15 border border-[#39FF14]/30 rounded-xl text-xs text-[#39FF14] font-semibold hover:bg-[#39FF14]/25 transition-all">
                            <Calendar className="w-3.5 h-3.5" />Book Appointment
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </SectionObserver>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Appointment Booking Form ── */}
      <section className="py-24" id="appointment">
        <div className="max-w-3xl mx-auto px-6">
          <SectionObserver>
            <div className="text-center mb-10">
              <p className="section-label mb-3">Book Service</p>
              <h2 className="font-orbitron font-bold text-4xl text-white">
                Schedule an <span className="gradient-text">Appointment</span>
              </h2>
              <p className="text-gray-400 mt-3">Book your service slot online. We'll confirm within 24 hours.</p>
            </div>
          </SectionObserver>

          <div className="glass rounded-2xl border border-white/8 overflow-hidden">
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#39FF14] to-[#00FFFF]" />

            {submitted ? (
              <div className="p-10 text-center">
                <div className="w-20 h-20 rounded-full bg-[#39FF14]/10 border border-[#39FF14]/30 flex items-center justify-center mx-auto mb-5">
                  <CheckCircle className="w-10 h-10 text-[#39FF14]" />
                </div>
                <h3 className="font-orbitron font-bold text-2xl text-white mb-3">Appointment Requested!</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-2">
                  Your service appointment at <span className="text-[#39FF14] font-semibold">{form.service_center}</span> has been submitted.
                </p>
                <p className="text-gray-500 text-sm mb-6">Our team will confirm your slot at <span className="text-white">{form.email}</span> within 24 hours.</p>
                <div className="glass rounded-xl border border-white/8 p-4 mb-6 text-sm text-left">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Service Center", val: form.service_center },
                      { label: "Service Type", val: form.service_type },
                      { label: "Preferred Date", val: form.preferred_date },
                      { label: "Preferred Time", val: form.preferred_time },
                    ].map(item => (
                      <div key={item.label}>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">{item.label}</p>
                        <p className="text-white font-medium">{item.val}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={() => { setSubmitted(false); setForm(f => ({ ...f, preferred_date: "", issue_description: "", bike_model: "" })); }} className="btn-outline text-sm">
                  Book Another Appointment
                </button>
              </div>
            ) : (
              <div className="p-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Personal Info */}
                  <div className="sm:col-span-2 mb-1">
                    <p className="text-xs text-[#39FF14] font-semibold tracking-widest uppercase">Personal Information</p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-2 uppercase tracking-widest">Full Name <span className="text-[#39FF14]">*</span></label>
                    <div className="relative"><User className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Juan Dela Cruz" className={inp + " pl-11"} {...inpStyle} autoComplete="name" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-2 uppercase tracking-widest">Email <span className="text-[#39FF14]">*</span></label>
                    <div className="relative"><Mail className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="juan@email.com" className={inp + " pl-11"} {...inpStyle} autoComplete="email" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-2 uppercase tracking-widest">Phone <span className="text-[#39FF14]">*</span></label>
                    <div className="relative"><Phone className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+63 917 000 0000" className={inp + " pl-11"} {...inpStyle} autoComplete="tel" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-2 uppercase tracking-widest">Bike Model</label>
                    <div className="relative"><Bike className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input value={form.bike_model} onChange={e => setForm(f => ({ ...f, bike_model: e.target.value }))} placeholder="e.g. TRIP Cargo Pro" className={inp + " pl-11"} {...inpStyle} />
                    </div>
                  </div>

                  {/* Service Details */}
                  <div className="sm:col-span-2 mt-3 mb-1">
                    <p className="text-xs text-[#39FF14] font-semibold tracking-widest uppercase">Service Details</p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-2 uppercase tracking-widest">Service Center <span className="text-[#39FF14]">*</span></label>
                    <select value={form.service_center} onChange={e => setForm(f => ({ ...f, service_center: e.target.value }))} className={inp} style={{ background: "#1A1A1A" }}>
                      <option value="">Select a center...</option>
                      {EXTENDED_CENTERS.map(c => <option key={c.city} value={c.city}>{c.city}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-2 uppercase tracking-widest">Service Type</label>
                    <select value={form.service_type} onChange={e => setForm(f => ({ ...f, service_type: e.target.value }))} className={inp} style={{ background: "#1A1A1A" }}>
                      {SERVICE_TYPES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-2 uppercase tracking-widest">Preferred Date <span className="text-[#39FF14]">*</span></label>
                    <input type="date" value={form.preferred_date} onChange={e => setForm(f => ({ ...f, preferred_date: e.target.value }))} min={new Date().toISOString().split("T")[0]} className={inp} {...inpStyle} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-2 uppercase tracking-widest">Preferred Time</label>
                    <select value={form.preferred_time} onChange={e => setForm(f => ({ ...f, preferred_time: e.target.value }))} className={inp} style={{ background: "#1A1A1A" }}>
                      {TIMES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-gray-400 mb-2 uppercase tracking-widest">Issue Description</label>
                    <textarea value={form.issue_description} onChange={e => setForm(f => ({ ...f, issue_description: e.target.value }))} rows={3} placeholder="Describe the issue or what service you need..." className={inp + " resize-none"} style={{ background: "#1A1A1A" }} />
                  </div>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                    {submitting ? "Booking..." : "Book Service Appointment"}
                  </button>
                  <a href="tel:+6281234567" className="btn-outline text-sm flex items-center justify-center gap-2">
                    <Phone className="w-4 h-4" />Call Instead
                  </a>
                </div>
                <p className="text-xs text-gray-600 text-center mt-3">Free booking · Confirmation within 24 hours · Cancel anytime</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Maintenance Plans */}
      <section className="py-24 bg-[#0D0D0D]">
        <div className="max-w-7xl mx-auto px-6">
          <SectionObserver>
            <div className="text-center mb-12">
              <p className="section-label mb-3">Keep It Running</p>
              <h2 className="font-orbitron font-bold text-4xl text-white">
                Maintenance <span className="gradient-text">Plans</span>
              </h2>
            </div>
          </SectionObserver>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {MAINTENANCE_PLANS.map((plan, i) => (
              <SectionObserver key={i} delay={i * 100}>
                <div className={`rounded-2xl p-8 border h-full flex flex-col transition-all ${plan.highlight ? "glass-green border-[#39FF14]/30 relative" : "glass border-white/5 hover:border-[#39FF14]/20"}`}>
                  {plan.highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#39FF14] text-[#0A0A0A] text-xs font-bold rounded-full uppercase">Most Popular</div>}
                  <Wrench className="w-6 h-6 text-[#39FF14] mb-4" />
                  <h3 className="font-orbitron font-bold text-xl text-white mb-1">{plan.title}</h3>
                  <p className="font-bold text-[#39FF14] text-lg mb-6">{plan.price}</p>
                  <ul className="space-y-3 flex-1">
                    {plan.features.map((feat, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm text-gray-300">
                        <CheckCircle className="w-4 h-4 text-[#39FF14] shrink-0" />{feat}
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => openAppointment("")} className={`mt-8 w-full text-sm ${plan.highlight ? "btn-primary" : "btn-outline"}`}>
                    Get This Plan
                  </button>
                </div>
              </SectionObserver>
            ))}
          </div>
        </div>
      </section>

      {/* Support */}
      <section className="py-16 bg-[#0A0A0A]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <SectionObserver>
            <Phone className="w-10 h-10 text-[#39FF14] mx-auto mb-4" />
            <h2 className="font-orbitron font-bold text-3xl text-white mb-4">
              Need <span className="gradient-text">Help Now?</span>
            </h2>
            <p className="text-gray-400 mb-8">Our support team is available Monday–Saturday, 8am–6pm PHT</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="tel:+6281234567" className="btn-primary">Call +63 2 8123 4567</a>
              <a href="mailto:support@tripmobility.ph" className="btn-outline">Email Support</a>
            </div>
          </SectionObserver>
        </div>
      </section>
    </div>
  );
}
