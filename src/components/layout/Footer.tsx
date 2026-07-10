import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Zap, Facebook, Instagram, Youtube, Mail, Phone, MapPin } from "lucide-react";
import { apiClient } from "@/lib/api-client";

export default function Footer() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const { data } = await apiClient.get("/settings.php");
        if (data) {
          const logoSetting = data.find((s: any) => s.key === "brand_logo");
          if (logoSetting?.value) {
            setLogoUrl(logoSetting.value);
          }
        }
      } catch (e) {
        console.error("Failed to load logo in footer", e);
      }
    };
    fetchLogo();
  }, []);

  return (
    <footer className="bg-[#080808] border-t border-white/5">
      {/* CTA Band */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#39FF14]/10 via-transparent to-[#00FFFF]/10" />
        <div className="relative max-w-7xl mx-auto px-6 py-16 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div>
            <p className="section-label mb-2">Ready to Ride Electric?</p>
            <h3 className="font-orbitron text-3xl font-bold text-white">
              Join the E-Mobility Revolution
            </h3>
          </div>
          <Link
            to="/contact"
            className="btn-primary whitespace-nowrap"
          >
            Get Your Free Consultation
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-6">
              {logoUrl ? (
                <img src={logoUrl} alt="TRIP MOBILITY" className="h-10 object-contain" />
              ) : (
                <>
                  <div className="w-10 h-10 flex items-center justify-center bg-[#39FF14]/10 rounded-lg border border-[#39FF14]/20">
                    <Zap className="w-6 h-6 text-[#39FF14]" fill="#39FF14" />
                  </div>
                  <div>
                    <span className="font-orbitron font-black text-xl text-white">TRIP</span>
                    <span className="block text-[9px] text-[#39FF14] tracking-[0.2em] font-medium -mt-1">MOBILITY</span>
                  </div>
                </>
              )}
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed mb-6 max-w-xs">
              Philippines' leading premium electric bike brand. Delivering exceptional quality, competitive pricing, and unmatched after-sales support.
            </p>
            <div className="flex gap-4">
              {[Facebook, Instagram, Youtube].map((Icon, i) => (
                <button
                  key={i}
                  className="w-10 h-10 flex items-center justify-center rounded-lg border border-white/10 text-gray-400 hover:border-[#39FF14]/50 hover:text-[#39FF14] transition-all"
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Products */}
          <div>
            <h5 className="font-orbitron text-xs font-bold tracking-widest text-white uppercase mb-4">Products</h5>
            <ul className="space-y-3">
              {[
                { label: "TRIP Cargo Pro", href: "/products/delivery-ebike" },
                { label: "TRIP Fold X", href: "/products/folding-ebike" },
                { label: "TRIP Ranger 750", href: "/products/mountain-ebike" },
                { label: "Compare Models", href: "/products" },
              ].map((item) => (
                <li key={item.href}>
                  <Link to={item.href} className="text-sm text-gray-400 hover:text-[#39FF14] transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h5 className="font-orbitron text-xs font-bold tracking-widest text-white uppercase mb-4">Company</h5>
            <ul className="space-y-3">
              {[
                { label: "About Us", href: "/about" },
                { label: "Industries", href: "/industries" },
                { label: "Financing", href: "/financing" },
                { label: "Service & Support", href: "/service" },
                { label: "Blog", href: "/blog" },
                { label: "Contact", href: "/contact" },
              ].map((item) => (
                <li key={item.href}>
                  <Link to={item.href} className="text-sm text-gray-400 hover:text-[#39FF14] transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h5 className="font-orbitron text-xs font-bold tracking-widest text-white uppercase mb-4">Contact</h5>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#39FF14] mt-0.5 shrink-0" />
                <span className="text-sm text-gray-400">123 EDSA, Mandaluyong City, Metro Manila</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-[#39FF14] shrink-0" />
                <a href="tel:+6328123456" className="text-sm text-gray-400 hover:text-[#39FF14] transition-colors">+63 2 8123 4567</a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-[#39FF14] shrink-0" />
                <a href="mailto:hello@tripmobility.ph" className="text-sm text-gray-400 hover:text-[#39FF14] transition-colors">hello@tripmobility.ph</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-600 text-sm">
            © 2026 TRIP Mobility Philippines. All rights reserved.
          </p>
          <div className="flex gap-6">
            {["Privacy Policy", "Terms of Service", "Cookie Policy"].map((item) => (
              <button key={item} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
                {item}
              </button>
            ))}
            <Link to="/admin" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
              Admin Login
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
