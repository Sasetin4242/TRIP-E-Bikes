import { useState, useEffect } from "react";
import { Zap, Mail, Lock, ArrowLeft, Eye, EyeOff, User, CheckCircle, FileText, Clock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";

function mapCustomer(user: any) {
  return {
    id: String(user.id),
    email: user.email || "",
    username: user.user_metadata?.username || user.email?.split("@")[0] || "",
    avatar: user.user_metadata?.avatar || "",
  };
}


interface CustomerAuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  prefilledEmail?: string;
  title?: string;
  subtitle?: string;
}

// Shared input class — solid dark bg defeats browser autofill white flash
const INPUT_BASE =
  "w-full border border-white/10 rounded-xl py-3.5 text-white placeholder-gray-600 text-sm transition-all focus:outline-none focus:border-[#39FF14]/50";
const INPUT_DARK_STYLE = { background: "#1C1C1C" };

export default function CustomerAuthModal({
  open,
  onClose,
  onSuccess,
  prefilledEmail = "",
  title,
  subtitle,
}: CustomerAuthModalProps) {
  const { login } = useCustomerAuth();
  const [mode, setMode] = useState<"choose" | "register" | "login">("choose");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState(prefilledEmail);
  const [username, setUsername] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Password strength
  const getPasswordStrength = (pw: string): { level: 0 | 1 | 2 | 3; label: string; color: string; width: string } => {
    if (!pw) return { level: 0, label: "", color: "", width: "0%" };
    const hasUpper = /[A-Z]/.test(pw);
    const hasNum = /[0-9]/.test(pw);
    const hasSym = /[^A-Za-z0-9]/.test(pw);
    const mixed = (hasUpper ? 1 : 0) + (hasNum ? 1 : 0) + (hasSym ? 1 : 0);
    if (pw.length >= 10 && mixed >= 2) return { level: 3, label: "Strong", color: "bg-[#39FF14]", width: "100%" };
    if (pw.length >= 6) return { level: 2, label: "Medium", color: "bg-yellow-500", width: "60%" };
    return { level: 1, label: "Weak", color: "bg-red-500", width: "30%" };
  };

  // Countdown tick
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  if (!open) return null;

  const resetFlow = () => {
    setStep("email");
    setOtp("");
    setPassword("");
    setShowPass(false);
  };

  const handleSendOtp = async () => {
    if (!email.trim()) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    toast.success("Verification code sent to " + email.trim());
    setStep("otp");
    setResendCooldown(60);
    setLoading(false);
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("New code sent to " + email.trim());
      setResendCooldown(60);
    }
    setLoading(false);
  };

  const handleVerifyAndRegister = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otp.trim(),
      type: 'email',
    });
    if (error) {
      toast.error("Invalid or expired code. Please try again.");
      setLoading(false);
      return;
    }
    if (data && data.user) {
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        password: password.trim(),
        data: {
          username: username || email.split("@")[0],
          role: "customer"
        }
      });
      if (updateError) {
        toast.error(updateError.message);
        setLoading(false);
        return;
      }
      if (updateData && updateData.user) {
        login(mapCustomer(updateData.user));
        toast.success("Account created! Welcome to TRIP Mobility.");
        onSuccess();
      }
    }
    setLoading(false);
  };

  const handleLogin = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim(),
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    if (data && data.user) {
      login(mapCustomer(data.user));
      toast.success("Welcome back!");
      onSuccess();
    }
    setLoading(false);
  };

  const benefits = [
    { icon: FileText, text: "Track all your quotation requests" },
    { icon: CheckCircle, text: "Receive official proposals via dashboard" },
    { icon: Clock, text: "Real-time status updates on your quotes" },
    { icon: User, text: "Dedicated account manager assigned" },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />

      <div
        className="relative w-full max-w-lg rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
        style={{ background: "linear-gradient(145deg, #141414 0%, #0F0F0F 100%)" }}
      >
        {/* Top accent bar */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#39FF14] to-[#00FFFF]" />

        <div className="p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#39FF14]/10 border border-[#39FF14]/20 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-[#39FF14]" />
              </div>
              <div>
                <p className="text-[10px] text-[#39FF14] tracking-[0.2em] uppercase font-semibold">TRIP Mobility</p>
                <h2 className="font-orbitron font-bold text-xl text-white">
                  {title || "Account Required"}
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-white border border-white/10 hover:border-white/30 transition-all text-lg leading-none"
            >
              ×
            </button>
          </div>

          {subtitle && (
            <p className="text-gray-400 text-sm mb-6 leading-relaxed bg-[#39FF14]/5 border border-[#39FF14]/15 rounded-xl p-4">
              {subtitle}
            </p>
          )}

          {/* ── CHOOSE ── */}
          {mode === "choose" && (
            <div className="space-y-4">
              {/* Demo customer shortcut */}
              <div className="p-3.5 rounded-xl border border-[#39FF14]/25 bg-[#39FF14]/5">
                <div className="flex items-center gap-2 mb-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#39FF14]" />
                  <span className="text-xs text-[#39FF14] font-bold uppercase tracking-wide">Try Demo Account</span>
                  <span className="ml-auto px-1.5 py-0.5 bg-[#39FF14]/20 rounded text-[9px] text-[#39FF14] font-bold">FREE</span>
                </div>
                <p className="text-[11px] text-gray-400 mb-2.5">Explore the customer portal instantly — no personal email needed.</p>
                <button
                  onClick={async () => {
                    setLoading(true);
                    const { data, error } = await supabase.auth.signInWithPassword({
                      email: "demo.customer@tripmobility.ph",
                      password: "DemoTrip2026!",
                    });
                    if (error) {
                      toast.error("Demo login failed. Please use the sign-in form.");
                      setMode("login");
                      setEmail("demo.customer@tripmobility.ph");
                      setPassword("DemoTrip2026!");
                    } else if (data && data.user) {
                      login(mapCustomer(data.user));
                      toast.success("Demo account loaded! Welcome.");
                      onSuccess();
                    }
                    setLoading(false);
                  }}
                  disabled={loading}
                  className="w-full py-2 rounded-lg text-xs font-bold bg-[#39FF14] text-[#0A0A0A] hover:bg-[#4FFF2A] transition-all disabled:opacity-60"
                >
                  {loading ? "Loading..." : "⚡ Enter as Demo Customer"}
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/8" />
                <span className="text-[10px] text-gray-600 uppercase tracking-widest">or create account</span>
                <div className="flex-1 h-px bg-white/8" />
              </div>

              <p className="text-gray-400 text-sm text-center">
                Create a free account or sign in to submit your quote
              </p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {benefits.map((b, i) => (
                  <div key={i} className="flex items-center gap-2 p-3 rounded-xl border border-white/5" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <b.icon className="w-4 h-4 text-[#39FF14] shrink-0" />
                    <p className="text-xs text-gray-400">{b.text}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => { setMode("register"); resetFlow(); }}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                <User className="w-4 h-4" />
                Create Free Account
              </button>
              <button
                onClick={() => { setMode("login"); resetFlow(); }}
                className="w-full btn-outline flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                Sign In to Existing Account
              </button>
            </div>
          )}

          {/* ── REGISTER ── */}
          {mode === "register" && (
            <div className="space-y-4">
              <button
                onClick={() => { setMode("choose"); resetFlow(); }}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors mb-1"
              >
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
              <h3 className="font-semibold text-white text-lg">Create Your Account</h3>

              {/* Step 1 — email */}
              {step === "email" && (
                <>
                  <div>
                    <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wide">
                      Full Name
                    </label>
                    <input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Your name"
                      autoComplete="name"
                      className={`${INPUT_BASE} px-4`}
                      style={INPUT_DARK_STYLE}
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wide">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                        placeholder="your@email.com"
                        autoComplete="email"
                        className={`${INPUT_BASE} pl-11 pr-4`}
                        style={INPUT_DARK_STYLE}
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSendOtp}
                    disabled={!email || loading}
                    className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Sending..." : "Send Verification Code"}
                  </button>
                </>
              )}

              {/* Step 2 — OTP + password */}
              {step === "otp" && (
                <>
                  <p className="text-gray-400 text-sm">
                    Code sent to{" "}
                    <span className="text-white font-semibold">{email}</span>
                  </p>

                  <div>
                    <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wide">
                      Verification Code
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                      autoComplete="one-time-code"
                      className={`${INPUT_BASE} px-4 text-center text-2xl tracking-[0.5em] font-orbitron`}
                      style={INPUT_DARK_STYLE}
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wide flex items-center justify-between">
                      <span>Create Password</span>
                      {password && (
                        <span className={`text-[10px] font-semibold ${
                          getPasswordStrength(password).level === 3 ? "text-[#39FF14]" :
                          getPasswordStrength(password).level === 2 ? "text-yellow-400" : "text-red-400"
                        }`}>{getPasswordStrength(password).label}</span>
                      )}
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                      <input
                        type={showPass ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleVerifyAndRegister()}
                        placeholder="Min. 6 characters"
                        autoComplete="new-password"
                        className={`${INPUT_BASE} pl-11 pr-12`}
                        style={INPUT_DARK_STYLE}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors z-10"
                      >
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {password && (
                      <div className="mt-2">
                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${getPasswordStrength(password).color}`}
                            style={{ width: getPasswordStrength(password).width }}
                          />
                        </div>
                        <p className="text-[10px] text-gray-600 mt-1">
                          {getPasswordStrength(password).level < 3 ? "Add uppercase, numbers or symbols for a stronger password" : "Great password!"}
                        </p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleVerifyAndRegister}
                    disabled={otp.length < 4 || password.length < 6 || loading}
                    className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Creating account..." : "Create Account & Continue"}
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleResendOtp}
                      disabled={resendCooldown > 0 || loading}
                      className={`flex-1 text-xs font-semibold py-2.5 px-4 rounded-xl border transition-all ${
                        resendCooldown > 0 || loading
                          ? "border-white/8 text-gray-600 cursor-not-allowed bg-white/2"
                          : "border-[#39FF14]/30 text-[#39FF14] hover:bg-[#39FF14]/8 hover:border-[#39FF14]/50"
                      }`}
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
                    </button>
                    <button
                      onClick={() => setStep("email")}
                      className="text-xs text-gray-600 hover:text-gray-400 transition-colors whitespace-nowrap"
                    >
                      Change email
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── LOGIN ── */}
          {mode === "login" && (
            <div className="space-y-4">
              <button
                onClick={() => { setMode("choose"); resetFlow(); }}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors mb-1"
              >
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
              <h3 className="font-semibold text-white text-lg">Sign In</h3>

              {/* Demo account */}
              <div className="p-3 rounded-xl border border-[#39FF14]/20 bg-[#39FF14]/5">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#39FF14]" />
                  <span className="text-xs text-[#39FF14] font-semibold uppercase tracking-wide">Demo Customer Account</span>
                </div>
                <p className="text-[11px] text-gray-400 mb-2.5">Try the customer portal instantly — no sign-up required.</p>
                <button
                  onClick={() => {
                    setEmail("demo.customer@tripmobility.ph");
                    setPassword("DemoTrip2026!");
                  }}
                  className="w-full py-2 rounded-lg text-xs font-bold bg-[#39FF14]/15 border border-[#39FF14]/30 text-[#39FF14] hover:bg-[#39FF14]/25 transition-all"
                >
                  ⚡ Use Demo Credentials
                </button>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wide">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    autoComplete="email"
                    className={`${INPUT_BASE} pl-11 pr-4`}
                    style={INPUT_DARK_STYLE}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wide">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    placeholder="Your password"
                    autoComplete="current-password"
                    className={`${INPUT_BASE} pl-11 pr-12`}
                    style={INPUT_DARK_STYLE}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors z-10"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                onClick={handleLogin}
                disabled={!email || !password || loading}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
