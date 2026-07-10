import { useState, useEffect, useCallback } from "react";
import { Settings, Loader2, Save, ToggleLeft, ToggleRight, Shield, MessageCircle, Star, Gift, RefreshCw, Palette, Image as ImageIcon, Upload } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { supabase } from "@/lib/supabase";

interface SystemSetting {
  key: string;
  value: any;
  label?: string;
  description?: string;
}

const SETTING_ICONS: Record<string, any> = {
  loyalty_program_enabled: Gift,
  chat_enabled: MessageCircle,
  reviews_enabled: Star,
  referral_enabled: Shield,
};

const GOOGLE_FONTS = [
  { label: "Orbitron (Futuristic/Tech)", value: "Orbitron" },
  { label: "Inter (Clean/Modern)", value: "Inter" },
  { label: "Plus Jakarta Sans (Premium)", value: "Plus Jakarta Sans" },
  { label: "Outfit (Geometric/Sleek)", value: "Outfit" },
  { label: "Roboto (Neutral/Clean)", value: "Roboto" },
  { label: "Montserrat (Bold/Classic)", value: "Montserrat" },
];

export default function AdminSystemSettings() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"features" | "appearance" | "brand">("features");

  // Appearance State
  const [brandColor, setBrandColor] = useState("#39FF14");
  const [fontConfig, setFontConfig] = useState("Orbitron");

  // Brand Assets State
  const [logoUrl, setLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await apiClient.get("/settings.php");
    if (!error && data) {
      setSettings(data);
      // Map loaded values to states
      const colorSetting = data.find((s: any) => s.key === "primary_brand_color");
      if (colorSetting) setBrandColor(colorSetting.value);

      const fontSetting = data.find((s: any) => s.key === "font_configuration");
      if (fontSetting) setFontConfig(fontSetting.value);

      const logoSetting = data.find((s: any) => s.key === "brand_logo");
      if (logoSetting) setLogoUrl(logoSetting.value);

      const faviconSetting = data.find((s: any) => s.key === "brand_favicon");
      if (faviconSetting) setFaviconUrl(faviconSetting.value);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const toggleSetting = async (key: string, currentValue: boolean) => {
    setSaving(key);
    const newValue = !currentValue;
    const { error } = await apiClient.put(`/settings.php?key=${key}`, { value: newValue });
    if (error) {
      toast.error("Failed to update setting: " + error.message);
    } else {
      setSettings(prev => prev.map(s => s.key === key ? { ...s, value: newValue } : s));
      toast.success(`${key.replace(/_/g, " ")} updated successfully`);
    }
    setSaving(null);
  };

  const handleSaveAppearance = async () => {
    setSaving("appearance");
    try {
      const { error: colorErr } = await apiClient.put(`/settings.php?key=primary_brand_color`, { value: brandColor });
      const { error: fontErr } = await apiClient.put(`/settings.php?key=font_configuration`, { value: fontConfig });

      if (colorErr || fontErr) {
        toast.error("Failed to save some appearance settings.");
      } else {
        toast.success("Appearance settings updated successfully!");
        // Update local settings list
        setSettings(prev => {
          const updated = [...prev];
          const colorIdx = updated.findIndex(s => s.key === "primary_brand_color");
          if (colorIdx > -1) updated[colorIdx].value = brandColor;
          else updated.push({ key: "primary_brand_color", value: brandColor });

          const fontIdx = updated.findIndex(s => s.key === "font_configuration");
          if (fontIdx > -1) updated[fontIdx].value = fontConfig;
          else updated.push({ key: "font_configuration", value: fontConfig });

          return updated;
        });
      }
    } catch (e: any) {
      toast.error("An error occurred: " + e.message);
    } finally {
      setSaving(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "brand_logo" | "brand_favicon") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isLogo = type === "brand_logo";
    if (isLogo) setUploadingLogo(true);
    else setUploadingFavicon(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${type}-${Date.now()}.${fileExt}`;

      // Upload file to Supabase storage 'brand-assets'
      const { data, error } = await supabase.storage
        .from("brand-assets")
        .upload(fileName, file, { cacheControl: "3600", upsert: true });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("brand-assets")
        .getPublicUrl(fileName);

      // Save to system_settings
      const { error: apiError } = await apiClient.put(`/settings.php?key=${type}`, { value: publicUrl });

      if (apiError) throw apiError;

      if (isLogo) {
        setLogoUrl(publicUrl);
        toast.success("Logo uploaded and updated successfully!");
      } else {
        setFaviconUrl(publicUrl);
        toast.success("Favicon uploaded and updated successfully!");
      }

      // Update settings locally
      setSettings(prev => {
        const updated = [...prev];
        const idx = updated.findIndex(s => s.key === type);
        if (idx > -1) updated[idx].value = publicUrl;
        else updated.push({ key: type, value: publicUrl });
        return updated;
      });
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      if (isLogo) setUploadingLogo(false);
      else setUploadingFavicon(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 text-[#39FF14] animate-spin" />
      </div>
    );
  }

  // Filter features only
  const featureSettings = settings.filter(s =>
    ["loyalty_program_enabled", "chat_enabled", "reviews_enabled", "referral_enabled"].includes(s.key)
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-orbitron font-bold text-2xl text-white">System Settings</h1>
          <p className="text-gray-500 text-sm mt-1">Configure and manage your platform globally</p>
        </div>
        <button
          onClick={fetchSettings}
          className="flex items-center gap-2 px-4 py-2.5 glass rounded-xl border border-white/10 text-gray-400 hover:text-white text-xs font-semibold transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 mb-8 gap-6">
        <button
          onClick={() => setActiveTab("features")}
          className={`flex items-center gap-2 pb-4 text-sm font-semibold tracking-wide border-b-2 transition-all ${
            activeTab === "features"
              ? "border-[#39FF14] text-[#39FF14]"
              : "border-transparent text-gray-500 hover:text-gray-300"
          }`}
        >
          <Settings className="w-4 h-4" />
          Features
        </button>
        <button
          onClick={() => setActiveTab("appearance")}
          className={`flex items-center gap-2 pb-4 text-sm font-semibold tracking-wide border-b-2 transition-all ${
            activeTab === "appearance"
              ? "border-[#39FF14] text-[#39FF14]"
              : "border-transparent text-gray-500 hover:text-gray-300"
          }`}
        >
          <Palette className="w-4 h-4" />
          Appearance
        </button>
        <button
          onClick={() => setActiveTab("brand")}
          className={`flex items-center gap-2 pb-4 text-sm font-semibold tracking-wide border-b-2 transition-all ${
            activeTab === "brand"
              ? "border-[#39FF14] text-[#39FF14]"
              : "border-transparent text-gray-500 hover:text-gray-300"
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          Brand Assets
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "features" ? (
        <div key="features" className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {featureSettings.map(setting => {
            const IconComp = SETTING_ICONS[setting.key] || Settings;
            const isEnabled = setting.value === true || setting.value === "true";
            return (
              <div
                key={setting.key}
                className={`glass rounded-2xl border p-6 transition-all ${
                  isEnabled ? "border-[#39FF14]/20 bg-[#39FF14]/3" : "border-white/5"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 transition-all ${
                        isEnabled ? "bg-[#39FF14]/15 border-[#39FF14]/30" : "bg-white/5 border-white/10"
                      }`}
                    >
                      <IconComp className={`w-6 h-6 ${isEnabled ? "text-[#39FF14]" : "text-gray-500"}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-sm">{setting.label || setting.key}</h3>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{setting.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSetting(setting.key, isEnabled)}
                    disabled={saving === setting.key}
                    className="shrink-0 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                  >
                    {saving === setting.key ? (
                      <Loader2 className="w-8 h-8 text-[#39FF14] animate-spin" />
                    ) : isEnabled ? (
                      <ToggleRight className="w-10 h-10 text-[#39FF14]" />
                    ) : (
                      <ToggleLeft className="w-10 h-10 text-gray-500" />
                    )}
                  </button>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      isEnabled ? "bg-[#39FF14]/15 text-[#39FF14]" : "bg-gray-500/15 text-gray-500"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isEnabled ? "bg-[#39FF14]" : "bg-gray-500"}`} />
                    {isEnabled ? "Active" : "Disabled"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : activeTab === "appearance" ? (
        <div className="max-w-2xl glass rounded-2xl border border-white/5 p-8">
          <h2 className="font-orbitron font-bold text-lg text-white mb-6">Visual Style Configuration</h2>
          <div className="space-y-6">
            {/* Color Picker */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Primary Brand Color
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="w-12 h-12 rounded-xl bg-transparent border border-white/10 cursor-pointer overflow-hidden"
                />
                <input
                  type="text"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  placeholder="#39FF14"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#39FF14] transition-all"
                />
              </div>
              <p className="text-[11px] text-gray-500 mt-2">
                This color will be used for primary accents, buttons, and highlights across the public site.
              </p>
            </div>

            {/* Font Config */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Font Family Configuration
              </label>
              <select
                value={fontConfig}
                onChange={(e) => setFontConfig(e.target.value)}
                className="w-full bg-[#0E0E0E] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#39FF14] transition-all"
              >
                {GOOGLE_FONTS.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-500 mt-2">
                Sets the main display and heading font styling on the public pages.
              </p>
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-white/5 flex justify-end">
              <button
                onClick={handleSaveAppearance}
                disabled={saving === "appearance"}
                className="flex items-center gap-2 px-6 py-3 bg-[#39FF14] hover:bg-[#39FF14]/90 text-black text-xs font-bold uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
              >
                {saving === "appearance" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Appearance
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div key="brand" className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Logo Upload Card */}
          <div className="glass rounded-2xl border border-white/5 p-8 flex flex-col justify-between">
            <div>
              <h3 className="font-orbitron font-bold text-white text-base mb-2">Main Brand Logo</h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-6">
                Upload the primary logo for the header navigation and branding areas. Replaces the default SVG text/icon.
              </p>

              {logoUrl ? (
                <div className="mb-6 p-4 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center h-28 relative group">
                  <img src={logoUrl} alt="Main Logo Preview" className="max-h-20 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <div className="absolute inset-0 bg-black/60 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                    <span className="text-[10px] uppercase font-bold text-[#39FF14]">Active URL Saved</span>
                  </div>
                </div>
              ) : (
                <div className="mb-6 border border-dashed border-white/15 rounded-xl h-28 flex flex-col items-center justify-center text-gray-500">
                  <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                  <span className="text-xs">No custom logo uploaded yet</span>
                </div>
              )}
            </div>

            <div>
              <label className="flex items-center justify-center gap-2 w-full py-3.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl cursor-pointer text-xs font-bold uppercase tracking-widest text-white transition-all hover:scale-[1.02] active:scale-[0.98]">
                {uploadingLogo ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#39FF14]" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {uploadingLogo ? "Uploading..." : "Upload Main Logo"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, "brand_logo")}
                  disabled={uploadingLogo}
                  className="hidden"
                />
              </label>
              {logoUrl && (
                <p className="text-[10px] text-gray-600 mt-2 truncate text-center">
                  URL: {logoUrl}
                </p>
              )}
            </div>
          </div>

          {/* Favicon Upload Card */}
          <div className="glass rounded-2xl border border-white/5 p-8 flex flex-col justify-between">
            <div>
              <h3 className="font-orbitron font-bold text-white text-base mb-2">Favicon Logo</h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-6">
                Upload a small square branding icon (e.g. 32x32px or 64x64px) to be displayed in browser tabs.
              </p>

              {faviconUrl ? (
                <div className="mb-6 p-4 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center h-28 relative group">
                  <img src={faviconUrl} alt="Favicon Preview" className="w-12 h-12 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <div className="absolute inset-0 bg-black/60 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                    <span className="text-[10px] uppercase font-bold text-[#39FF14]">Active URL Saved</span>
                  </div>
                </div>
              ) : (
                <div className="mb-6 border border-dashed border-white/15 rounded-xl h-28 flex flex-col items-center justify-center text-gray-500">
                  <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                  <span className="text-xs">No custom favicon uploaded yet</span>
                </div>
              )}
            </div>

            <div>
              <label className="flex items-center justify-center gap-2 w-full py-3.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl cursor-pointer text-xs font-bold uppercase tracking-widest text-white transition-all hover:scale-[1.02] active:scale-[0.98]">
                {uploadingFavicon ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#39FF14]" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {uploadingFavicon ? "Uploading..." : "Upload Favicon"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, "brand_favicon")}
                  disabled={uploadingFavicon}
                  className="hidden"
                />
              </label>
              {faviconUrl && (
                <p className="text-[10px] text-gray-600 mt-2 truncate text-center">
                  URL: {faviconUrl}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
