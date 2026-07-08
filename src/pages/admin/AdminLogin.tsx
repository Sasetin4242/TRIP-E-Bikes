import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Zap, Mail, Lock, ArrowLeft, Eye, EyeOff, Shield, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";

function mapUser(user: any) {
  return {
    id: String(user.id),
    email: user.email,
    username: user.username || user.email.split("@")[0],
    avatar: user.avatar,
    role: user.role || "admin",
  };
}

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState<"email" | "otp" | "password">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "setup">("signin");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown tick for OTP resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleSendOtp = async () => {
    if (!email.trim()) return;
    setLoading(true);
    const { data, error } = await apiClient.post("/auth.php?action=send_otp", {
      email: email.trim(),
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    toast.success("OTP sent to your email");
    setStep("otp");
    setResendCooldown(60);
    setLoading(false);
  };

  const handleResendAdminOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setLoading(true);
    const { data, error } = await apiClient.post("/auth.php?action=send_otp", {
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

  const handleDemoAdminLogin = async () => {
    setLoading(true);
    const demoEmail = "demo.admin@tripmobility.ph";
    const demoPass = "AdminTrip2026!";
    // Try sign in first
    const { data, error } = await apiClient.post("/auth.php?action=login", { email: demoEmail, password: demoPass });
    if (error) {
      // Account may not exist — pre-fill credentials and let user proceed manually
      setEmail(demoEmail);
      setPassword(demoPass);
      setMode("signin");
      setStep("password");
      toast.info("Demo credentials pre-filled. Click Sign In to continue.");
      setLoading(false);
      return;
    }
    if (data && data.user && data.token) {
      localStorage.setItem("token", data.token);
      login(mapUser(data.user));
      navigate("/admin");
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) return;
    setLoading(true);
    
    if (mode === "setup") {
      setStep("password");
      setLoading(false);
    } else {
      // Direct OTP sign-in for admins
      const { data, error } = await apiClient.post("/auth.php?action=verify_otp", {
        email: email.trim(),
        otp: otp.trim(),
      });
      if (error) {
        toast.error("Invalid OTP: " + error.message);
        setLoading(false);
        return;
      }
      if (data && data.user && data.token) {
        localStorage.setItem("token", data.token);
        login(mapUser(data.user));
        navigate("/admin");
      }
      setLoading(false);
    }
  };

  const handlePasswordLogin = async () => {
    if (!password.trim()) return;
    setLoading(true);
    const { data, error } = await apiClient.post("/auth.php?action=login", {
      email: email.trim(),
      password: password.trim(),
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    if (data && data.user && data.token) {
      localStorage.setItem("token", data.token);
      login(mapUser(data.user));
      navigate("/admin");
    }
    setLoading(false);
  };

  const handleSetPassword = async () => {
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    setLoading(true);
    const { data, error } = await apiClient.post("/auth.php?action=verify_otp", {
      email: email.trim(),
      otp: otp.trim(),
      password: password.trim(),
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    if (data && data.user && data.token) {
      localStorage.setItem("token", data.token);
      login(mapUser(data.user));
      navigate("/admin");
    }
    setLoading(false);
  };


  return (
    <div className="min-h-screen bg-[#070707] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#39FF14]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[#00FFFF]/3 rounded-full blur-[80px] pointer-events-none" />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-3"
        style={{
          backgroundImage: "linear-gradient(rgba(57,255,20,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(57,255,20,0.3) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Back to site */}
        <Link to="/" className="flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors text-sm mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Website
        </Link>

        <div className="glass rounded-2xl border border-white/10 overflow-hidden">
          {/* Header accent */}
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#39FF14] to-[#00FFFF]" />

          <div className="p-8">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-[#39FF14]/10 border border-[#39FF14]/20 flex items-center justify-center">
                <Zap className="w-6 h-6 text-[#39FF14]" fill="#39FF14" />
              </div>
              <div>
                <p className="font-orbitron font-black text-xl text-white">TRIP</p>
                <p className="text-[10px] text-[#39FF14] tracking-[0.3em] uppercase">Admin Panel</p>
              </div>
            </div>

            {/* Security badge */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#39FF14]/5 border border-[#39FF14]/15 mb-6">
              <Shield className="w-4 h-4 text-[#39FF14]" />
              <p className="text-xs text-gray-400">Secured admin access — authorized personnel only</p>
            </div>

            {step === "email" && (
              <div className="space-y-5">
                <div>
                  <h2 className="font-orbitron font-bold text-2xl text-white mb-1">Admin Access</h2>
                  <p className="text-gray-500 text-sm">Enter your admin email to continue</p>
                </div>

                {/* Demo Admin Access */}
                <div className="p-3 rounded-xl border border-[#39FF14]/20 bg-[#39FF14]/5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#39FF14]" />
                    <span className="text-xs text-[#39FF14] font-semibold uppercase tracking-wide">Demo Admin Access</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mb-2.5">Preview the admin panel instantly with a read-only demo account.</p>
                  <button
                    onClick={handleDemoAdminLogin}
                    disabled={loading}
                    className="w-full py-2 rounded-lg text-xs font-bold bg-[#39FF14]/15 border border-[#39FF14]/30 text-[#39FF14] hover:bg-[#39FF14]/25 transition-all disabled:opacity-50"
                  >
                    {loading ? "Signing in..." : "⚡ Access Demo Admin"}
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/8" />
                  <span className="text-[10px] text-gray-600 uppercase tracking-widest">or sign in</span>
                  <div className="flex-1 h-px bg-white/8" />
                </div>

                <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/8">
                  <button
                    onClick={() => setMode("signin")}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${mode === "signin" ? "bg-[#39FF14] text-[#0A0A0A]" : "text-gray-400 hover:text-white"}`}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => setMode("setup")}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${mode === "setup" ? "bg-[#39FF14] text-[#0A0A0A]" : "text-gray-400 hover:text-white"}`}
                  >
                    First Time Setup
                  </button>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-2 uppercase tracking-widest font-medium">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (mode === "signin" ? setStep("password") : handleSendOtp())}
                      placeholder="admin@tripmobility.ph"
                      autoComplete="email"
                      className="w-full border border-white/10 rounded-xl pl-11 pr-4 py-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#39FF14]/50 transition-all text-sm"
                      style={{ background: "#1C1C1C" }}
                    />
                  </div>
                </div>

                {mode === "signin" ? (
                  <button
                    onClick={() => email.trim() && setStep("password")}
                    disabled={!email.trim()}
                    className="w-full btn-primary"
                  >
                    Continue with Password
                  </button>
                ) : (
                  <button
                    onClick={handleSendOtp}
                    disabled={!email.trim() || loading}
                    className="w-full btn-primary"
                  >
                    {loading ? "Sending OTP..." : "Send Verification Code"}
                  </button>
                )}
              </div>
            )}

            {step === "password" && mode === "signin" && (
              <div className="space-y-5">
                <div>
                  <button onClick={() => setStep("email")} className="flex items-center gap-2 text-gray-500 hover:text-gray-300 text-xs mb-4">
                    <ArrowLeft className="w-3 h-3" /> {email}
                  </button>
                  <h2 className="font-orbitron font-bold text-2xl text-white mb-1">Enter Password</h2>
                  <p className="text-gray-500 text-sm">Welcome back, admin</p>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-2 uppercase tracking-widest font-medium">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handlePasswordLogin()}
                      placeholder="Your admin password"
                      autoComplete="current-password"
                      className="w-full border border-white/10 rounded-xl pl-11 pr-12 py-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#39FF14]/50 transition-all text-sm"
                      style={{ background: "#1C1C1C" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handlePasswordLogin}
                    disabled={!password || loading}
                    className="flex-1 btn-primary"
                  >
                    {loading ? "Signing In..." : "Sign In"}
                  </button>
                </div>

                <button
                  onClick={() => { setStep("email"); setMode("setup"); handleSendOtp(); }}
                  className="w-full text-xs text-gray-500 hover:text-[#39FF14] transition-colors text-center"
                >
                  Forgot password? Verify via OTP
                </button>
              </div>
            )}

            {step === "otp" && (
              <div className="space-y-5">
                <div>
                  <button onClick={() => setStep("email")} className="flex items-center gap-2 text-gray-500 hover:text-gray-300 text-xs mb-4">
                    <ArrowLeft className="w-3 h-3" /> {email}
                  </button>
                  <h2 className="font-orbitron font-bold text-2xl text-white mb-1">Enter OTP</h2>
                  <p className="text-gray-500 text-sm">Check your email for the {4}-digit code</p>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-2 uppercase tracking-widest font-medium">Verification Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
                    placeholder="000000"
                    autoComplete="one-time-code"
                    className="w-full border border-white/10 rounded-xl px-4 py-4 text-white text-center text-3xl tracking-[0.5em] font-orbitron placeholder-gray-700 focus:outline-none focus:border-[#39FF14]/50 transition-all"
                    style={{ background: "#1C1C1C" }}
                  />
                </div>

                <button
                  onClick={handleVerifyOtp}
                  disabled={otp.length < 4 || loading}
                  className="w-full btn-primary"
                >
                  {loading ? "Verifying..." : "Verify Code"}
                </button>

                <button
                  onClick={handleResendAdminOtp}
                  disabled={resendCooldown > 0 || loading}
                  className={`w-full text-xs font-semibold py-2.5 px-4 rounded-xl border transition-all ${
                    resendCooldown > 0 || loading
                      ? "border-white/8 text-gray-600 cursor-not-allowed bg-white/2"
                      : "border-[#39FF14]/30 text-[#39FF14] hover:bg-[#39FF14]/8 hover:border-[#39FF14]/50"
                  }`}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
                </button>
              </div>
            )}

            {step === "password" && mode === "setup" && (
              <div className="space-y-5">
                <div>
                  <h2 className="font-orbitron font-bold text-2xl text-white mb-1">Set Your Password</h2>
                  <p className="text-gray-500 text-sm">Create a secure admin password</p>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-2 uppercase tracking-widest font-medium">New Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      autoComplete="new-password"
                      className="w-full border border-white/10 rounded-xl pl-11 pr-12 py-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#39FF14]/50 transition-all text-sm"
                      style={{ background: "#1C1C1C" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {password.length > 0 && (
                    <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${password.length < 6 ? "bg-red-500 w-1/4" : password.length < 10 ? "bg-yellow-500 w-1/2" : "bg-[#39FF14] w-full"}`}
                      />
                    </div>
                  )}
                </div>

                <button
                  onClick={handleSetPassword}
                  disabled={password.length < 6 || loading}
                  className="w-full btn-primary"
                >
                  {loading ? "Setting up..." : "Set Password & Access Admin"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
