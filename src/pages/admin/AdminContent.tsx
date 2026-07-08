import { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus, Edit, Trash2, Eye, EyeOff, Loader2, Save, X,
  FileText, CheckCircle, Globe, Clock, User, ImageIcon, AlignLeft,
  Upload, Image, Link as LinkIcon
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  image_url: string;
  body: string;
  published: boolean;
  author: string;
  read_time: number;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = ["Industry News", "Battery Care", "Buying Guides", "Comparisons", "Rider Tips", "Sustainability", "Company News", "E-Bike Guides"];
const CONTENT_TABS = ["Blog Posts", "FAQs", "Testimonials", "Banners"];
const FAQS = [
  { q: "What is the warranty on TRIP e-bikes?", a: "3-year frame, 1-year motor, 1-year battery.", category: "Warranty" },
  { q: "Do you offer fleet discounts?", a: "Yes — up to 20% for orders of 10+ units.", category: "Pricing" },
  { q: "How long does delivery take?", a: "Metro Manila: 2–3 days. Provincial: 5–7 days.", category: "Delivery" },
  { q: "Can I test ride before buying?", a: "Yes, at our Mandaluyong City showroom.", category: "Showroom" },
];

const emptyForm = {
  title: "",
  slug: "",
  category: "Industry News",
  excerpt: "",
  image_url: "",
  body: "",
  author: "TRIP Mobility Team",
  read_time: 5,
  published: false,
};
type PostForm = typeof emptyForm;

const inputCls = "w-full border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#39FF14]/50 transition-all";
const INPUT_DARK = { style: { background: "#1A1A1A" } };

export default function AdminContent() {
  const [activeTab, setActiveTab] = useState("Blog Posts");
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [form, setForm] = useState<PostForm>({ ...emptyForm });
  const [previewPost, setPreviewPost] = useState<BlogPost | null>(null);
  const [imageMode, setImageMode] = useState<"url" | "upload">("url");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await apiClient.get("/blog.php");
    if (error) toast.error("Failed to load posts: " + error.message);
    else setPosts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { if (activeTab === "Blog Posts") fetchPosts(); }, [activeTab, fetchPosts]);

  const slugify = (title: string) =>
    title.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");

  const openNewEditor = () => {
    setEditingPost(null);
    setForm({ ...emptyForm });
    setImageMode("url");
    setShowEditor(true);
  };

  const openEditEditor = (post: BlogPost) => {
    setEditingPost(post);
    setForm({ title: post.title, slug: post.slug, category: post.category, excerpt: post.excerpt || "", image_url: post.image_url || "", body: post.body || "", author: post.author, read_time: post.read_time, published: post.published });
    setImageMode(post.image_url?.startsWith("http") ? "url" : "upload");
    setShowEditor(true);
  };

  const handleTitleChange = (title: string) => {
    setForm(f => ({ ...f, title, slug: editingPost ? f.slug : slugify(title) }));
  };

  // ── Image Upload ─────────────────────────────────────────────────────────
  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Image must be under 10MB"); return; }

    setUploadingImage(true);
    setUploadProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => setUploadProgress(p => Math.min(p + 10, 85)), 200);

    const formData = new FormData();
    formData.append("image", file);
    const { data, error } = await apiClient.post("/upload.php", formData);

    clearInterval(progressInterval);

    if (error) {
      toast.error("Upload failed: " + error.message);
      setUploadingImage(false);
      setUploadProgress(0);
      return;
    }

    setUploadProgress(100);
    if (data && data.url) {
      setForm(f => ({ ...f, image_url: data.url }));
      toast.success("Image uploaded successfully!");
    }

    setTimeout(() => { setUploadingImage(false); setUploadProgress(0); }, 500);
  };

  // Drag-and-drop handlers
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImageUpload(file);
  };

  const handleSave = async (publishOverride?: boolean) => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    if (!form.slug.trim()) { toast.error("Slug is required"); return; }
    setSaving(true);

    const payload = {
      title: form.title, slug: form.slug, category: form.category,
      excerpt: form.excerpt, image_url: form.image_url, body: form.body,
      author: form.author, read_time: form.read_time,
      published: publishOverride !== undefined ? publishOverride : form.published,
    };

    if (editingPost) {
      const { error } = await apiClient.put(`/blog.php?id=${editingPost.id}`, payload);
      if (error) { toast.error("Update failed: " + error.message); setSaving(false); return; }
      toast.success("Post updated.");
    } else {
      const { error } = await apiClient.post("/blog.php", payload);
      if (error) { toast.error("Create failed: " + error.message); setSaving(false); return; }
      toast.success("Blog post created.");
    }
    setSaving(false);
    setShowEditor(false);
    fetchPosts();
  };

  const handleTogglePublish = async (post: BlogPost) => {
    const { error } = await apiClient.put(`/blog.php?id=${post.id}`, { published: !post.published });
    if (error) { toast.error(error.message); return; }
    toast.success(post.published ? "Post unpublished." : "Post published!");
    fetchPosts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this post permanently?")) return;
    const { error } = await apiClient.delete(`/blog.php?id=${id}`);
    if (error) { toast.error(error.message); return; }
    toast.success("Post deleted.");
    fetchPosts();
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-orbitron font-bold text-2xl text-white">Content Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage blogs, FAQs, testimonials, and banners</p>
        </div>
        {activeTab === "Blog Posts" && (
          <button onClick={openNewEditor} className="btn-primary text-xs flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Post
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/10 mb-8">
        {CONTENT_TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 text-sm font-semibold transition-all border-b-2 -mb-px ${activeTab === tab ? "border-[#39FF14] text-[#39FF14]" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* ── Blog Posts ── */}
      {activeTab === "Blog Posts" && (
        <div>
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 text-[#39FF14] animate-spin" /></div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500">No blog posts yet. Create your first post!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map(post => (
                <div key={post.id} className="glass rounded-xl border border-white/5 hover:border-white/10 transition-all flex gap-4 p-4 items-center">
                  <img src={post.image_url || "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=120&q=60"} alt={post.title} className="w-20 h-16 object-cover rounded-lg shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="px-2 py-0.5 bg-[#39FF14]/20 text-[#39FF14] text-[10px] font-bold rounded-full uppercase">{post.category}</span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${post.published ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>{post.published ? "Published" : "Draft"}</span>
                    </div>
                    <p className="font-semibold text-white text-sm line-clamp-1">{post.title}</p>
                    <div className="flex gap-4 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{post.author}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{post.read_time} min</span>
                      <span>{formatDate(post.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => setPreviewPost(post)} className="p-2 glass rounded-lg border border-white/10 text-gray-400 hover:text-[#39FF14] transition-colors" title="Preview"><Eye className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleTogglePublish(post)} className={`p-2 glass rounded-lg border transition-colors ${post.published ? "border-yellow-500/30 text-yellow-400 hover:text-yellow-300" : "border-green-500/30 text-green-400 hover:text-green-300"}`} title={post.published ? "Unpublish" : "Publish"}>{post.published ? <EyeOff className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}</button>
                    <button onClick={() => openEditEditor(post)} className="p-2 glass rounded-lg border border-white/10 text-gray-400 hover:text-white transition-colors" title="Edit"><Edit className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(post.id)} className="p-2 glass rounded-lg border border-white/10 text-gray-400 hover:text-red-400 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FAQs, Testimonials, Banners — unchanged */}
      {activeTab === "FAQs" && (
        <div className="space-y-3">
          <div className="flex justify-end mb-4"><button className="btn-outline text-xs flex items-center gap-2"><Plus className="w-3 h-3" /> Add FAQ</button></div>
          {FAQS.map((faq, i) => (
            <div key={i} className="glass rounded-xl border border-white/5 p-5 flex items-start justify-between gap-4">
              <div>
                <span className="px-2 py-0.5 text-xs bg-white/10 text-gray-400 rounded-full mr-2">{faq.category}</span>
                <p className="font-semibold text-white mt-2">{faq.q}</p>
                <p className="text-gray-400 text-sm mt-1">{faq.a}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button className="p-2 glass rounded-lg border border-white/10 text-gray-400 hover:text-white transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                <button className="p-2 glass rounded-lg border border-white/10 text-gray-400 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {activeTab === "Testimonials" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {["Ramon Estrada – Fleet Manager, QuickBites", "Carla Villanueva – IslaResort Palawan", "Bernardo Reyes – QC Local Government", "Jennie Ocampo – Daily Commuter"].map((item, i) => (
            <div key={i} className="glass rounded-xl border border-white/5 p-5 flex items-center justify-between">
              <div>
                <p className="font-semibold text-white text-sm">{item.split(" – ")[0]}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.split(" – ")[1]}</p>
                <div className="flex mt-2">{Array.from({ length: 5 }).map((_, j) => <span key={j} className="text-[#39FF14] text-xs">★</span>)}</div>
              </div>
              <button className="p-2 glass rounded-lg border border-white/10 text-gray-400 hover:text-white transition-colors"><Edit className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      )}
      {activeTab === "Banners" && (
        <div className="space-y-4">
          {["Homepage Hero Banner", "Products Page Banner", "Financing Promo Banner"].map((banner, i) => (
            <div key={i} className="glass rounded-xl border border-white/5 p-5 flex items-center justify-between">
              <div>
                <p className="font-semibold text-white text-sm">{banner}</p>
                <p className="text-xs text-gray-500 mt-0.5">Last updated: July 2026</p>
              </div>
              <div className="flex gap-2">
                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">Active</span>
                <button className="p-2 glass rounded-lg border border-white/10 text-gray-400 hover:text-white transition-colors"><Edit className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── BLOG EDITOR MODAL ── */}
      {showEditor && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-black/90 backdrop-blur-md p-4 pt-8">
          <div className="relative w-full max-w-4xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden" style={{ background: "#0D0D0D" }}>
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#39FF14] to-[#00FFFF]" />

            <div className="flex items-center justify-between px-8 py-5 border-b border-white/8">
              <div>
                <h2 className="font-orbitron font-bold text-xl text-white">{editingPost ? "Edit Post" : "New Blog Post"}</h2>
                <p className="text-xs text-gray-500 mt-0.5">Fill in all fields and publish when ready</p>
              </div>
              <button onClick={() => setShowEditor(false)} className="w-9 h-9 flex items-center justify-center rounded-xl border border-white/10 text-gray-500 hover:text-white transition-all"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-8 space-y-6">
              {/* Title + Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-gray-400 mb-2 uppercase tracking-widest font-medium">Post Title <span className="text-[#39FF14]">*</span></label>
                  <input value={form.title} onChange={e => handleTitleChange(e.target.value)} placeholder="e.g. Best E-Bikes for Delivery Riders in 2026" className={inputCls} {...INPUT_DARK} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-2 uppercase tracking-widest font-medium">URL Slug <span className="text-[#39FF14]">*</span></label>
                  <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="best-e-bikes-delivery-riders-2026" className={inputCls + " font-mono"} {...INPUT_DARK} />
                  <p className="text-xs text-gray-600 mt-1">tripmobility.ph/blog/{form.slug || "..."}</p>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-2 uppercase tracking-widest font-medium">Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inputCls} style={{ background: "#1A1A1A" }}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Author + Read Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs text-gray-400 mb-2 uppercase tracking-widest font-medium flex items-center gap-1.5"><User className="w-3 h-3" />Author</label>
                  <input value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} placeholder="TRIP Mobility Team" className={inputCls} {...INPUT_DARK} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-2 uppercase tracking-widest font-medium flex items-center gap-1.5"><Clock className="w-3 h-3" />Read Time (minutes)</label>
                  <input type="number" min={1} max={60} value={form.read_time} onChange={e => setForm(f => ({ ...f, read_time: parseInt(e.target.value) || 5 }))} className={inputCls} {...INPUT_DARK} />
                </div>
              </div>

              {/* ── COVER IMAGE with Upload + URL + Drag-and-Drop ── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs text-gray-400 uppercase tracking-widest font-medium flex items-center gap-1.5"><ImageIcon className="w-3 h-3" />Cover Image</label>
                  <div className="flex gap-1 glass rounded-lg border border-white/10 p-1">
                    <button onClick={() => setImageMode("upload")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${imageMode === "upload" ? "bg-[#39FF14]/20 text-[#39FF14]" : "text-gray-500 hover:text-white"}`}>
                      <Upload className="w-3 h-3" />Upload
                    </button>
                    <button onClick={() => setImageMode("url")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${imageMode === "url" ? "bg-[#39FF14]/20 text-[#39FF14]" : "text-gray-500 hover:text-white"}`}>
                      <LinkIcon className="w-3 h-3" />URL
                    </button>
                  </div>
                </div>

                {imageMode === "upload" ? (
                  <div>
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />

                    {form.image_url ? (
                      /* Image already uploaded */
                      <div className="relative rounded-xl overflow-hidden h-40 border border-[#39FF14]/30 group">
                        <img src={form.image_url} alt="Cover" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3">
                          <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-[#39FF14] text-[#0A0A0A] rounded-lg text-xs font-bold">Replace Image</button>
                          <button onClick={() => setForm(f => ({ ...f, image_url: "" }))} className="px-4 py-2 bg-red-500/80 text-white rounded-lg text-xs font-bold">Remove</button>
                        </div>
                        <div className="absolute top-3 left-3 px-2 py-1 bg-[#39FF14] text-[#0A0A0A] text-[10px] font-bold rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />Uploaded
                        </div>
                      </div>
                    ) : (
                      /* Drop Zone */
                      <div ref={dropZoneRef} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                        onClick={() => !uploadingImage && fileInputRef.current?.click()}
                        className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all h-40 flex flex-col items-center justify-center gap-3 ${isDragging ? "border-[#39FF14] bg-[#39FF14]/8" : "border-white/20 hover:border-[#39FF14]/50 hover:bg-white/2"}`}>
                        {uploadingImage ? (
                          <div className="flex flex-col items-center gap-3 w-full px-8">
                            <Loader2 className="w-8 h-8 text-[#39FF14] animate-spin" />
                            <div className="w-full">
                              <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>Uploading...</span>
                                <span>{uploadProgress}%</span>
                              </div>
                              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-[#39FF14] to-[#00FFFF] rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center border ${isDragging ? "border-[#39FF14]/40 bg-[#39FF14]/10" : "border-white/10 bg-white/5"}`}>
                              <Upload className={`w-6 h-6 ${isDragging ? "text-[#39FF14]" : "text-gray-400"}`} />
                            </div>
                            <div className="text-center">
                              <p className={`text-sm font-semibold ${isDragging ? "text-[#39FF14]" : "text-gray-300"}`}>
                                {isDragging ? "Drop image here" : "Drag & drop or click to upload"}
                              </p>
                              <p className="text-xs text-gray-600 mt-1">JPG, PNG, WebP, GIF · Max 10MB</p>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* URL Mode */
                  <div>
                    <input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://images.unsplash.com/photo-..." className={inputCls + " font-mono"} {...INPUT_DARK} />
                    {form.image_url && (
                      <div className="mt-2 rounded-xl overflow-hidden h-24 border border-white/10 relative">
                        <img src={form.image_url} alt="Preview" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Excerpt */}
              <div>
                <label className="block text-xs text-gray-400 mb-2 uppercase tracking-widest font-medium flex items-center gap-1.5"><AlignLeft className="w-3 h-3" />Excerpt / Summary</label>
                <textarea value={form.excerpt} onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))} placeholder="A 2–3 sentence summary that appears in article cards..." rows={3} className={inputCls + " resize-none"} {...INPUT_DARK} />
              </div>

              {/* Body */}
              <div>
                <label className="block text-xs text-gray-400 mb-2 uppercase tracking-widest font-medium">Article Body</label>
                <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Write your full article here..." rows={14} className={inputCls + " font-mono leading-relaxed resize-y"} style={{ background: "#1A1A1A", minHeight: "280px" }} />
                <p className="text-xs text-gray-600 mt-1">{form.body.split(" ").filter(Boolean).length} words · ~{Math.ceil(form.body.split(" ").filter(Boolean).length / 200)} min read</p>
              </div>

              {/* Publish Toggle */}
              <div className="flex items-center gap-3 p-4 rounded-xl bg-white/2 border border-white/8">
                <button type="button" onClick={() => setForm(f => ({ ...f, published: !f.published }))} className={`relative w-12 h-6 rounded-full transition-all duration-300 ${form.published ? "bg-[#39FF14]" : "bg-white/15"}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ${form.published ? "left-7" : "left-1"}`} />
                </button>
                <div>
                  <p className="text-sm font-semibold text-white">{form.published ? "Published — visible to public" : "Draft — not visible to public"}</p>
                  <p className="text-xs text-gray-500">Toggle to change publish status</p>
                </div>
                {form.published && <CheckCircle className="w-4 h-4 text-[#39FF14] ml-auto" />}
              </div>
            </div>

            <div className="px-8 py-5 border-t border-white/8 flex gap-3 justify-end">
              <button onClick={() => setShowEditor(false)} className="btn-outline text-sm px-5">Cancel</button>
              <button onClick={() => handleSave(false)} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/15 text-gray-300 hover:text-white hover:border-white/30 transition-all text-sm font-semibold">
                <Save className="w-4 h-4" />{saving ? "Saving..." : "Save Draft"}
              </button>
              <button onClick={() => handleSave(true)} disabled={saving} className="btn-primary flex items-center gap-2">
                <Globe className="w-4 h-4" />{saving ? "Publishing..." : "Publish Now"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post Preview Modal */}
      {previewPost && (
        <div className="fixed inset-0 z-[250] flex items-start justify-center overflow-y-auto bg-black/90 backdrop-blur-md p-4 pt-8">
          <div className="relative w-full max-w-2xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden" style={{ background: "#0D0D0D" }}>
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#39FF14] to-[#00FFFF]" />
            <div className="flex items-center justify-between p-5 border-b border-white/8">
              <span className="text-xs text-[#39FF14] font-semibold tracking-widest uppercase">Preview</span>
              <button onClick={() => setPreviewPost(null)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/10 text-gray-500 hover:text-white transition-all"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6">
              {previewPost.image_url && <img src={previewPost.image_url} alt={previewPost.title} className="w-full h-48 object-cover rounded-xl mb-5" />}
              <span className="px-2.5 py-1 bg-[#39FF14] text-[#0A0A0A] text-[10px] font-bold rounded-full uppercase">{previewPost.category}</span>
              <h2 className="font-orbitron font-bold text-xl text-white mt-3 mb-3">{previewPost.title}</h2>
              <p className="text-gray-300 text-sm leading-relaxed mb-4">{previewPost.excerpt}</p>
              <div className="flex gap-4 text-xs text-gray-500 mb-5 pb-5 border-b border-white/8">
                <span>{previewPost.author}</span><span>{previewPost.read_time} min read</span>
                <span className={previewPost.published ? "text-green-400" : "text-yellow-400"}>{previewPost.published ? "Published" : "Draft"}</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed line-clamp-6">{previewPost.body}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
