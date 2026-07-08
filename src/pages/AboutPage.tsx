import { Link } from "react-router-dom";
import { Zap, Target, Eye, Heart, Award, Users, TrendingUp, ArrowRight } from "lucide-react";
import ParticleField from "@/components/features/ParticleField";
import SectionObserver from "@/components/features/SectionObserver";

const TIMELINE = [
  { year: "2020", title: "Founded", desc: "TRIP Mobility established with a mission to electrify Philippine transportation." },
  { year: "2021", title: "First Product Launch", desc: "TRIP Cargo Pro launched — instantly adopted by major delivery platforms." },
  { year: "2022", title: "500 Units Deployed", desc: "Reached 500 e-bikes on Metro Manila roads. Opened Cebu service center." },
  { year: "2023", title: "Corporate Partnerships", desc: "Secured partnerships with 3 Fortune 500 companies for fleet solutions." },
  { year: "2024", title: "3,000+ Units", desc: "Expanded to 12 LGUs nationwide. Launched Ranger 750 mountain e-bike." },
  { year: "2025", title: "Series A Funding", desc: "Raised funding to accelerate nationwide expansion and R&D programs." },
  { year: "2026", title: "Market Leader", desc: "Recognized as Philippines' #1 premium commercial e-bike brand." },
];

const TEAM = [
  { name: "Miguel Torres", title: "CEO & Co-Founder", bg: "from-green-500/20 to-emerald-500/10" },
  { name: "Sarah Lim", title: "CTO & Co-Founder", bg: "from-cyan-500/20 to-blue-500/10" },
  { name: "Carlos Reyes", title: "VP of Sales", bg: "from-purple-500/20 to-violet-500/10" },
  { name: "Ana Santos", title: "Head of Operations", bg: "from-yellow-500/20 to-orange-500/10" },
];

export default function AboutPage() {
  return (
    <div className="bg-[#0A0A0A] min-h-screen">
      {/* Hero */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        <ParticleField />
        <div className="absolute inset-0 bg-hero-gradient" />
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <p className="section-label mb-4">Our Story</p>
          <h1 className="font-orbitron font-black text-5xl sm:text-7xl text-white mb-6">
            Electrifying the <span className="gradient-text">Philippines</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-3xl mx-auto leading-relaxed">
            TRIP Mobility was founded on a simple but powerful belief: that every Filipino deserves access to premium, sustainable, and economically smart transportation. We started in 2020 with a single model and a vision to transform how the Philippines moves.
          </p>
        </div>
      </section>

      {/* Mission / Vision */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Target,
                title: "Our Mission",
                desc: "Deliver the highest quality electric bikes at competitive prices while providing exceptional customer service and after-sales support — making e-mobility accessible to every Filipino.",
                color: "text-[#39FF14]",
              },
              {
                icon: Eye,
                title: "Our Vision",
                desc: "To be the Philippines' most trusted e-mobility brand by 2030 — with 100,000 TRIP e-bikes replacing petrol vehicles on Philippine roads.",
                color: "text-[#00FFFF]",
              },
              {
                icon: Heart,
                title: "Our Values",
                desc: "Quality without compromise. Innovation in every iteration. Customer success as our metric. Sustainability as our responsibility to the Philippines.",
                color: "text-purple-400",
              },
            ].map((item, i) => (
              <SectionObserver key={i} delay={i * 120}>
                <div className="glass rounded-2xl p-8 border border-white/5 hover:border-white/15 transition-all h-full">
                  <item.icon className={`w-8 h-8 ${item.color} mb-5`} />
                  <h3 className="font-orbitron font-bold text-xl text-white mb-3">{item.title}</h3>
                  <p className="text-gray-400 leading-relaxed text-sm">{item.desc}</p>
                </div>
              </SectionObserver>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-24 bg-[#0D0D0D]">
        <div className="max-w-4xl mx-auto px-6">
          <SectionObserver>
            <div className="text-center mb-16">
              <p className="section-label mb-3">Milestones</p>
              <h2 className="font-orbitron font-bold text-4xl text-white">
                Our <span className="gradient-text">Journey</span>
              </h2>
            </div>
          </SectionObserver>
          <div className="relative">
            <div className="absolute left-[7px] md:left-1/2 md:-translate-x-px top-0 bottom-0 w-px bg-gradient-to-b from-[#39FF14]/50 via-[#39FF14]/20 to-transparent" />
            <div className="space-y-8">
              {TIMELINE.map((item, i) => (
                <SectionObserver key={i} delay={i * 80}>
                  <div className={`relative flex gap-8 ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"} flex-row`}>
                    {/* Dot */}
                    <div className="absolute left-0 md:left-1/2 md:-translate-x-1/2 top-4 w-4 h-4 rounded-full bg-[#39FF14] border-2 border-[#0A0A0A] shadow-[0_0_10px_#39FF14] z-10" />
                    {/* Content */}
                    <div className={`pl-10 md:pl-0 ${i % 2 === 0 ? "md:text-right md:pr-12 md:w-1/2" : "md:text-left md:pl-12 md:w-1/2 md:ml-auto"} w-full`}>
                      <div className="glass rounded-xl p-5 border border-white/5 hover:border-[#39FF14]/20 transition-all inline-block w-full md:max-w-xs">
                        <span className="text-[#39FF14] font-orbitron font-black text-xl">{item.year}</span>
                        <h4 className="font-bold text-white mt-1 mb-2">{item.title}</h4>
                        <p className="text-gray-400 text-sm">{item.desc}</p>
                      </div>
                    </div>
                  </div>
                </SectionObserver>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Awards */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <SectionObserver>
            <div className="text-center mb-12">
              <p className="section-label mb-3">Recognition</p>
              <h2 className="font-orbitron font-bold text-4xl text-white">
                Awards & <span className="gradient-text">Achievements</span>
              </h2>
            </div>
          </SectionObserver>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Award, title: "Best EV Brand 2024", org: "Philippine Automotive Industry Awards" },
              { icon: TrendingUp, title: "Top Startup 2023", org: "Startup Philippines Summit" },
              { icon: Zap, title: "Green Innovation Award", org: "DENR Environmental Awards" },
              { icon: Users, title: "Best B2B Product", org: "Entrepreneur Philippines" },
            ].map((award, i) => (
              <SectionObserver key={i} delay={i * 100}>
                <div className="glass rounded-xl p-6 text-center border border-white/5 hover:border-[#39FF14]/20 transition-all">
                  <award.icon className="w-8 h-8 text-[#39FF14] mx-auto mb-3" />
                  <p className="font-bold text-white text-sm mb-1">{award.title}</p>
                  <p className="text-xs text-gray-500">{award.org}</p>
                </div>
              </SectionObserver>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-24 bg-[#0D0D0D]">
        <div className="max-w-7xl mx-auto px-6">
          <SectionObserver>
            <div className="text-center mb-12">
              <p className="section-label mb-3">Leadership</p>
              <h2 className="font-orbitron font-bold text-4xl text-white">
                The <span className="gradient-text">Team</span> Behind TRIP
              </h2>
            </div>
          </SectionObserver>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {TEAM.map((member, i) => (
              <SectionObserver key={i} delay={i * 100}>
                <div className="glass rounded-xl p-6 text-center border border-white/5 hover:border-[#39FF14]/20 transition-all">
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${member.bg} mx-auto mb-4 flex items-center justify-center text-2xl font-bold text-white font-orbitron`}>
                    {member.name[0]}
                  </div>
                  <p className="font-bold text-white text-sm mb-1">{member.name}</p>
                  <p className="text-xs text-gray-500">{member.title}</p>
                </div>
              </SectionObserver>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 text-center">
        <SectionObserver>
          <p className="section-label mb-4 text-center">Join the Movement</p>
          <h2 className="font-orbitron font-bold text-4xl text-white mb-6">
            Ready to Ride with <span className="gradient-text">TRIP</span>?
          </h2>
          <Link to="/contact" className="btn-primary inline-flex items-center gap-2">
            Talk to Our Team <ArrowRight className="w-4 h-4" />
          </Link>
        </SectionObserver>
      </section>
    </div>
  );
}
