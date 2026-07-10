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
          {/* Left: E-Bike Detail Video Player */}
          <div className="relative">
            <div className="glass rounded-2xl border border-white/10 overflow-hidden relative group aspect-[16/9] bg-black shadow-2xl">
              {/* HTML5 Video Player */}
              <video
                src="https://assets.mixkit.co/videos/preview/mixkit-man-riding-an-electric-bicycle-along-a-street-41804-large.mp4"
                className="w-full h-full object-cover"
                loop
                muted
                autoPlay
                playsInline
              />
              {/* HUD Control Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 flex flex-col justify-between p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 text-[10px] uppercase font-orbitron tracking-widest bg-[#39FF14]/20 border border-[#39FF14]/30 rounded-full text-[#39FF14] animate-pulse">
                    LIVE DEMO
                  </span>
                  <span className="text-xs text-white/60 font-medium">TRIP Cargo Pro Specs</span>
                </div>

                {/* Central Play Button */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-[#39FF14]/15 border border-[#39FF14]/40 flex items-center justify-center hover:scale-105 transition-transform cursor-pointer">
                    <span className="w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-l-[12px] border-l-[#39FF14] ml-1" />
                  </div>
                </div>

                {/* Bottom Timeline indicator */}
                <div className="space-y-3">
                  <div className="h-1 bg-white/20 rounded-full overflow-hidden relative cursor-pointer">
                    <div className="h-full bg-[#39FF14] w-[45%]" />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>0:24 / 1:00</span>
                    <span className="hover:text-[#39FF14] cursor-pointer">HD 1080p</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Video Feature Quick Selector Tabs */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              {[
                { label: "⚡ Assembly & Frame", desc: "Enterprise aerospace alloy" },
                { label: "🔋 Battery Range", desc: "120km dual smart battery pack" },
                { label: "⚙️ 750W Motor Test", desc: "High-torque hill climb test" },
                { label: "📱 Smart Dashboard", desc: "LCD app navigation control" },
              ].map((tab, i) => (
                <div
                  key={i}
                  className={`p-3 glass rounded-xl border cursor-pointer hover:border-[#39FF14]/30 transition-all duration-300 ${i === 0 ? "bg-[#39FF14]/5 border-[#39FF14]/25" : "border-white/5"}`}
                >
                  <p className={`text-xs font-semibold uppercase tracking-wider ${i === 0 ? "text-[#39FF14]" : "text-white"}`}>{tab.label}</p>
                  <p className="text-[10px] text-gray-500 mt-1">{tab.desc}</p>
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
