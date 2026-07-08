import { Link } from "react-router-dom";
import { Zap, Battery, Gauge, ArrowRight, GitCompare } from "lucide-react";
import type { Product } from "@/types";
import { useCompareStore } from "@/components/features/ProductComparison";

interface ProductCardProps {
  product: Product;
  onQuote?: () => void;
  featured?: boolean;
}

export default function ProductCard({ product, onQuote, featured }: ProductCardProps) {
  const { addProduct, removeProduct, isSelected, selectedIds } = useCompareStore();
  const selected = isSelected(product.id);
  const canAdd = selectedIds.length < 3 || selected;

  const handleCompareToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (selected) removeProduct(product.id);
    else addProduct(product.id);
  };

  return (
    <div
      className={`group relative glass rounded-2xl overflow-hidden card-hover border transition-all duration-500 ${
        selected
          ? "border-[#39FF14]/50 shadow-[0_0_20px_rgba(57,255,20,0.12)]"
          : "border-white/5 hover:border-[#39FF14]/30"
      } ${featured ? "lg:col-span-1 row-span-1" : ""}`}
    >
      {/* Badge */}
      {product.badge && (
        <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-[#39FF14] text-[#0A0A0A] text-xs font-bold rounded-full uppercase tracking-wider">
          {product.badge}
        </div>
      )}

      {/* Compare toggle */}
      <button
        onClick={handleCompareToggle}
        disabled={!canAdd}
        title={selected ? "Remove from comparison" : "Add to comparison"}
        className={`absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-lg border transition-all duration-200 ${
          selected
            ? "bg-[#39FF14] border-[#39FF14] text-[#0A0A0A]"
            : canAdd
            ? "bg-black/50 border-white/20 text-gray-400 hover:border-[#39FF14]/60 hover:text-[#39FF14] backdrop-blur-sm"
            : "bg-black/30 border-white/10 text-gray-700 cursor-not-allowed"
        }`}
      >
        <GitCompare className="w-3.5 h-3.5" />
      </button>

      {/* Image */}
      <div className="relative h-56 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent z-10" />
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#39FF14]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10" />
        {/* Compare selected indicator */}
        {selected && (
          <div className="absolute inset-0 bg-[#39FF14]/5 z-10 pointer-events-none" />
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Name & Tagline */}
        <div className="mb-4">
          <h3 className="font-orbitron font-bold text-xl text-white group-hover:text-[#39FF14] transition-colors mb-1">
            {product.name}
          </h3>
          <p className="text-xs text-[#39FF14] uppercase tracking-wider font-medium">{product.tagline}</p>
        </div>

        {/* Specs Grid */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="text-center p-2 bg-white/3 rounded-lg border border-white/5">
            <Zap className="w-4 h-4 text-[#39FF14] mx-auto mb-1" />
            <p className="text-xs text-gray-500">Motor</p>
            <p className="text-xs font-semibold text-white">{product.specs.motor.replace("Rear Hub Motor", "").trim()}</p>
          </div>
          <div className="text-center p-2 bg-white/3 rounded-lg border border-white/5">
            <Battery className="w-4 h-4 text-[#39FF14] mx-auto mb-1" />
            <p className="text-xs text-gray-500">Range</p>
            <p className="text-xs font-semibold text-white">{product.specs.range}</p>
          </div>
          <div className="text-center p-2 bg-white/3 rounded-lg border border-white/5">
            <Gauge className="w-4 h-4 text-[#39FF14] mx-auto mb-1" />
            <p className="text-xs text-gray-500">Speed</p>
            <p className="text-xs font-semibold text-white">{product.specs.topSpeed}</p>
          </div>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Starting at</p>
            <p className="font-orbitron font-bold text-2xl text-[#39FF14]">
              ₱{product.price.toLocaleString()}
            </p>
          </div>
          <div className="px-2 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
            <span className="text-xs text-green-400 font-medium">In Stock</span>
          </div>
        </div>

        {/* Compare hint */}
        {selected && (
          <div className="mb-3 px-3 py-1.5 bg-[#39FF14]/10 border border-[#39FF14]/20 rounded-lg text-center">
            <p className="text-[10px] text-[#39FF14] font-semibold">Added to comparison</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onQuote}
            className="btn-primary flex-1 text-xs"
          >
            Get Quote
          </button>
          <Link
            to={`/products/${product.id}`}
            className="w-11 h-11 flex items-center justify-center rounded-lg border border-white/20 text-white hover:border-[#39FF14]/50 hover:text-[#39FF14] transition-all shrink-0"
          >
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
