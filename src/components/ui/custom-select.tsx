import { useState, useRef, useEffect, ReactNode } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
  color?: string;
  description?: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  dropdownClassName?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select an option...",
  className = "",
  triggerClassName = "",
  dropdownClassName = "",
  disabled = false,
  size = "md",
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [animating, setAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  const sizeClasses = {
    sm: "px-3 py-2 text-xs",
    md: "px-4 py-3 text-sm",
    lg: "px-5 py-3.5 text-base",
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openDropdown = () => {
    if (disabled) return;
    setAnimating(true);
    setOpen(true);
  };

  const closeDropdown = () => {
    setAnimating(false);
    setTimeout(() => setOpen(false), 200);
  };

  const handleSelect = (optValue: string) => {
    onChange(optValue);
    closeDropdown();
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={open ? closeDropdown : openDropdown}
        disabled={disabled}
        className={cn(
          "w-full flex items-center justify-between gap-2 rounded-xl border transition-all duration-200 text-left",
          "border-white/10 text-white placeholder-gray-600",
          "focus:outline-none focus:border-[#39FF14]/50",
          "hover:border-white/20 active:scale-[0.99]",
          open && "border-[#39FF14]/40 shadow-[0_0_15px_rgba(57,255,20,0.1)]",
          disabled && "opacity-50 cursor-not-allowed",
          sizeClasses[size],
          triggerClassName
        )}
        style={{ background: "#1A1A1A" }}
      >
        <span className="flex items-center gap-2 flex-1 min-w-0">
          {selected?.icon && <span className="shrink-0">{selected.icon}</span>}
          {selected?.color && (
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: selected.color }} />
          )}
          <span className={cn("truncate", !selected && "text-gray-600")}>
            {selected?.label || placeholder}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-gray-500 shrink-0 transition-transform duration-200",
            open && "rotate-180 text-[#39FF14]"
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className={cn(
            "absolute z-[300] w-full mt-2 rounded-xl border border-white/10 shadow-2xl overflow-hidden",
            "transition-all duration-200 origin-top",
            animating ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 -translate-y-2",
            dropdownClassName
          )}
          style={{
            background: "linear-gradient(145deg, #1A1A1A 0%, #141414 100%)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(57,255,20,0.1)",
          }}
        >
          {/* Top glow line */}
          <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[#39FF14]/40 to-transparent" />

          <div className="py-1.5 max-h-60 overflow-y-auto scrollbar-none">
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-150 text-left",
                    "hover:bg-[#39FF14]/8 hover:text-white",
                    isSelected
                      ? "bg-[#39FF14]/12 text-[#39FF14]"
                      : "text-gray-300"
                  )}
                >
                  {opt.icon && <span className="shrink-0 text-inherit">{opt.icon}</span>}
                  {opt.color && (
                    <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/10" style={{ background: opt.color }} />
                  )}
                  <span className="flex-1 min-w-0">
                    <span className="block truncate font-medium">{opt.label}</span>
                    {opt.description && (
                      <span className="block text-xs text-gray-500 mt-0.5 truncate">{opt.description}</span>
                    )}
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#39FF14] shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        </div>
      )}
    </div>
  );
}
