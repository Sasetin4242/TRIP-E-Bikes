import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Zap, User, LogOut, LayoutDashboard, ChevronDown, Wrench } from "lucide-react";
import QuoteModal from "@/components/features/QuoteModal";
import CustomerAuthModal from "@/components/features/CustomerAuthModal";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";


const NAV_LINKS = [
  { label: "Products", href: "/products" },
  { label: "Compare", href: "/compare" },
  { label: "Industries", href: "/industries" },
  { label: "Financing", href: "/financing" },
  { label: "About", href: "/about" },
  { label: "Service", href: "/service" },
  { label: "Blog", href: "/blog" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { customer, logout } = useCustomerAuth();
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
        console.error("Failed to load logo", e);
      }
    };
    fetchLogo();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); setAccountOpen(false); }, [location.pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = async () => {
    await apiClient.post("/auth.php?action=logout");
    localStorage.removeItem("token");
    logout();
    navigate("/");
    toast.success("Signed out successfully");
  };

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? "bg-[#0A0A0A]/10 backdrop-blur-xl shadow-2xl" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              {logoUrl ? (
                <img src={logoUrl} alt="TRIP MOBILITY" className="h-10 object-contain" />
              ) : (
                <>
                  <div className="relative w-10 h-10 flex items-center justify-center">
                    <div className="absolute inset-0 bg-[#39FF14]/20 rounded-lg animate-glow-pulse" />
                    <Zap className="w-6 h-6 text-[#39FF14] relative z-10" fill="#39FF14" />
                  </div>
                  <div>
                    <span className="font-orbitron font-black text-xl text-white tracking-tight group-hover:text-[#39FF14] transition-colors">TRIP</span>
                    <span className="block text-[9px] text-[#39FF14] tracking-[0.2em] font-medium -mt-1">MOBILITY</span>
                  </div>
                </>
              )}
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-8">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`text-sm font-medium tracking-wide transition-all duration-300 hover:text-[#39FF14] relative group ${location.pathname === link.href ? "text-[#39FF14]" : "text-gray-400"}`}
                >
                  {link.label}
                  <span className={`absolute -bottom-1 left-0 h-px bg-[#39FF14] transition-all duration-300 ${location.pathname === link.href ? "w-full" : "w-0 group-hover:w-full"}`} />
                </Link>
              ))}
            </div>

            {/* CTA + Account */}
            <div className="hidden lg:flex items-center gap-3">
              <Link
                to="/service#appointment"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#39FF14]/20 text-xs text-[#39FF14] hover:bg-[#39FF14]/10 hover:border-[#39FF14]/40 transition-all font-semibold font-orbitron"
              >
                <Wrench className="w-3.5 h-3.5" />Book Service
              </Link>
              <button
                onClick={() => setQuoteOpen(true)}
                className="bg-[#39FF14] text-[#0A0A0A] font-bold px-4 py-2 rounded-lg text-xs uppercase tracking-widest transition-all duration-300 hover:bg-white hover:shadow-[0_0_20px_rgba(57,255,20,0.6)] hover:scale-105 active:scale-95 whitespace-nowrap h-9 flex items-center justify-center font-orbitron"
              >
                Get a Quote
              </button>

              {customer ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setAccountOpen(!accountOpen)}
                    className="w-9 h-9 rounded-full bg-gradient-to-br from-[#39FF14]/20 to-[#00FFFF]/10 border border-[#39FF14]/30 hover:border-[#39FF14]/60 transition-all flex items-center justify-center font-bold text-[#39FF14] text-sm hover:scale-105"
                  >
                    {(customer.username || "U")[0].toUpperCase()}
                  </button>

                  {accountOpen && (
                    <div className="absolute right-0 mt-2 w-56 glass rounded-xl border border-white/10 shadow-2xl overflow-hidden z-50 animate-fade-up">
                      {/* User info header */}
                      <div className="px-4 py-3.5 border-b border-white/5 bg-gradient-to-r from-[#39FF14]/5 to-transparent">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#39FF14]/20 to-[#00FFFF]/10 border border-[#39FF14]/30 flex items-center justify-center font-bold text-[#39FF14] text-sm">
                            {(customer.username || "U")[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{customer.username}</p>
                            <p className="text-xs text-gray-500 truncate">{customer.email}</p>
                          </div>
                        </div>
                      </div>
                      <Link
                        to="/my-quotes"
                        className="flex items-center gap-2.5 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all"
                      >
                        <LayoutDashboard className="w-4 h-4 text-[#39FF14]" />
                        My Quotations
                        <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-[#39FF14]/15 text-[#39FF14] rounded font-bold">Dashboard</span>
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/5 transition-all border-t border-white/5"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setAuthOpen(true)}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-all border border-white/10 hover:border-white/25 px-3 py-2 rounded-lg hover:bg-white/5 h-9"
                >
                  <User className="w-3.5 h-3.5" />
                  Sign In
                </button>
              )}
            </div>

            {/* Mobile toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden w-11 h-11 flex items-center justify-center rounded-lg border border-white/10 text-white hover:border-[#39FF14]/50 hover:text-[#39FF14] transition-all"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="lg:hidden bg-[#0A0A0A]/98 backdrop-blur-xl border-t border-white/5 py-6 px-6">
            <div className="flex flex-col gap-4">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`text-sm font-medium py-2 border-b border-white/5 transition-colors ${location.pathname === link.href ? "text-[#39FF14]" : "text-gray-300 hover:text-[#39FF14]"}`}
                >
                  {link.label}
                </Link>
              ))}
              {customer ? (
                <>
                  {/* Mobile account info */}
                  <div className="flex items-center gap-3 py-2 border-b border-white/5">
                    <div className="w-8 h-8 rounded-full bg-[#39FF14]/10 border border-[#39FF14]/20 flex items-center justify-center font-bold text-[#39FF14] text-sm">
                      {(customer.username || "U")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{customer.username}</p>
                      <p className="text-xs text-gray-500">{customer.email}</p>
                    </div>
                  </div>
                  <Link
                    to="/my-quotes"
                    className="flex items-center gap-2 text-sm text-gray-300 py-2 border-b border-white/5 hover:text-[#39FF14] transition-colors"
                  >
                    <LayoutDashboard className="w-4 h-4 text-[#39FF14]" />
                    My Quotations
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-sm text-red-400 py-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { setAuthOpen(true); setMobileOpen(false); }}
                  className="flex items-center gap-2 text-sm text-gray-400 py-2 border-b border-white/5 hover:text-[#39FF14] transition-colors"
                >
                  <User className="w-4 h-4" />
                  Sign In / Create Account
                </button>
              )}
              <button
                onClick={() => { setQuoteOpen(true); setMobileOpen(false); }}
                className="btn-primary mt-2 w-full text-center"
              >
                Get a Personalized Quote
              </button>
            </div>
          </div>
        )}
      </nav>

      <QuoteModal open={quoteOpen} onClose={() => setQuoteOpen(false)} />
      <CustomerAuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
