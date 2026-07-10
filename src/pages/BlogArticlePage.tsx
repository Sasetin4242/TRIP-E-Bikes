import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Clock, User, ArrowLeft, Share2, Facebook, Twitter, Linkedin,
  BookOpen, ChevronRight, Loader2, AlertCircle, Tag, Copy, Check
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import ParticleField from "@/components/features/ParticleField";

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

export default function BlogArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [related, setRelated] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetchPost();
  }, [slug]);

  const fetchPost = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await apiClient.get(`/blog.php?slug=${slug}`);

    if (err || !data) {
      setError("Article not found.");
      setLoading(false);
      return;
    }

    setPost(data);

    // Fetch related posts
    const { data: relatedData } = await apiClient.get(`/blog.php?action=related&exclude=${slug}`);

    setRelated(relatedData || []);
    setLoading(false);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });

  const pageUrl = `https://tripmobility.ph/blog/${slug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(pageUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const socialLinks = [
    {
      name: "Facebook",
      icon: Facebook,
      color: "hover:text-blue-500",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`,
    },
    {
      name: "Twitter",
      icon: Twitter,
      color: "hover:text-sky-400",
      url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(post?.title || "")}`,
    },
    {
      name: "LinkedIn",
      icon: Linkedin,
      color: "hover:text-blue-400",
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#39FF14] animate-spin" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-gray-400">{error || "Article not found."}</p>
        <Link to="/blog" className="btn-outline text-sm">← Back to Blog</Link>
      </div>
    );
  }

  const wordCount = post.body ? post.body.split(/\s+/).filter(Boolean).length : 0;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": post.excerpt || "",
    "image": post.image_url || "https://tripmobility.ph/favicon.svg",
    "datePublished": post.created_at,
    "dateModified": post.created_at,
    "author": {
      "@type": "Person",
      "name": post.author,
      "url": "https://tripmobility.ph/about",
    },
    "publisher": {
      "@type": "Organization",
      "name": "TRIP Mobility",
      "logo": {
        "@type": "ImageObject",
        "url": "https://tripmobility.ph/favicon.svg",
      },
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": pageUrl,
    },
    "articleSection": post.category,
    "wordCount": wordCount,
    "timeRequired": `PT${post.read_time}M`,
    "inLanguage": "en-PH",
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://tripmobility.ph" },
      { "@type": "ListItem", "position": 2, "name": "Knowledge Hub", "item": "https://tripmobility.ph/blog" },
      { "@type": "ListItem", "position": 3, "name": post.title, "item": pageUrl },
    ],
  };

  // Parse body into paragraphs — detect headings and lists
  const renderBody = (body: string) => {
    if (!body) return null;
    return body.split("\n\n").map((block, i) => {
      if (block.startsWith("# ")) {
        return <h2 key={i} className="font-orbitron font-bold text-2xl text-white mt-10 mb-4">{block.slice(2)}</h2>;
      }
      if (block.startsWith("## ")) {
        return <h3 key={i} className="font-orbitron font-bold text-xl text-white mt-8 mb-3">{block.slice(3)}</h3>;
      }
      if (block.startsWith("### ")) {
        return <h4 key={i} className="font-semibold text-lg text-white mt-6 mb-2">{block.slice(4)}</h4>;
      }
      if (block.startsWith("- ") || block.startsWith("* ")) {
        const items = block.split("\n").filter(l => l.trim());
        return (
          <ul key={i} className="list-none space-y-2 my-4">
            {items.map((item, j) => (
              <li key={j} className="flex items-start gap-3 text-gray-300">
                <span className="w-1.5 h-1.5 rounded-full bg-[#39FF14] mt-2.5 shrink-0" />
                <span className="leading-relaxed">{item.replace(/^[-*]\s/, "")}</span>
              </li>
            ))}
          </ul>
        );
      }
      if (block.match(/^\d+\./)) {
        const items = block.split("\n").filter(l => l.trim());
        return (
          <ol key={i} className="space-y-2 my-4">
            {items.map((item, j) => (
              <li key={j} className="flex items-start gap-3 text-gray-300">
                <span className="w-6 h-6 rounded-full bg-[#39FF14]/15 border border-[#39FF14]/30 text-[#39FF14] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{j + 1}</span>
                <span className="leading-relaxed">{item.replace(/^\d+\.\s/, "")}</span>
              </li>
            ))}
          </ol>
        );
      }
      if (block.startsWith("> ")) {
        return (
          <blockquote key={i} className="border-l-4 border-[#39FF14] pl-6 py-2 my-6 bg-[#39FF14]/5 rounded-r-xl">
            <p className="text-gray-200 italic text-lg leading-relaxed">{block.slice(2)}</p>
          </blockquote>
        );
      }
      return (
        <p key={i} className="text-gray-300 leading-[1.9] text-base my-4">{block}</p>
      );
    });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Helmet>
        <title>{post.title} — TRIP Mobility</title>
        <meta name="description" content={post.excerpt || post.title} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt || ""} />
        {post.image_url && <meta property="og:image" content={post.image_url} />}
        <meta property="og:url" content={pageUrl} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.excerpt || ""} />
        {post.image_url && <meta name="twitter:image" content={post.image_url} />}
        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      </Helmet>

      {/* Hero Image */}
      <div className="relative h-[50vh] min-h-[340px] max-h-[520px] overflow-hidden">
        <img
          src={post.image_url || "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1400&q=85"}
          alt={post.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A]/40 via-transparent to-[#0A0A0A]" />

        {/* Back Button */}
        <div className="absolute top-0 left-0 right-0 pt-24 pb-6 px-6">
          <div className="max-w-4xl mx-auto">
            <Link to="/blog" className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-[#39FF14] transition-colors glass rounded-xl border border-white/15 px-4 py-2">
              <ArrowLeft className="w-4 h-4" />Back to Knowledge Hub
            </Link>
          </div>
        </div>

        {/* Category Badge */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-6">
          <div className="max-w-4xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#39FF14] text-[#0A0A0A] text-xs font-bold rounded-full uppercase">
              <Tag className="w-3 h-3" />{post.category}
            </span>
          </div>
        </div>
      </div>

      {/* Article Content */}
      <div className="max-w-4xl mx-auto px-6 -mt-2 pb-24">
        {/* Article Meta */}
        <div className="mb-8">
          <h1 className="font-orbitron font-black text-3xl sm:text-4xl text-white leading-tight mb-6">
            {post.title}
          </h1>

          {/* Author & Meta Row */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pb-6 border-b border-white/8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#39FF14]/20 to-[#00FFFF]/10 border border-[#39FF14]/30 flex items-center justify-center font-bold text-[#39FF14] text-sm">
{(post.author || "?")[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{post.author}</p>
                <p className="text-xs text-gray-500">TRIP Mobility Team</p>
              </div>
            </div>
            <div className="flex items-center gap-5 text-xs text-gray-500 ml-auto">
              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{post.read_time} min read</span>
              <span>{formatDate(post.created_at)}</span>
              <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" />{wordCount} words</span>
            </div>
          </div>
        </div>

        {/* Excerpt (Lead paragraph) */}
        {post.excerpt && (
          <p className="text-xl text-gray-200 leading-relaxed mb-8 font-medium border-l-4 border-[#39FF14] pl-6 py-2">
            {post.excerpt}
          </p>
        )}

        {/* Article Body */}
        <article className="prose prose-invert max-w-none">
          {renderBody(post.body || "")}
        </article>

        {/* Share Section */}
        <div className="mt-12 pt-8 border-t border-white/8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div>
              <p className="text-sm font-semibold text-white mb-1">Share this article</p>
              <p className="text-xs text-gray-500">Help others discover e-mobility insights</p>
            </div>
            <div className="flex items-center gap-3 sm:ml-auto">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-10 h-10 flex items-center justify-center rounded-xl glass border border-white/10 text-gray-400 ${social.color} transition-all hover:border-white/20 hover:scale-110`}
                  title={`Share on ${social.name}`}
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-2 px-4 py-2 rounded-xl glass border border-white/10 text-xs text-gray-400 hover:text-white hover:border-[#39FF14]/30 transition-all"
              >
                {copied ? <Check className="w-4 h-4 text-[#39FF14]" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy Link"}
              </button>
            </div>
          </div>
        </div>

        {/* Author Card */}
        <div className="mt-8 glass rounded-2xl border border-white/8 p-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#39FF14]/20 to-[#00FFFF]/10 border border-[#39FF14]/30 flex items-center justify-center font-orbitron font-black text-xl text-[#39FF14] shrink-0">
              {post.author[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-white mb-0.5">{post.author}</p>
              <p className="text-xs text-[#39FF14] mb-2">TRIP Mobility Content Team</p>
              <p className="text-sm text-gray-400 leading-relaxed">
                Expert in Philippine e-mobility trends, sustainable transportation, and electric bike technology. Helping businesses and individuals make informed decisions about going electric.
              </p>
            </div>
          </div>
        </div>

        {/* Related Articles */}
        {related.length > 0 && (
          <div className="mt-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-orbitron font-bold text-xl text-white">More in {post.category}</h2>
              <Link to="/blog" className="flex items-center gap-1.5 text-xs text-[#39FF14] hover:underline">
                View All <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {related.map((rel) => (
                <Link
                  key={rel.id}
                  to={`/blog/${rel.slug}`}
                  className="glass rounded-xl border border-white/5 hover:border-[#39FF14]/25 overflow-hidden transition-all group"
                >
                  <div className="relative h-36 overflow-hidden">
                    <img
                      src={rel.image_url || "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80"}
                      alt={rel.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D] to-transparent" />
                  </div>
                  <div className="p-4">
                    <p className="text-[10px] text-[#39FF14] font-bold uppercase tracking-widest mb-1.5">{rel.category}</p>
                    <h3 className="text-sm font-semibold text-white group-hover:text-[#39FF14] transition-colors line-clamp-2 mb-2">{rel.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{rel.read_time} min</span>
                      <span>{formatDate(rel.created_at)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* CTA Strip */}
        <div className="mt-16 glass rounded-2xl border border-[#39FF14]/15 p-8 text-center">
          <p className="font-orbitron font-bold text-xl text-white mb-2">Ready to Go Electric?</p>
          <p className="text-gray-400 text-sm mb-6">Browse TRIP Mobility's premium e-bike lineup and request a free custom quotation today.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/products" className="btn-primary flex items-center justify-center gap-2">Explore E-Bikes</Link>
            <Link to="/contact" className="btn-outline flex items-center justify-center gap-2 text-sm">Contact Sales</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
