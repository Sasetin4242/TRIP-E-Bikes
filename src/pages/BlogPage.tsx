import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Clock, User, ArrowRight, Search, BookOpen, Loader2, AlertCircle } from "lucide-react";
import SectionObserver from "@/components/features/SectionObserver";
import ParticleField from "@/components/features/ParticleField";
import { apiClient } from "@/lib/api-client";
import { trackPageView, trackBlogRead } from "@/hooks/useTracking";

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
}

const CATEGORIES = ["All", "Industry News", "Battery Care", "Buying Guides", "Comparisons", "Rider Tips", "Sustainability", "Company News"];

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    trackPageView("/blog", "Knowledge Hub — TRIP Mobility");
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await apiClient.get("/blog.php");
    if (err) {
      setError(err.message);
    } else {
      const mapped = (data || []).map((p: any) => ({
        ...p,
        image_url: p.cover_image,
        category: p.category || "Technology"
      }));
      setPosts(mapped);
    }
    setLoading(false);
  };

  const filtered = posts.filter((post) => {
    const matchesCategory = activeCategory === "All" || post.category === activeCategory;
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.excerpt || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featured = filtered[0];
  const rest = filtered.slice(1);

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
  };

  return (
    <div className="bg-[#0A0A0A] min-h-screen">
      {/* BreadcrumbList Schema */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://tripmobility.ph" },
          { "@type": "ListItem", "position": 2, "name": "Knowledge Hub", "item": "https://tripmobility.ph/blog" },
        ]
      })}} />

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <ParticleField />
        <div className="absolute inset-0 bg-hero-gradient" />
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <p className="section-label mb-4">Insights & Resources</p>
          <h1 className="font-orbitron font-black text-5xl sm:text-6xl text-white mb-6">
            TRIP <span className="gradient-text">Knowledge</span> Hub
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Expert guides, industry news, and resources to maximize your e-mobility investment.
          </p>
        </div>
      </section>

      {/* Filters — sticky */}
      <section className="py-5 sticky top-20 z-40 bg-[#0A0A0A]/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex gap-2 flex-wrap flex-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
                  activeCategory === cat
                    ? "bg-[#39FF14] text-[#0A0A0A]"
                    : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/8"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="relative shrink-0">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#39FF14]/50 w-48 transition-all"
            />
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="w-10 h-10 text-[#39FF14] animate-spin" />
              <p className="text-gray-500 text-sm">Loading articles...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <AlertCircle className="w-10 h-10 text-red-400" />
              <p className="text-gray-400 text-sm">{error}</p>
              <button onClick={fetchPosts} className="btn-outline text-xs">Retry</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24">
              <BookOpen className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500">No articles found. Try a different search or category.</p>
            </div>
          ) : (
            <>
              {/* Featured Post */}
              {featured && (
                <SectionObserver>
                  <Link
                    to={`/blog/${featured.slug}`}
                    onClick={() => trackBlogRead(featured.title, featured.category)}
                    className="w-full text-left group relative rounded-2xl overflow-hidden mb-12 block"
                  >
                    <img
                      src={featured.image_url || "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80"}
                      alt={featured.title}
                      className="w-full h-72 sm:h-96 object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/50 to-transparent" />
                    <div className="absolute top-6 left-6">
                      <span className="px-3 py-1 bg-[#39FF14] text-[#0A0A0A] text-xs font-bold rounded-full uppercase">
                        ★ Featured — {featured.category}
                      </span>
                    </div>
                    <div className="absolute bottom-0 left-0 p-8 sm:p-10 max-w-3xl">
                      <h2 className="font-orbitron font-bold text-2xl sm:text-3xl text-white mb-3 group-hover:text-[#39FF14] transition-colors">
                        {featured.title}
                      </h2>
                      <p className="text-gray-300 mb-4 text-sm leading-relaxed line-clamp-2">{featured.excerpt}</p>
                      <div className="flex items-center gap-6 text-xs text-gray-400">
                        <span className="flex items-center gap-1.5"><User className="w-3 h-3" />{featured.author}</span>
                        <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" />{featured.read_time} min read</span>
                        <span>{formatDate(featured.created_at)}</span>
                      </div>
                    </div>
                    <div className="absolute bottom-8 right-8 sm:bottom-10 sm:right-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-10 h-10 rounded-full bg-[#39FF14] flex items-center justify-center">
                        <ArrowRight className="w-5 h-5 text-[#0A0A0A]" />
                      </div>
                    </div>
                  </Link>
                </SectionObserver>
              )}

              {/* Posts Grid */}
              {rest.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                  {rest.map((post, i) => (
                    <SectionObserver key={post.id} delay={i * 80}>
                      <Link
                        to={`/blog/${post.slug}`}
                        onClick={() => trackBlogRead(post.title, post.category)}
                        className="w-full text-left glass rounded-xl overflow-hidden border border-white/5 hover:border-[#39FF14]/25 transition-all group h-full flex flex-col"
                      >
                        <div className="relative h-48 overflow-hidden shrink-0">
                          <img
                            src={post.image_url || "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80"}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          />
                          <div className="absolute top-3 left-3">
                            <span className="px-2 py-0.5 bg-[#39FF14] text-[#0A0A0A] text-[10px] font-bold rounded-full uppercase">
                              {post.category}
                            </span>
                          </div>
                        </div>
                        <div className="p-5 flex flex-col flex-1">
                          <h3 className="font-bold text-white mb-3 group-hover:text-[#39FF14] transition-colors line-clamp-2 text-base leading-snug">
                            {post.title}
                          </h3>
                          <p className="text-gray-400 text-sm leading-relaxed mb-4 flex-1 line-clamp-3">{post.excerpt}</p>
                          <div className="flex items-center justify-between text-xs text-gray-500 mt-auto pt-4 border-t border-white/5">
                            <span className="flex items-center gap-1.5"><User className="w-3 h-3" />{post.author}</span>
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{post.read_time} min</span>
                              <ArrowRight className="w-3.5 h-3.5 text-[#39FF14] group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </div>
                        </div>
                      </Link>
                    </SectionObserver>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
