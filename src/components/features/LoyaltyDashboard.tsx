import { useState, useEffect, useCallback } from "react";
import {
  Gift, Star, Trophy, Zap, Copy, Check, RefreshCw, Loader2,
  Award, ArrowRight, ChevronRight, Clock, TrendingUp, Shield,
  CheckCircle, X, Package, Wrench, Tag
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { Link } from "react-router-dom";

interface LoyaltyPoint {
  id: string;
  points: number;
  action_type: string;
  reason: string;
  created_at: string;
}

interface LoyaltyReward {
  id: string;
  name: string;
  description: string;
  points_cost: number;
  reward_type: string;
  reward_value: string;
  available: boolean;
}

interface Redemption {
  id: string;
  points_used: number;
  status: string;
  redemption_code: string | null;
  created_at: string;
  loyalty_rewards: { name: string; reward_type: string } | null;
}

const TIER_CONFIG = [
  { name: "Bronze", min: 0, max: 999, color: "text-amber-600", bg: "bg-amber-600/15", border: "border-amber-600/30", icon: "🥉" },
  { name: "Silver", min: 1000, max: 4999, color: "text-gray-300", bg: "bg-gray-400/15", border: "border-gray-400/30", icon: "🥈" },
  { name: "Gold", min: 5000, max: 14999, color: "text-yellow-400", bg: "bg-yellow-400/15", border: "border-yellow-400/30", icon: "🥇" },
  { name: "Platinum", min: 15000, max: Infinity, color: "text-[#39FF14]", bg: "bg-[#39FF14]/15", border: "border-[#39FF14]/30", icon: "💎" },
];

export default function LoyaltyDashboard() {
  const { customer } = useCustomerAuth();
  const [points, setPoints] = useState<LoyaltyPoint[]>([]);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [referralCode, setReferralCode] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(true);

  const totalPoints = points.reduce((s, p) => p.action_type === "earned" ? s + p.points : s - p.points, 0);

  const getTier = (pts: number) => TIER_CONFIG.find(t => pts >= t.min && pts <= t.max) || TIER_CONFIG[0];
  const tier = getTier(totalPoints);
  const nextTier = TIER_CONFIG.find(t => t.min > totalPoints);
  const tierProgress = nextTier ? ((totalPoints - tier.min) / (nextTier.min - tier.min)) * 100 : 100;

  const fetchAll = useCallback(async () => {
    if (!customer) return;
    setLoading(true);

    const [settingRes, loyaltyRes] = await Promise.all([
      apiClient.get("/settings.php"),
      apiClient.get(`/loyalty.php?email=${customer.email}`),
    ]);

    if (settingRes.data && Array.isArray(settingRes.data)) {
      const loyaltySetting = settingRes.data.find((s: any) => s.key === "loyalty_program_enabled");
      setLoyaltyEnabled(loyaltySetting ? loyaltySetting.value !== false : true);
    }
    
    if (loyaltyRes.data) {
      setPoints(loyaltyRes.data.points_history || []);
      setRewards(loyaltyRes.data.rewards || []);
      
      // Adapt reward redemption names if needed
      const redemptionsMapped = (loyaltyRes.data.redemptions || []).map((red: any) => ({
        ...red,
        id: String(red.id),
        loyalty_rewards: {
          name: red.reward_name,
          reward_type: red.reward_type
        }
      }));
      setRedemptions(redemptionsMapped);

      if (loyaltyRes.data.referral_code) {
        setReferralCode(loyaltyRes.data.referral_code);
      } else {
        // Generate referral code
        const code = `TRIP-${customer.username?.slice(0, 4).toUpperCase() || "USER"}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        await apiClient.post("/loyalty.php?action=create_referral", { email: customer.email, code });
        setReferralCode(code);
      }
    }
    setLoading(false);
  }, [customer]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleRedeem = async (reward: LoyaltyReward) => {
    if (totalPoints < reward.points_cost) { toast.error("Insufficient points"); return; }
    setRedeeming(reward.id);
    const code = `REDEEM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const { error } = await apiClient.post("/loyalty.php?action=redeem_reward", {
      email: customer!.email,
      reward_id: reward.id,
      code,
    });
    if (error) { toast.error(error.message); }
    else {
      toast.success(`Redeemed! Your code: ${code}`);
      fetchAll();
    }
    setRedeeming(null);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Referral code copied!");
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-[#39FF14] animate-spin" /></div>;

  if (!loyaltyEnabled) return (
    <div className="text-center py-16">
      <Gift className="w-16 h-16 text-gray-700 mx-auto mb-4" />
      <p className="text-gray-500">Loyalty program is currently unavailable.</p>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* ── Points Overview Card ── */}
      <div className="glass rounded-2xl border border-[#39FF14]/20 p-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#39FF14]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-[#39FF14]/10 border border-[#39FF14]/20 flex items-center justify-center">
              <span className="text-4xl">{tier.icon}</span>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Your Points</p>
            <p className="font-orbitron font-black text-5xl text-[#39FF14] mb-1">{totalPoints.toLocaleString()}</p>
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${tier.bg} ${tier.border} ${tier.color}`}>{tier.icon} {tier.name} Member</span>
              {nextTier && <span className="text-xs text-gray-500">{(nextTier.min - totalPoints).toLocaleString()} pts to {nextTier.name}</span>}
            </div>
            {nextTier && (
              <div className="w-full sm:max-w-xs">
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#39FF14] to-[#00FFFF] rounded-full transition-all duration-1000" style={{ width: `${tierProgress}%` }} />
                </div>
              </div>
            )}
          </div>
          <div className="text-center shrink-0">
            <p className="text-xs text-gray-500 mb-1">Total Earned</p>
            <p className="font-orbitron font-bold text-2xl text-white">{points.filter(p => p.action_type === "earned").reduce((s, p) => s + p.points, 0).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* ── Referral Code ── */}
      <div className="glass rounded-2xl border border-white/8 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#00FFFF]/10 border border-[#00FFFF]/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-[#00FFFF]" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Your Referral Code</h3>
            <p className="text-xs text-gray-500">Earn 500 points for every friend who registers with your code</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 px-4 py-3 rounded-xl border border-white/10 bg-white/5 font-mono text-[#39FF14] font-bold tracking-widest text-sm">
            {referralCode}
          </div>
          <button onClick={copyCode} className={`px-5 py-3 rounded-xl border font-semibold text-sm transition-all flex items-center gap-2 ${copied ? "bg-[#39FF14]/20 border-[#39FF14]/40 text-[#39FF14]" : "glass border-white/10 text-gray-300 hover:text-white hover:border-white/20"}`}>
            {copied ? <><Check className="w-4 h-4" />Copied!</> : <><Copy className="w-4 h-4" />Copy</>}
          </button>
        </div>
      </div>

      {/* ── Available Rewards ── */}
      <div>
        <h3 className="font-orbitron font-bold text-lg text-white mb-4">Available <span className="gradient-text">Rewards</span></h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rewards.map(reward => {
            const canRedeem = totalPoints >= reward.points_cost;
            const isService = reward.reward_type === "service";
            return (
              <div key={reward.id} className={`glass rounded-xl border p-5 flex flex-col transition-all ${canRedeem ? "border-[#39FF14]/20 hover:border-[#39FF14]/40" : "border-white/5 opacity-60"}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isService ? "bg-blue-500/15 border border-blue-500/30" : "bg-[#39FF14]/10 border border-[#39FF14]/20"}`}>
                    {isService ? <Wrench className="w-5 h-5 text-blue-400" /> : <Tag className="w-5 h-5 text-[#39FF14]" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-white text-sm">{reward.name}</p>
                    <p className="text-xs text-gray-500">{reward.description}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-[#39FF14] fill-[#39FF14]" />
                    <span className="font-orbitron font-bold text-[#39FF14] text-sm">{reward.points_cost.toLocaleString()}</span>
                    <span className="text-xs text-gray-500">pts</span>
                  </div>
                  <button
                    onClick={() => handleRedeem(reward)}
                    disabled={!canRedeem || redeeming === reward.id}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${canRedeem ? "bg-[#39FF14] text-[#0A0A0A] hover:bg-white" : "bg-white/5 text-gray-500 cursor-not-allowed"}`}
                  >
                    {redeeming === reward.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Redeem"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Points History ── */}
      <div>
        <h3 className="font-orbitron font-bold text-lg text-white mb-4">Points <span className="gradient-text">History</span></h3>
        {points.length === 0 ? (
          <div className="glass rounded-xl border border-white/5 p-8 text-center">
            <Zap className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No points activity yet. Get your first quote approved to earn points!</p>
            <Link to="/products" className="btn-primary text-sm mt-4 inline-flex items-center gap-2">
              <Package className="w-4 h-4" />Browse Products
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {points.slice(0, 10).map(point => (
              <div key={point.id} className="glass rounded-xl border border-white/5 p-4 flex items-center gap-4">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${point.action_type === "earned" ? "bg-[#39FF14]/10 border border-[#39FF14]/20" : "bg-red-500/10 border border-red-500/20"}`}>
                  {point.action_type === "earned" ? <TrendingUp className="w-4 h-4 text-[#39FF14]" /> : <ArrowRight className="w-4 h-4 text-red-400 rotate-90" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-white font-medium">{point.reason}</p>
                  <p className="text-xs text-gray-500">{new Date(point.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</p>
                </div>
                <span className={`font-orbitron font-bold text-sm ${point.action_type === "earned" ? "text-[#39FF14]" : "text-red-400"}`}>
                  {point.action_type === "earned" ? "+" : "-"}{point.points.toLocaleString()} pts
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Redemption History ── */}
      {redemptions.length > 0 && (
        <div>
          <h3 className="font-orbitron font-bold text-lg text-white mb-4">Redemption <span className="gradient-text">History</span></h3>
          <div className="space-y-2">
            {redemptions.map(r => (
              <div key={r.id} className="glass rounded-xl border border-white/5 p-4 flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-[#39FF14]/10 border border-[#39FF14]/20 flex items-center justify-center shrink-0">
                  <Gift className="w-4 h-4 text-[#39FF14]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-white font-medium">{r.loyalty_rewards?.name || "Reward"}</p>
                  {r.redemption_code && <p className="text-xs font-mono text-[#39FF14]">{r.redemption_code}</p>}
                  <p className="text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-red-400">-{r.points_used.toLocaleString()} pts</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === "pending" ? "bg-yellow-500/20 text-yellow-400" : "bg-[#39FF14]/20 text-[#39FF14]"}`}>
                    {r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
