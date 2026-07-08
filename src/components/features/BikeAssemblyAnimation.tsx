import { useEffect, useRef, useState } from "react";

interface AnimatedCounterProps {
  target: number;
  suffix?: string;
  duration?: number;
  active: boolean;
}

function AnimatedCounter({ target, suffix = "", duration = 2000, active }: AnimatedCounterProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [active, target, duration]);

  return <span>{count}{suffix}</span>;
}

const BIKE_PARTS = [
  { id: "frame", label: "Frame", color: "#39FF14", delay: 0 },
  { id: "wheels", label: "Wheels", color: "#00FFFF", delay: 400 },
  { id: "battery", label: "Battery", color: "#39FF14", delay: 800 },
  { id: "motor", label: "Motor", color: "#A8FF3E", delay: 1200 },
  { id: "display", label: "Smart Display", color: "#00FFFF", delay: 1600 },
];

const METRICS = [
  { label: "Max Range", value: 120, suffix: "km", color: "#39FF14", barWidth: 100 },
  { label: "Top Speed", value: 50, suffix: "km/h", color: "#00FFFF", barWidth: 83 },
  { label: "Motor Power", value: 750, suffix: "W", color: "#A8FF3E", barWidth: 75 },
  { label: "Payload", value: 180, suffix: "kg", color: "#39FF14", barWidth: 72 },
];

export default function BikeAssemblyAnimation() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [visibleParts, setVisibleParts] = useState<Set<string>>(new Set());

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !active) {
          setActive(true);
          BIKE_PARTS.forEach((part) => {
            setTimeout(() => {
              setVisibleParts((prev) => new Set([...prev, part.id]));
            }, part.delay);
          });
        }
      },
      { threshold: 0.3 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [active]);

  return (
    <section
      ref={sectionRef}
      className="py-24 relative overflow-hidden bg-[#0D0D0D]"
    >
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: "linear-gradient(rgba(57,255,20,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(57,255,20,0.5) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="section-label mb-3">Engineering Excellence</p>
          <h2 className="font-orbitron font-bold text-4xl sm:text-5xl text-white">
            Assembled for <span className="gradient-text">Performance</span>
          </h2>
          <p className="text-gray-400 mt-4 max-w-xl mx-auto">
            Every TRIP e-bike is precision-engineered with premium components that work together for an unmatched riding experience.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Bike assembly visual */}
          <div className="relative">
            {/* SVG Bike Silhouette */}
            <div className="relative w-full aspect-[4/3] flex items-center justify-center">
              {/* Glow orb */}
              <div
                className="absolute w-64 h-64 rounded-full blur-[80px] transition-all duration-1000"
                style={{
                  background: active ? "radial-gradient(circle, rgba(57,255,20,0.15), transparent)" : "transparent",
                }}
              />

              {/* SVG bike */}
              <svg
                viewBox="0 0 400 280"
                className="w-full max-w-md relative z-10"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Rear wheel */}
                <g
                  className="transition-all duration-700"
                  style={{
                    opacity: visibleParts.has("wheels") ? 1 : 0,
                    transform: visibleParts.has("wheels") ? "translateY(0)" : "translateY(30px)",
                  }}
                >
                  <circle cx="100" cy="195" r="60" stroke="#00FFFF" strokeWidth="8" opacity="0.8" />
                  <circle cx="100" cy="195" r="45" stroke="#00FFFF" strokeWidth="2" opacity="0.3" />
                  <circle cx="100" cy="195" r="8" fill="#00FFFF" opacity="0.9" />
                  {[0, 60, 120, 180, 240, 300].map((angle) => (
                    <line
                      key={angle}
                      x1="100" y1="195"
                      x2={100 + 50 * Math.cos((angle * Math.PI) / 180)}
                      y2={195 + 50 * Math.sin((angle * Math.PI) / 180)}
                      stroke="#00FFFF"
                      strokeWidth="1.5"
                      opacity="0.4"
                    />
                  ))}
                </g>

                {/* Front wheel */}
                <g
                  className="transition-all duration-700"
                  style={{
                    opacity: visibleParts.has("wheels") ? 1 : 0,
                    transform: visibleParts.has("wheels") ? "translateY(0)" : "translateY(30px)",
                    transitionDelay: "200ms",
                  }}
                >
                  <circle cx="300" cy="195" r="60" stroke="#00FFFF" strokeWidth="8" opacity="0.8" />
                  <circle cx="300" cy="195" r="45" stroke="#00FFFF" strokeWidth="2" opacity="0.3" />
                  <circle cx="300" cy="195" r="8" fill="#00FFFF" opacity="0.9" />
                  {[0, 60, 120, 180, 240, 300].map((angle) => (
                    <line
                      key={angle}
                      x1="300" y1="195"
                      x2={300 + 50 * Math.cos((angle * Math.PI) / 180)}
                      y2={195 + 50 * Math.sin((angle * Math.PI) / 180)}
                      stroke="#00FFFF"
                      strokeWidth="1.5"
                      opacity="0.4"
                    />
                  ))}
                </g>

                {/* Frame */}
                <g
                  className="transition-all duration-800"
                  style={{
                    opacity: visibleParts.has("frame") ? 1 : 0,
                    transform: visibleParts.has("frame") ? "scale(1)" : "scale(0.9)",
                    transformOrigin: "200px 140px",
                  }}
                >
                  {/* Main triangle frame */}
                  <path d="M100 195 L200 80 L300 195" stroke="#39FF14" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
                  {/* Seat tube */}
                  <path d="M200 80 L180 195" stroke="#39FF14" strokeWidth="5" strokeLinecap="round" opacity="0.7" />
                  {/* Top tube */}
                  <path d="M200 80 L280 100" stroke="#39FF14" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
                  {/* Fork */}
                  <path d="M280 100 L300 195" stroke="#39FF14" strokeWidth="5" strokeLinecap="round" opacity="0.8" />
                  {/* Chain stay */}
                  <path d="M100 195 L180 195" stroke="#39FF14" strokeWidth="3" opacity="0.5" />
                  {/* Glow effect */}
                  <path d="M100 195 L200 80 L300 195" stroke="#39FF14" strokeWidth="2" strokeLinecap="round" opacity="0.3" filter="blur(3px)" />
                </g>

                {/* Battery */}
                <g
                  className="transition-all duration-700"
                  style={{
                    opacity: visibleParts.has("battery") ? 1 : 0,
                    transform: visibleParts.has("battery") ? "translateX(0)" : "translateX(-20px)",
                  }}
                >
                  <rect x="145" y="140" width="50" height="22" rx="4" fill="rgba(57,255,20,0.15)" stroke="#39FF14" strokeWidth="2" />
                  <rect x="148" y="143" width="12" height="16" rx="2" fill="#39FF14" opacity="0.8" />
                  <rect x="163" y="143" width="12" height="16" rx="2" fill="#39FF14" opacity="0.6" />
                  <rect x="178" y="143" width="10" height="16" rx="2" fill="#39FF14" opacity="0.4" />
                  <rect x="193" y="147" width="4" height="8" rx="2" fill="#39FF14" opacity="0.7" />
                  <text x="170" y="178" textAnchor="middle" fill="#39FF14" fontSize="8" fontWeight="bold" opacity="0.8">48V 11.6Ah</text>
                </g>

                {/* Motor */}
                <g
                  className="transition-all duration-700"
                  style={{
                    opacity: visibleParts.has("motor") ? 1 : 0,
                    transform: visibleParts.has("motor") ? "scale(1)" : "scale(0)",
                    transformOrigin: "100px 195px",
                  }}
                >
                  <circle cx="100" cy="195" r="16" fill="rgba(168,255,62,0.2)" stroke="#A8FF3E" strokeWidth="2" />
                  <circle cx="100" cy="195" r="6" fill="#A8FF3E" />
                  <text x="100" y="222" textAnchor="middle" fill="#A8FF3E" fontSize="7" fontWeight="bold">750W</text>
                </g>

                {/* Display */}
                <g
                  className="transition-all duration-700"
                  style={{
                    opacity: visibleParts.has("display") ? 1 : 0,
                    transform: visibleParts.has("display") ? "translateY(0)" : "translateY(-15px)",
                  }}
                >
                  <rect x="252" y="70" width="36" height="24" rx="4" fill="rgba(0,255,255,0.1)" stroke="#00FFFF" strokeWidth="1.5" />
                  <rect x="256" y="74" width="28" height="16" rx="2" fill="rgba(0,255,255,0.15)" />
                  <text x="270" y="85" textAnchor="middle" fill="#00FFFF" fontSize="7" fontWeight="bold">LCD</text>
                </g>

                {/* Seat */}
                <g style={{ opacity: visibleParts.has("frame") ? 1 : 0 }}>
                  <path d="M185 75 Q200 65 215 68 L210 80 Q200 72 190 78 Z" fill="rgba(57,255,20,0.3)" stroke="#39FF14" strokeWidth="1.5" />
                </g>

                {/* Handlebar */}
                <g style={{ opacity: visibleParts.has("frame") ? 1 : 0 }}>
                  <path d="M268 88 Q290 78 295 90" stroke="#39FF14" strokeWidth="3" fill="none" strokeLinecap="round" />
                </g>
              </svg>
            </div>

            {/* Assembly steps */}
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {BIKE_PARTS.map((part) => (
                <div
                  key={part.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-500"
                  style={{
                    borderColor: visibleParts.has(part.id) ? part.color : "rgba(255,255,255,0.1)",
                    color: visibleParts.has(part.id) ? part.color : "#4B5563",
                    background: visibleParts.has(part.id) ? `${part.color}15` : "transparent",
                  }}
                >
                  {visibleParts.has(part.id) && (
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: part.color }} />
                  )}
                  {part.label}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Performance metrics */}
          <div className="space-y-6">
            {METRICS.map((metric, i) => (
              <div
                key={metric.label}
                className="relative"
                style={{
                  opacity: active ? 1 : 0,
                  transform: active ? "translateX(0)" : "translateX(40px)",
                  transition: `all 0.7s ease ${i * 200 + 600}ms`,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-400 font-medium">{metric.label}</p>
                  <p className="font-orbitron font-bold text-2xl" style={{ color: metric.color }}>
                    <AnimatedCounter target={metric.value} suffix={metric.suffix} active={active} duration={2000 + i * 200} />
                  </p>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1500"
                    style={{
                      width: active ? `${metric.barWidth}%` : "0%",
                      background: `linear-gradient(90deg, ${metric.color}, ${metric.color}80)`,
                      boxShadow: active ? `0 0 10px ${metric.color}60` : "none",
                      transitionDelay: `${i * 200 + 800}ms`,
                      transitionDuration: "1200ms",
                    }}
                  />
                </div>
              </div>
            ))}

            <div
              className="mt-8 p-5 rounded-2xl border border-[#39FF14]/20 bg-[#39FF14]/5"
              style={{
                opacity: active ? 1 : 0,
                transform: active ? "translateY(0)" : "translateY(20px)",
                transition: "all 0.8s ease 1600ms",
              }}
            >
              <p className="text-xs text-[#39FF14] font-semibold tracking-widest uppercase mb-3">Real-World Performance</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "CO₂ Saved/Year", value: "1.2T" },
                  { label: "Fuel Cost Saved", value: "₱0/day" },
                  { label: "Charge Time", value: "5–6 hrs" },
                  { label: "Service Life", value: "8+ Years" },
                ].map((stat) => (
                  <div key={stat.label}>
                    <p className="font-orbitron font-bold text-lg text-white">{stat.value}</p>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
