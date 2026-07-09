import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus, Edit, Trash2, Eye, EyeOff, Loader2, Save, X, Upload,
  Zap, Battery, Gauge, Package, Star, Tag, DollarSign,
  CheckCircle, ToggleLeft, ToggleRight, Grid3X3, List,
  Sparkles, Settings, RefreshCw, Search, Filter, TrendingUp,
  BarChart3, MessageSquare, ThumbsUp, ThumbsDown, Reply, AlertCircle
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PRODUCTS } from "@/constants/products";
import { CustomSelect } from "@/components/ui/custom-select";

interface ProductCMS {
  id: string;
  product_key: string;
  name: string;
  tagline: string;
  description: string;
  price: number;
  original_price: number | null;
  badge: string | null;
  category: string;
  primary_image_url: string | null;
  gallery_images: string[];
  specs: Record<string, string>;
  features: string[];
  use_cases: string[];
  colors: string[];
  addons: { name: string; price: number; description: string }[];
  in_stock: boolean;
  published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface ProductReview {
  id: string;
  product_id: string;
  customer_id: string;
  rating: number;
  review_text: string | null;
  verified_purchase: boolean;
  helpful_count: number;
  moderation_status: string;
  admin_reply: string | null;
  admin_reply_at: string | null;
  created_at: string;
  username?: string;
}

const emptyForm: Omit<ProductCMS, "id" | "created_at" | "updated_at"> = {
  product_key: "", name: "", tagline: "", description: "",
  price: 0, original_price: null, badge: null,
  category: "Electric Bike", primary_image_url: null,
  gallery_images: [], specs: { motor: "", battery: "", range: "", topSpeed: "", weight: "", payload: "", chargingTime: "" },
  features: [""], use_cases: [""], colors: ["Matte Black"],
  addons: [], in_stock: true, published: true, sort_order: 0,
};

const CATEGORIES = ["Electric Bike","Cargo E-Bike","Folding E-Bike","Mountain E-Bike","City E-Bike","Fleet Vehicle"];
const CATEGORY_OPTIONS = [{ value: "all", label: "All Categories" }, ...CATEGORIES.map(c => ({ value: c, label: c }))];
const STOCK_OPTIONS = [{ value: "all", label: "All Stock Status" }, { value: "in_stock", label: "In Stock" }, { value: "out_of_stock", label: "Out of Stock" }];
const PUBLISHED_OPTIONS = [{ value: "all", label: "All Visibility" }, { value: "published", label: "Published" }, { value: "hidden", label: "Hidden" }];

const INP_STYLE = { style: { background: "#1A1A1A" } };
const inputCls = "w-full border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#39FF14]/50 transition-all";

const PRODUCT_TABS = [
  { id: "catalog", label: "Product Catalog", icon: Package },
  { id: "reviews", label: "Reviews Moderation", icon: Star },
];

export default function AdminProducts() {
  const [products, setProducts] = useState<ProductCMS[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<ProductCMS | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("basic");
  const [activeTab, setActiveTab] = useState("catalog");
  // Filters
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStock, setFilterStock] = useState("all");
  const [filterPublished, setFilterPublished] = useState("all");
  // Reviews
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [reviewFilter, setReviewFilter] = useState("all");
  const primaryImgRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products_cms")
      .select("*")
      .order("sort_order", { ascending: true });
    if (!error) setProducts(data || []);
    setLoading(false);
  }, []);

  const fetchReviews = useCallback(async () => {
    setReviewsLoading(true);
    const { data, error } = await supabase
      .from("product_reviews")
      .select(`
        *,
        products_cms (
          name
        )
      `)
      .order("created_at", { ascending: false });
    if (!error && data) {
      const mappedReviews = data.map((r: any) => ({
        id: String(r.id),
        product_id: String(r.product_id),
        customer_id: r.reviewer_email,
        rating: r.rating,
        review_text: r.review_text,
        verified_purchase: true,
        helpful_count: r.helpful_count || 0,
        moderation_status: r.status,
        admin_reply: r.admin_reply,
        admin_reply_at: r.updated_at,
        created_at: r.created_at,
        username: r.reviewer_name,
        product_name: r.products_cms?.name,
      }));
      setReviews(mappedReviews);
    }
    setReviewsLoading(false);
  }, []);

  useEffect(() => { fetchProducts(); fetchReviews(); }, [fetchProducts, fetchReviews]);

  const seedStaticProducts = async () => {
    const insertions = PRODUCTS.map((p, i) => ({
      product_key: p.id, name: p.name, tagline: p.tagline, description: p.description,
      price: p.price, badge: p.badge || null, category: "Electric Bike",
      primary_image_url: p.image, gallery_images: [p.image], specs: p.specs,
      features: p.features, use_cases: p.useCases, colors: p.colors,
      addons: [], in_stock: p.inStock, published: true, sort_order: i,
    }));
    const { error } = await supabase.from("products_cms").insert(insertions);
    if (!error) {
      toast.success("Products imported!");
      fetchProducts();
    } else {
      toast.error("Import failed: " + error.message);
    }
  };

  // ── KPI calculations ──
  const kpis = {
    total: products.length,
    published: products.filter(p => p.published).length,
    inStock: products.filter(p => p.in_stock).length,
    avgPrice: products.length > 0 ? Math.round(products.reduce((s, p) => s + p.price, 0) / products.length) : 0,
    avgRating: reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "—",
    pendingReviews: reviews.filter(r => r.moderation_status === "pending").length,
  };

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm, specs: { motor: "", battery: "", range: "", topSpeed: "", weight: "", payload: "", chargingTime: "" } });
    setActiveSection("basic");
    setShowEditor(true);
  };

  const openEdit = (p: ProductCMS) => {
    setEditing(p);
    setForm({
      product_key: p.product_key, name: p.name, tagline: p.tagline || "",
      description: p.description || "", price: p.price, original_price: p.original_price,
      badge: p.badge, category: p.category, primary_image_url: p.primary_image_url,
      gallery_images: p.gallery_images || [], specs: p.specs || {},
      features: p.features?.length ? p.features : [""],
      use_cases: p.use_cases?.length ? p.use_cases : [""],
      colors: p.colors?.length ? p.colors : [""],
      addons: p.addons || [], in_stock: p.in_stock, published: p.published, sort_order: p.sort_order,
    });
    setActiveSection("basic");
    setShowEditor(true);
  };

  const handlePrimaryImageUpload = async (file: File) => {
    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data, error } = await supabase.storage
        .from('products')
        .upload(filePath, file);

      if (error) {
        toast.error("Upload failed: " + error.message);
        setUploadingImage(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);

      setForm(f => ({ ...f, primary_image_url: publicUrl }));
      toast.success("Primary image uploaded!");
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleGalleryUpload = async (files: FileList) => {
    setUploadingGallery(true);
    const urls: string[] = [];
    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { data, error } = await supabase.storage
          .from('products')
          .upload(filePath, file);

        if (!error) {
          const { data: { publicUrl } } = supabase.storage
            .from('products')
            .getPublicUrl(filePath);
          urls.push(publicUrl);
        }
      }
      setForm(f => ({ ...f, gallery_images: [...f.gallery_images, ...urls] }));
      toast.success(`${urls.length} image${urls.length > 1 ? "s" : ""} added!`);
    } catch (err: any) {
      toast.error("Gallery upload failed: " + err.message);
    } finally {
      setUploadingGallery(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Product name is required"); return; }
    if (!form.product_key.trim()) { toast.error("Product key is required"); return; }
    if (form.price <= 0) { toast.error("Price must be greater than 0"); return; }
    setSaving(true);
    const payload = {
      product_key: form.product_key, name: form.name, tagline: form.tagline,
      description: form.description, price: form.price, original_price: form.original_price,
      badge: form.badge || null, category: form.category, primary_image_url: form.primary_image_url,
      gallery_images: form.gallery_images, specs: form.specs,
      features: form.features.filter(Boolean), use_cases: form.use_cases.filter(Boolean),
      colors: form.colors.filter(Boolean), addons: form.addons,
      in_stock: form.in_stock, published: form.published, sort_order: form.sort_order,
    };
    if (editing) {
      const { error } = await supabase.from("products_cms").update(payload).eq("id", editing.id);
      if (error) { toast.error("Update failed: " + error.message); setSaving(false); return; }
      toast.success("Product updated!");
    } else {
      const { error } = await supabase.from("products_cms").insert(payload);
      if (error) { toast.error("Create failed: " + error.message); setSaving(false); return; }
      toast.success("Product created!");
    }
    setSaving(false);
    setShowEditor(false);
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product permanently?")) return;
    const { error } = await supabase.from("products_cms").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Product deleted.");
    fetchProducts();
  };

  const togglePublished = async (p: ProductCMS) => {
    const { error } = await supabase.from("products_cms").update({ published: !p.published }).eq("id", p.id);
    if (!error) { setProducts(prev => prev.map(x => x.id === p.id ? { ...x, published: !x.published } : x)); toast.success(p.published ? "Product hidden" : "Product published!"); }
  };

  const toggleStock = async (p: ProductCMS) => {
    const { error } = await supabase.from("products_cms").update({ in_stock: !p.in_stock }).eq("id", p.id);
    if (!error) { setProducts(prev => prev.map(x => x.id === p.id ? { ...x, in_stock: !x.in_stock } : x)); toast.success("Stock status updated."); }
  };

  const moderateReview = async (id: string, status: string) => {
    const { error } = await supabase.from("product_reviews").update({ status }).eq("id", id);
    if (!error) { fetchReviews(); toast.success(`Review ${status}`); }
  };

  const deleteReview = async (id: string) => {
    const { error } = await supabase.from("product_reviews").delete().eq("id", id);
    if (!error) { fetchReviews(); toast.success("Review deleted"); }
  };

  const submitReply = async (id: string) => {
    const { error } = await supabase.from("product_reviews").update({ admin_reply: replyText.trim(), status: "approved" }).eq("id", id);
    if (!error) { fetchReviews(); setReplyingTo(null); setReplyText(""); toast.success("Reply posted!"); }
  };

  // Filtered products
  const filteredProducts = (products.length > 0 ? products : PRODUCTS.map((p, i) => ({
    id: p.id, product_key: p.id, name: p.name, tagline: p.tagline, description: p.description,
    price: p.price, original_price: null, badge: p.badge || null, category: "Electric Bike",
    primary_image_url: p.image, gallery_images: [p.image], specs: p.specs as Record<string, string>,
    features: p.features, use_cases: p.useCases, colors: p.colors, addons: [],
    in_stock: p.inStock, published: true, sort_order: i, created_at: "", updated_at: "",
  })) as ProductCMS[]).filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.tagline?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === "all" || p.category === filterCategory;
    const matchStock = filterStock === "all" || (filterStock === "in_stock" ? p.in_stock : !p.in_stock);
    const matchPub = filterPublished === "all" || (filterPublished === "published" ? p.published : !p.published);
    return matchSearch && matchCat && matchStock && matchPub;
  });

  const filteredReviews = reviews.filter(r => reviewFilter === "all" || r.moderation_status === reviewFilter);

  const SECTIONS = [
    { id: "basic", label: "Basic Info" }, { id: "media", label: "Images & Gallery" },
    { id: "pricing", label: "Pricing & Addons" }, { id: "specs", label: "Specifications" },
    { id: "features", label: "Features & Use Cases" }, { id: "settings", label: "Settings" },
  ];

  return (
    <div>
      {/* ── Top Tabs ── */}
      <div className="flex gap-1 border-b border-white/10 mb-8">
        {PRODUCT_TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all border-b-2 -mb-px ${activeTab === tab.id ? "border-[#39FF14] text-[#39FF14]" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
            <tab.icon className="w-4 h-4" />{tab.label}
            {tab.id === "reviews" && kpis.pendingReviews > 0 && (
              <span className="w-5 h-5 rounded-full bg-yellow-500 text-[#0A0A0A] text-[10px] font-black flex items-center justify-center">{kpis.pendingReviews}</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === "catalog" && (
        <>
          {/* ── KPI Row ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {[
              { label: "Total", value: kpis.total, color: "text-white", sub: "products" },
              { label: "Published", value: kpis.published, color: "text-[#39FF14]", sub: "live" },
              { label: "In Stock", value: kpis.inStock, color: "text-blue-400", sub: "available" },
              { label: "Avg Price", value: kpis.avgPrice > 0 ? `₱${(kpis.avgPrice / 1000).toFixed(0)}K` : "—", color: "text-yellow-400", sub: "per unit" },
              { label: "Avg Rating", value: kpis.avgRating, color: "text-orange-400", sub: "stars" },
              { label: "Reviews", value: reviews.length, color: "text-purple-400", sub: "total" },
            ].map(kpi => (
              <div key={kpi.label} className="glass rounded-xl p-4 border border-white/5 text-center hover:border-white/10 transition-all">
                <p className={`font-orbitron font-bold text-2xl ${kpi.color}`}>{kpi.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{kpi.label}</p>
                <p className="text-[10px] text-gray-700">{kpi.sub}</p>
              </div>
            ))}
          </div>

          {/* ── Header + Controls ── */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="font-orbitron font-bold text-2xl text-white">Product Catalog</h1>
              <p className="text-gray-500 text-sm mt-1">{filteredProducts.length} of {products.length || PRODUCTS.length} products</p>
            </div>
            <div className="flex items-center gap-3">
              {products.length === 0 && (
                <button onClick={seedStaticProducts} className="flex items-center gap-2 px-4 py-2 glass rounded-xl border border-[#39FF14]/30 text-[#39FF14] text-xs font-semibold hover:bg-[#39FF14]/10 transition-all">
                  <RefreshCw className="w-3.5 h-3.5" />Import
                </button>
              )}
              <div className="flex gap-1 glass rounded-xl border border-white/10 p-1">
                <button onClick={() => setViewMode("grid")} className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-[#39FF14]/20 text-[#39FF14]" : "text-gray-500"}`}><Grid3X3 className="w-3.5 h-3.5" /></button>
                <button onClick={() => setViewMode("list")} className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-[#39FF14]/20 text-[#39FF14]" : "text-gray-500"}`}><List className="w-3.5 h-3.5" /></button>
              </div>
              <button onClick={openNew} className="btn-primary text-xs flex items-center gap-2">
                <Plus className="w-4 h-4" />Add Product
              </button>
            </div>
          </div>

          {/* ── Search + Filters ── */}
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="relative flex-1 min-w-48">
              <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products by name or tagline..." className="w-full border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#39FF14]/30 transition-all" style={{ background: "#111" }} />
            </div>
            <CustomSelect value={filterCategory} onChange={setFilterCategory} options={CATEGORY_OPTIONS} size="sm" className="w-44" />
            <CustomSelect value={filterStock} onChange={setFilterStock} options={STOCK_OPTIONS} size="sm" className="w-40" />
            <CustomSelect value={filterPublished} onChange={setFilterPublished} options={PUBLISHED_OPTIONS} size="sm" className="w-36" />
            {(search || filterCategory !== "all" || filterStock !== "all" || filterPublished !== "all") && (
              <button onClick={() => { setSearch(""); setFilterCategory("all"); setFilterStock("all"); setFilterPublished("all"); }}
                className="px-4 py-2.5 glass rounded-xl border border-white/10 text-xs text-gray-400 hover:text-white transition-all flex items-center gap-2">
                <X className="w-3.5 h-3.5" />Clear
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-[#39FF14] animate-spin" /></div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProducts.map(p => (
                <div key={p.id} className="glass rounded-xl border border-white/5 overflow-hidden hover:border-white/10 transition-all group">
                  <div className="relative h-48 overflow-hidden bg-[#111]">
                    <img src={p.primary_image_url || ""} alt={p.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent" />
                    {p.badge && <span className="absolute top-3 left-3 px-2 py-1 bg-[#39FF14] text-[#0A0A0A] text-xs font-bold rounded-full">{p.badge}</span>}
                    {!p.published && <span className="absolute top-3 right-3 px-2 py-1 bg-gray-800 text-gray-400 text-xs font-bold rounded-full border border-white/20">Hidden</span>}
                    <div className="absolute bottom-3 right-3 flex gap-1.5">
                      <button onClick={() => togglePublish(p)} className="p-1.5 glass rounded-lg border border-white/15 text-xs text-gray-300 hover:text-[#39FF14] transition-colors">{p.published ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}</button>
                      <button onClick={() => toggleStock(p)} className="p-1.5 glass rounded-lg border border-white/15 text-xs transition-colors">{p.in_stock ? <ToggleRight className="w-3.5 h-3.5 text-[#39FF14]" /> : <ToggleLeft className="w-3.5 h-3.5 text-gray-500" />}</button>
                      <button onClick={() => openEdit(p)} className="p-1.5 glass rounded-lg border border-white/15 text-gray-300 hover:text-white transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                      {products.length > 0 && <button onClick={() => handleDelete(p.id)} className="p-1.5 glass rounded-lg border border-white/15 text-gray-300 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>}
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-[10px] text-[#39FF14] font-semibold tracking-widest uppercase mb-0.5">{p.category}</p>
                        <h3 className="font-orbitron font-bold text-base text-white">{p.name}</h3>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{p.tagline}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-orbitron font-bold text-lg text-[#39FF14]">₱{p.price.toLocaleString()}</p>
                        {p.original_price && <p className="text-xs text-gray-600 line-through">₱{p.original_price.toLocaleString()}</p>}
                        <span className={`text-[10px] font-bold ${p.in_stock ? "text-green-400" : "text-red-400"}`}>{p.in_stock ? "In Stock" : "Out of Stock"}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 my-3">
                      {[
                        { icon: Zap, val: (p.specs as any)?.motor?.split?.(" ")?.[0] || "—" },
                        { icon: Battery, val: (p.specs as any)?.range || "—" },
                        { icon: Gauge, val: (p.specs as any)?.topSpeed || "—" },
                      ].map((s, i) => (
                        <div key={i} className="text-center p-2 bg-white/3 rounded-lg border border-white/5">
                          <s.icon className="w-3 h-3 text-[#39FF14] mx-auto mb-0.5" />
                          <p className="text-[11px] text-gray-300 font-medium">{s.val}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-600 pt-2 border-t border-white/5">
                      <span>{(p.features || []).length} features</span>
                      <span>{(p.gallery_images || []).length} images</span>
                      <span>{(p.addons || []).length} addons</span>
                    </div>
                  </div>
                </div>
              ))}
              {filteredProducts.length === 0 && (
                <div className="col-span-3 text-center py-16">
                  <Package className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-500">No products match your filters.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredProducts.map(p => (
                <div key={p.id} className="glass rounded-xl border border-white/5 hover:border-white/10 transition-all flex gap-4 p-4 items-center">
                  <img src={p.primary_image_url || ""} alt={p.name} className="w-20 h-16 object-cover rounded-lg shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-white text-sm">{p.name}</p>
                      {p.badge && <span className="px-1.5 py-0.5 bg-[#39FF14]/20 text-[#39FF14] text-[9px] font-bold rounded-full">{p.badge}</span>}
                      <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full ${p.published ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-500"}`}>{p.published ? "Live" : "Hidden"}</span>
                    </div>
                    <div className="flex gap-4 text-xs text-gray-500">
                      <span className="text-[#39FF14] font-bold">₱{p.price.toLocaleString()}</span>
                      <span>{(p.specs as any)?.motor?.split?.(" ")?.[0] || "—"} motor</span>
                      <span>{(p.specs as any)?.range || "—"} range</span>
                      <span className={p.in_stock ? "text-green-400" : "text-red-400"}>{p.in_stock ? "In Stock" : "Out of Stock"}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => togglePublish(p)} className="p-2 glass rounded-lg border border-white/10 text-gray-400 hover:text-[#39FF14] transition-colors">{p.published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button>
                    <button onClick={() => openEdit(p)} className="p-2 glass rounded-lg border border-white/10 text-gray-400 hover:text-white transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                    {products.length > 0 && <button onClick={() => handleDelete(p.id)} className="p-2 glass rounded-lg border border-white/10 text-gray-400 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── REVIEWS TAB ── */}
      {activeTab === "reviews" && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-orbitron font-bold text-xl text-white">Reviews Moderation</h2>
              <p className="text-gray-500 text-sm mt-1">{reviews.length} total · {kpis.pendingReviews} pending review</p>
            </div>
            <div className="flex gap-1 glass rounded-xl border border-white/10 p-1">
              {[{ v: "all", l: "All" }, { v: "approved", l: "Approved" }, { v: "rejected", l: "Rejected" }].map(opt => (
                <button key={opt.v} onClick={() => setReviewFilter(opt.v)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${reviewFilter === opt.v ? "bg-[#39FF14]/20 text-[#39FF14]" : "text-gray-500 hover:text-white"}`}>
                  {opt.l}
                </button>
              ))}
            </div>
          </div>

          {/* Per-product rating summaries */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...new Set(reviews.map(r => r.product_id))].slice(0, 4).map(pid => {
              const prodReviews = reviews.filter(r => r.product_id === pid);
              const avg = prodReviews.reduce((s, r) => s + r.rating, 0) / prodReviews.length;
              const name = PRODUCTS.find(p => p.id === pid)?.name || pid;
              return (
                <div key={pid} className="glass rounded-xl border border-white/5 p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1 truncate">{name}</p>
                  <p className="font-orbitron font-bold text-2xl text-[#39FF14]">{avg.toFixed(1)}</p>
                  <div className="flex justify-center gap-0.5 my-1">
                    {[1,2,3,4,5].map(s => <Star key={s} className={`w-3 h-3 ${s <= Math.round(avg) ? "text-[#39FF14] fill-[#39FF14]" : "text-gray-600"}`} />)}
                  </div>
                  <p className="text-xs text-gray-600">{prodReviews.length} reviews</p>
                </div>
              );
            })}
          </div>

          {reviewsLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-[#39FF14] animate-spin" /></div>
          ) : filteredReviews.length === 0 ? (
            <div className="text-center py-16">
              <Star className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500">No reviews found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReviews.map(review => {
                const productName = PRODUCTS.find(p => p.id === review.product_id)?.name || review.product_id;
                const statusCfg = {
                  approved: { color: "text-[#39FF14]", bg: "bg-[#39FF14]/15", border: "border-[#39FF14]/30" },
                  rejected: { color: "text-red-400", bg: "bg-red-500/15", border: "border-red-500/30" },
                  pending: { color: "text-yellow-400", bg: "bg-yellow-500/15", border: "border-yellow-500/30" },
                }[review.moderation_status] || { color: "text-gray-400", bg: "bg-gray-500/15", border: "border-gray-500/30" };

                return (
                  <div key={review.id} className={`glass rounded-xl border p-5 ${review.moderation_status === "rejected" ? "border-red-500/20 opacity-70" : "border-white/5"}`}>
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/8 border border-white/10 flex items-center justify-center font-bold text-white text-sm">
                          {(review.username || "A")[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-white text-sm">{review.username}</p>
                            {review.verified_purchase && (
                              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-[#39FF14]/10 border border-[#39FF14]/20 rounded-full text-[9px] text-[#39FF14] font-semibold">
                                <CheckCircle className="w-2.5 h-2.5" />Verified
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{productName} · {new Date(review.created_at).toLocaleDateString("en-PH")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(s => <Star key={s} className={`w-4 h-4 ${s <= review.rating ? "text-[#39FF14] fill-[#39FF14]" : "text-gray-600"}`} />)}
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.bg} ${statusCfg.border} ${statusCfg.color}`}>
                          {review.moderation_status}
                        </span>
                      </div>
                    </div>
                    {review.review_text && <p className="text-gray-300 text-sm leading-relaxed mb-3">{review.review_text}</p>}

                    {/* Admin reply */}
                    {review.admin_reply && (
                      <div className="mt-3 p-3 rounded-xl bg-[#39FF14]/5 border border-[#39FF14]/15">
                        <p className="text-xs text-[#39FF14] font-semibold mb-1">Official TRIP Response</p>
                        <p className="text-xs text-gray-300">{review.admin_reply}</p>
                      </div>
                    )}

                    {/* Reply form */}
                    {replyingTo === review.id && (
                      <div className="mt-3 space-y-2">
                        <textarea
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          placeholder="Write official TRIP response visible to all customers..."
                          rows={3}
                          className={inputCls + " resize-none text-xs"}
                          style={{ background: "#1A1A1A" }}
                        />
                        <div className="flex gap-2">
                          <button onClick={() => submitReply(review.id)} className="px-4 py-2 bg-[#39FF14] text-[#0A0A0A] rounded-xl text-xs font-bold hover:bg-white transition-all">Post Reply</button>
                          <button onClick={() => { setReplyingTo(null); setReplyText(""); }} className="px-4 py-2 glass border border-white/10 text-gray-400 rounded-xl text-xs hover:text-white transition-all">Cancel</button>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                      <span className="text-xs text-gray-600 flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{review.helpful_count} helpful</span>
                      <div className="flex gap-2 ml-auto">
                        <button onClick={() => { setReplyingTo(replyingTo === review.id ? null : review.id); setReplyText(review.admin_reply || ""); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 glass border border-white/10 text-gray-400 hover:text-[#39FF14] rounded-lg text-xs transition-all">
                          <Reply className="w-3.5 h-3.5" />{review.admin_reply ? "Edit Reply" : "Reply"}
                        </button>
                        {review.moderation_status !== "approved" && (
                          <button onClick={() => moderateReview(review.id, "approved")}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#39FF14]/15 border border-[#39FF14]/30 text-[#39FF14] rounded-lg text-xs hover:bg-[#39FF14]/25 transition-all">
                            <ThumbsUp className="w-3.5 h-3.5" />Approve
                          </button>
                        )}
                        {review.moderation_status !== "rejected" && (
                          <button onClick={() => moderateReview(review.id, "rejected")}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/15 border border-red-500/30 text-red-400 rounded-lg text-xs hover:bg-red-500/25 transition-all">
                            <ThumbsDown className="w-3.5 h-3.5" />Reject
                          </button>
                        )}
                        <button onClick={() => deleteReview(review.id)}
                          className="p-1.5 glass border border-white/10 text-gray-500 hover:text-red-400 rounded-lg text-xs transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── PRODUCT EDITOR MODAL ── */}
      {showEditor && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
          <div className="relative w-full max-w-5xl h-[85vh] max-h-[780px] rounded-2xl overflow-hidden flex flex-col"
            style={{ background: "linear-gradient(145deg, #0F0F0F 0%, #0D0D0D 100%)", boxShadow: "0 40px 120px rgba(0,0,0,0.9), 0 0 0 1px rgba(57,255,20,0.15)" }}>

            {/* Animated top bar */}
            <div className="h-[2px] w-full bg-gradient-to-r from-[#39FF14] via-[#00FFFF] to-[#39FF14] animate-pulse" />

            {/* Header */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-white/8 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#39FF14]/15 border border-[#39FF14]/25 flex items-center justify-center">
                  {editing ? <Edit className="w-5 h-5 text-[#39FF14]" /> : <Plus className="w-5 h-5 text-[#39FF14]" />}
                </div>
                <div>
                  <h2 className="font-orbitron font-bold text-xl text-white">{editing ? "Edit Product" : "Add New Product"}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Manage all product details, images, pricing, specs, and addons</p>
                </div>
              </div>
              <button onClick={() => setShowEditor(false)} className="w-9 h-9 flex items-center justify-center rounded-xl border border-white/10 text-gray-500 hover:text-white hover:border-white/30 transition-all"><X className="w-4 h-4" /></button>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Section Nav & Actions Sidebar */}
              <div className="w-60 shrink-0 border-r border-white/5 p-4 bg-white/1 flex flex-col justify-between">
                <div className="space-y-1.5">
                  {SECTIONS.map(s => {
                    const IconComponent = {
                      basic: Tag,
                      media: Grid3X3,
                      pricing: DollarSign,
                      specs: Gauge,
                      features: Sparkles,
                      settings: Settings
                    }[s.id] || Tag;

                    const isActive = activeSection === s.id;
                    return (
                      <button key={s.id} onClick={() => setActiveSection(s.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-semibold transition-all rounded-xl border ${
                          isActive
                            ? "text-[#39FF14] bg-[#39FF14]/10 border-[#39FF14]/20 shadow-[0_0_15px_rgba(57,255,20,0.08)]"
                            : "text-gray-400 hover:text-gray-200 hover:bg-white/5 border-transparent"
                        }`}>
                        <IconComponent className={`w-4 h-4 shrink-0 transition-colors ${isActive ? "text-[#39FF14]" : "text-gray-500"}`} />
                        {s.label}
                      </button>
                    );
                  })}
                </div>

                {/* Relocated Actions buttons */}
                <div className="pt-4 border-t border-white/5 space-y-2">
                  <button onClick={handleSave} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-1.5 px-2 py-2.5 text-[11px] font-bold whitespace-nowrap">
                    <Save className="w-3.5 h-3.5 shrink-0" />
                    <span>{saving ? "Saving..." : editing ? "Save Changes" : "Create Product"}</span>
                  </button>
                  <button onClick={() => setShowEditor(false)} className="btn-outline w-full py-2.5 text-[11px] font-semibold text-center block whitespace-nowrap">
                    Cancel
                  </button>
                </div>
              </div>

              {/* Form Content Panel */}
              <div className="flex-1 p-8 space-y-6 overflow-y-auto">
                {/* ── BASIC INFO ── */}
                {activeSection === "basic" && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-5">
                      <div className="col-span-2">
                        <label className="block text-xs text-gray-400 mb-2 uppercase tracking-widest font-semibold">Product Name <span className="text-[#39FF14]">*</span></label>
                        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="TRIP Cargo Pro" className={inputCls} {...INP_STYLE} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-2 uppercase tracking-widest font-semibold">Product Key <span className="text-[#39FF14]">*</span></label>
                        <input value={form.product_key} onChange={e => setForm(f => ({ ...f, product_key: e.target.value.toLowerCase().replace(/\s+/g, "-") }))} placeholder="cargo-pro" className={inputCls + " font-mono"} {...INP_STYLE} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-2 uppercase tracking-widest font-semibold">Category</label>
                        <CustomSelect value={form.category} onChange={v => setForm(f => ({ ...f, category: v }))} options={CATEGORIES.map(c => ({ value: c, label: c }))} size="md" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs text-gray-400 mb-2 uppercase tracking-widest font-semibold">Tagline</label>
                        <input value={form.tagline} onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))} placeholder="The Ultimate Last-Mile Delivery Machine" className={inputCls} {...INP_STYLE} />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs text-gray-400 mb-2 uppercase tracking-widest font-semibold">Description</label>
                        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} placeholder="Full product description..." className={inputCls + " resize-none"} style={{ background: "#1A1A1A" }} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-2 uppercase tracking-widest font-semibold">Badge Label</label>
                        <input value={form.badge || ""} onChange={e => setForm(f => ({ ...f, badge: e.target.value || null }))} placeholder="Best Seller, New, Hot" className={inputCls} {...INP_STYLE} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-2 uppercase tracking-widest font-semibold">Sort Order</label>
                        <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} className={inputCls} {...INP_STYLE} />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── IMAGES ── */}
                {activeSection === "media" && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs text-gray-400 mb-3 uppercase tracking-widest font-semibold">Primary Product Image</label>
                      <input ref={primaryImgRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handlePrimaryImageUpload(e.target.files[0])} />
                      {form.primary_image_url ? (
                        <div className="relative rounded-xl overflow-hidden h-48 border border-white/10 group">
                          <img src={form.primary_image_url} alt="Primary" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3">
                            <button onClick={() => primaryImgRef.current?.click()} className="px-4 py-2 bg-[#39FF14] text-[#0A0A0A] rounded-lg text-xs font-bold">Change</button>
                            <button onClick={() => setForm(f => ({ ...f, primary_image_url: null }))} className="px-4 py-2 bg-red-500 text-white rounded-lg text-xs font-bold">Remove</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => primaryImgRef.current?.click()} className="w-full h-48 rounded-xl border-2 border-dashed border-white/20 hover:border-[#39FF14]/50 transition-all flex flex-col items-center justify-center gap-3 text-gray-500 hover:text-[#39FF14]">
                          {uploadingImage ? <Loader2 className="w-8 h-8 animate-spin" /> : <><Upload className="w-8 h-8" /><p className="text-sm font-medium">Click to upload primary image</p><p className="text-xs">JPG, PNG, WebP · Max 20MB</p></>}
                        </button>
                      )}
                      <div className="mt-3">
                        <label className="block text-xs text-gray-500 mb-1.5">Or paste image URL</label>
                        <input value={form.primary_image_url || ""} onChange={e => setForm(f => ({ ...f, primary_image_url: e.target.value || null }))} placeholder="https://..." className={inputCls + " font-mono text-xs"} {...INP_STYLE} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-3 uppercase tracking-widest font-semibold">Gallery ({form.gallery_images.length} images)</label>
                      <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={e => e.target.files && handleGalleryUpload(e.target.files)} />
                      <button onClick={() => galleryRef.current?.click()} className="w-full h-24 rounded-xl border-2 border-dashed border-white/15 hover:border-[#39FF14]/40 transition-all flex items-center justify-center gap-3 text-gray-500 hover:text-[#39FF14] mb-4">
                        {uploadingGallery ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Upload className="w-5 h-5" /><p className="text-sm">Upload multiple gallery images</p></>}
                      </button>
                      {form.gallery_images.length > 0 && (
                        <div className="grid grid-cols-4 gap-3">
                          {form.gallery_images.map((url, i) => (
                            <div key={i} className="relative rounded-lg overflow-hidden h-20 border border-white/10 group">
                              <img src={url} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" />
                              <button onClick={() => setForm(f => ({ ...f, gallery_images: f.gallery_images.filter((_, j) => j !== i) }))} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"><X className="w-4 h-4 text-red-400" /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── PRICING & ADDONS ── */}
                {activeSection === "pricing" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs text-gray-400 mb-2 uppercase tracking-widest font-semibold">Base Price (PHP) <span className="text-[#39FF14]">*</span></label>
                        <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₱</span>
                          <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))} className={inputCls + " pl-8"} {...INP_STYLE} /></div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-2 uppercase tracking-widest font-semibold">Original Price (Strike-through)</label>
                        <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₱</span>
                          <input type="number" value={form.original_price || ""} onChange={e => setForm(f => ({ ...f, original_price: parseFloat(e.target.value) || null }))} placeholder="Optional" className={inputCls + " pl-8"} {...INP_STYLE} /></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Colors</label>
                        <button onClick={() => setForm(f => ({ ...f, colors: [...f.colors, ""] }))} className="text-xs text-[#39FF14] hover:underline flex items-center gap-1"><Plus className="w-3 h-3" />Add</button>
                      </div>
                      {form.colors.map((color, i) => (
                        <div key={i} className="flex gap-2 mb-2">
                          <input value={color} onChange={e => { const c = [...form.colors]; c[i] = e.target.value; setForm(f => ({ ...f, colors: c })); }} placeholder="Matte Black" className={inputCls} {...INP_STYLE} />
                          {form.colors.length > 1 && <button onClick={() => setForm(f => ({ ...f, colors: f.colors.filter((_, j) => j !== i) }))} className="text-red-400"><X className="w-4 h-4" /></button>}
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div><label className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Addons</label><p className="text-[10px] text-gray-600 mt-0.5">Optional upgrades customers can add</p></div>
                        <button onClick={() => setForm(f => ({ ...f, addons: [...f.addons, { name: "", price: 0, description: "" }] }))} className="text-xs text-[#39FF14] hover:underline flex items-center gap-1"><Plus className="w-3 h-3" />Add Addon</button>
                      </div>
                      {form.addons.length === 0 ? (
                        <div className="text-center py-8 glass rounded-xl border border-white/5 text-gray-600 text-sm"><Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />No addons yet.</div>
                      ) : form.addons.map((addon, i) => (
                        <div key={i} className="p-4 glass rounded-xl border border-white/8 mb-3 space-y-3">
                          <div className="flex items-center justify-between"><p className="text-xs text-gray-400 font-semibold">Addon #{i + 1}</p><button onClick={() => setForm(f => ({ ...f, addons: f.addons.filter((_, j) => j !== i) }))} className="text-red-400"><X className="w-4 h-4" /></button></div>
                          <div className="grid grid-cols-2 gap-3">
                            <div><label className="block text-[10px] text-gray-500 mb-1.5 uppercase tracking-widest">Name</label><input value={addon.name} onChange={e => { const a = [...form.addons]; a[i] = { ...a[i], name: e.target.value }; setForm(f => ({ ...f, addons: a })); }} className={inputCls + " py-2"} {...INP_STYLE} /></div>
                            <div><label className="block text-[10px] text-gray-500 mb-1.5 uppercase tracking-widest">Price (PHP)</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">₱</span><input type="number" value={addon.price} onChange={e => { const a = [...form.addons]; a[i] = { ...a[i], price: parseFloat(e.target.value) || 0 }; setForm(f => ({ ...f, addons: a })); }} className={inputCls + " py-2 pl-7"} {...INP_STYLE} /></div></div>
                          </div>
                          <div><label className="block text-[10px] text-gray-500 mb-1.5 uppercase tracking-widest">Description</label><input value={addon.description} onChange={e => { const a = [...form.addons]; a[i] = { ...a[i], description: e.target.value }; setForm(f => ({ ...f, addons: a })); }} className={inputCls + " py-2"} {...INP_STYLE} /></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── SPECS ── */}
                {activeSection === "specs" && (
                  <div className="space-y-4">
                    <p className="text-xs text-gray-500">Technical specifications visible on the product detail page.</p>
                    {Object.entries(form.specs).map(([key, value]) => (
                      <div key={key} className="grid grid-cols-5 gap-3 items-center">
                        <div className="col-span-2"><input value={key} onChange={e => { const s: Record<string, string> = {}; Object.keys(form.specs).forEach(k => { s[k === key ? e.target.value : k] = form.specs[k]; }); setForm(f => ({ ...f, specs: s })); }} className={inputCls + " py-2 text-xs font-mono text-gray-400"} {...INP_STYLE} /></div>
                        <div className="col-span-2"><input value={value} onChange={e => setForm(f => ({ ...f, specs: { ...f.specs, [key]: e.target.value } }))} placeholder="Value" className={inputCls + " py-2"} {...INP_STYLE} /></div>
                        <button onClick={() => { const s = { ...form.specs }; delete s[key]; setForm(f => ({ ...f, specs: s })); }} className="text-red-400 hover:text-red-300"><X className="w-4 h-4" /></button>
                      </div>
                    ))}
                    <button onClick={() => setForm(f => ({ ...f, specs: { ...f.specs, "": "" } }))} className="flex items-center gap-2 text-xs text-[#39FF14] hover:underline"><Plus className="w-3 h-3" />Add Specification</button>
                  </div>
                )}

                {/* ── FEATURES ── */}
                {activeSection === "features" && (
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-3"><label className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Key Features</label><button onClick={() => setForm(f => ({ ...f, features: [...f.features, ""] }))} className="text-xs text-[#39FF14] hover:underline flex items-center gap-1"><Plus className="w-3 h-3" />Add</button></div>
                      {form.features.map((feat, i) => (
                        <div key={i} className="flex gap-2 mb-2">
                          <CheckCircle className="w-4 h-4 text-[#39FF14]/40 mt-3 shrink-0" />
                          <input value={feat} onChange={e => { const f = [...form.features]; f[i] = e.target.value; setForm(prev => ({ ...prev, features: f })); }} placeholder="Feature description" className={inputCls} {...INP_STYLE} />
                          {form.features.length > 1 && <button onClick={() => setForm(f => ({ ...f, features: f.features.filter((_, j) => j !== i) }))} className="text-red-400"><X className="w-4 h-4" /></button>}
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-3"><label className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Use Cases</label><button onClick={() => setForm(f => ({ ...f, use_cases: [...f.use_cases, ""] }))} className="text-xs text-[#39FF14] hover:underline flex items-center gap-1"><Plus className="w-3 h-3" />Add</button></div>
                      {form.use_cases.map((uc, i) => (
                        <div key={i} className="flex gap-2 mb-2">
                          <Package className="w-4 h-4 text-[#39FF14]/40 mt-3 shrink-0" />
                          <input value={uc} onChange={e => { const u = [...form.use_cases]; u[i] = e.target.value; setForm(prev => ({ ...prev, use_cases: u })); }} placeholder="e.g. Last-mile delivery" className={inputCls} {...INP_STYLE} />
                          {form.use_cases.length > 1 && <button onClick={() => setForm(f => ({ ...f, use_cases: f.use_cases.filter((_, j) => j !== i) }))} className="text-red-400"><X className="w-4 h-4" /></button>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── SETTINGS ── */}
                {activeSection === "settings" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 glass rounded-xl border border-white/8">
                      <div><p className="font-semibold text-white text-sm">Published</p><p className="text-xs text-gray-500">Visible to public website visitors</p></div>
                      <button onClick={() => setForm(f => ({ ...f, published: !f.published }))} className={`relative w-12 h-6 rounded-full transition-all ${form.published ? "bg-[#39FF14]" : "bg-white/15"}`}>
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${form.published ? "left-7" : "left-1"}`} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-4 glass rounded-xl border border-white/8">
                      <div><p className="font-semibold text-white text-sm">In Stock</p><p className="text-xs text-gray-500">Shows "In Stock" badge on product card</p></div>
                      <button onClick={() => setForm(f => ({ ...f, in_stock: !f.in_stock }))} className={`relative w-12 h-6 rounded-full transition-all ${form.in_stock ? "bg-[#39FF14]" : "bg-white/15"}`}>
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${form.in_stock ? "left-7" : "left-1"}`} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
