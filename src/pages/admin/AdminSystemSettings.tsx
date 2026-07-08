import { useState, useEffect, useCallback } from "react";
import { Settings, Loader2, Save, ToggleLeft, ToggleRight, Shield, MessageCircle, Star, Gift, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";

interface SystemSetting {
  key: string;
  value: boolean;
  label: string;
  description: string;
}

const SETTING_ICONS: Record<string, any> = {
  loyalty_program_enabled: Gift,
  chat_enabled: MessageCircle,
  reviews_enabled: Star,
  referral_enabled: Shield,
};

export default function AdminSystemSettings() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await apiClient.get("/settings.php");
    if (!error && data) {
      setSettings(data.map((s: any) => ({ ...s, value: s.value === true || s.value === "true" })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const toggleSetting = async (key: string, currentValue: boolean) => {
    setSaving(key);
    const newValue = !currentValue;
    const { error } = await apiClient.put(`/settings.php?key=${key}`, { value: newValue });
    if (error) {
      toast.error("Failed to update setting: " + error.message);
    } else {
      setSettings(prev => prev.map(s => s.key === key ? { ...s, value: newValue } : s));
      toast.success(`${key.replace(/_/g, " ")} ${newValue ? "enabled" : "disabled"}`);
    }
    setSaving(null);
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-[#39FF14] animate-spin" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-orbitron font-bold text-2xl text-white">System Settings</h1>
          <p className="text-gray-500 text-sm mt-1">Enable or disable platform features globally</p>
        </div>
        <button onClick={fetchSettings} className="flex items-center gap-2 px-4 py-2.5 glass rounded-xl border border-white/10 text-gray-400 hover:text-white text-xs font-semibold transition-all">
          <RefreshCw className="w-3.5 h-3.5" />Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {settings.map(setting => {
          const IconComp = SETTING_ICONS[setting.key] || Settings;
          return (
            <div key={setting.key} className={`glass rounded-2xl border p-6 transition-all ${setting.value ? "border-[#39FF14]/20 bg-[#39FF14]/3" : "border-white/5"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 transition-all ${setting.value ? "bg-[#39FF14]/15 border-[#39FF14]/30" : "bg-white/5 border-white/10"}`}>
                    <IconComp className={`w-6 h-6 ${setting.value ? "text-[#39FF14]" : "text-gray-500"}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">{setting.label}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{setting.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleSetting(setting.key, setting.value)}
                  disabled={saving === setting.key}
                  className="shrink-0 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  {saving === setting.key ? (
                    <Loader2 className="w-8 h-8 text-[#39FF14] animate-spin" />
                  ) : setting.value ? (
                    <ToggleRight className="w-10 h-10 text-[#39FF14]" />
                  ) : (
                    <ToggleLeft className="w-10 h-10 text-gray-500" />
                  )}
                </button>
              </div>
              <div className="mt-4 pt-4 border-t border-white/5">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${setting.value ? "bg-[#39FF14]/15 text-[#39FF14]" : "bg-gray-500/15 text-gray-500"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${setting.value ? "bg-[#39FF14]" : "bg-gray-500"}`} />
                  {setting.value ? "Active" : "Disabled"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
