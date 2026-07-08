import { useState, useEffect, useRef } from "react";
import { Users, Fuel, MapPin, TrendingUp, Leaf, Calendar, Zap } from "lucide-react";

function useCountUp(target: number, duration = 1200, trigger: boolean) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setValue(target);
        clearInterval(timer);
      } else {
        setValue(Math.round(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, trigger, duration]);
  return value;
}

export default function FleetROICalculator() {
  const [riders, setRiders] = useState(10);
  const [fuelPerDay, setFuelPerDay] = useState(350); // PHP per rider
  const [kmPerDay, setKmPerDay] = useState(80);
  const [animated, setAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // E-bike cost per km ≈ ₱0.50 (electricity), motorbike ≈ fuel/km
  const fuelCostPerKm = fuelPerDay / kmPerDay;
  const ebikeCostPerKm = 0.5;
  const savingsPerRiderPerDay = fuelPerDay - ebikeCostPerKm * kmPerDay;
  const monthlySavings = savingsPerRiderPerDay * riders * 26; // 26 working days
  const annualSavings = monthlySavings * 12;

  // ROI: average fleet cost ₱65,000/bike
  const avgBikePrice = 65000;
  const totalFleetCost = avgBikePrice * riders;
  const roiMonths = monthlySavings > 0 ? Math.ceil(totalFleetCost / monthlySavings) : 99;

  // CO2: petrol motorbike ~2.4kg/100km
  const co2SavedPerMonth = (2.4 / 100) * kmPerDay * 26 * riders;
  const co2SavedAnnual = co2SavedPerMonth * 12;

  const displaySavings = useCountUp(monthlySavings, 1000, animated);
  const displayAnnual = useCountUp(annualSavings, 1100, animated);
  const displayCO2 = useCountUp(Math.round(co2SavedAnnual), 1200, animated);
  const displayROI = useCountUp(roiMonths > 60 ? 60 : roiMonths, 900, animated);

  useEffect(() => {
    setAnimated(false);
    const timer = setTimeout(() => setAnimated(true), 80);
    return () => clearTimeout(timer);
  }, [riders, fuelPerDay, kmPerDay]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setAnimated(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const petrolMonthlyCost = fuelPerDay * riders * 26;
  const ebikeMonthlyCost = ebikeCostPerKm * kmPerDay * riders * 26;
  const maxBar = petrolMonthlyCost;
  const petrolWidth = 100;
  const ebikeWidth = maxBar > 0 ? Math.min(100, (ebikeMonthlyCost / maxBar) * 100) : 0;

  return (
    <div ref={ref} className="glass rounded-2xl border border-white/5 overflow-hidden">
      <div className="px-8 py-6 border-b border-white/5 bg-gradient-to-r from-[#39FF14]/5 to-transparent">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-[#39FF14]/15 border border-[#39FF14]/20 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-[#39FF14]" />
          </div>
          <h3 className="font-orbitron font-bold text-xl text-white">Fleet ROI Calculator</h3>
        </div>
        <p className="text-gray-500 text-sm">See your exact savings when switching your fleet to TRIP E-Bikes</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-white/5">
        {/* Inputs */}
        <div className="p-8 space-y-7">
          <div>
            <label className="flex items-center gap-2 text-xs text-gray-400 mb-3 uppercase tracking-widest font-medium">
              <Users className="w-3.5 h-3.5 text-[#39FF14]" />
              Number of Riders / Bikes
              <span className="ml-auto font-orbitron font-bold text-white text-base">{riders}</span>
            </label>
            <input
              type="range" min={1} max={100} step={1} value={riders}
              onChange={(e) => setRiders(Number(e.target.value))}
              className="w-full accent-[#39FF14] h-1.5 rounded-full"
            />
            <div className="flex justify-between text-[10px] text-gray-600 mt-1">
              <span>1 rider</span><span>50</span><span>100 riders</span>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs text-gray-400 mb-3 uppercase tracking-widest font-medium">
              <Fuel className="w-3.5 h-3.5 text-[#39FF14]" />
              Current Fuel Cost / Rider / Day (PHP)
              <span className="ml-auto font-orbitron font-bold text-white text-base">₱{fuelPerDay}</span>
            </label>
            <input
              type="range" min={100} max={800} step={25} value={fuelPerDay}
              onChange={(e) => setFuelPerDay(Number(e.target.value))}
              className="w-full accent-[#39FF14] h-1.5 rounded-full"
            />
            <div className="flex justify-between text-[10px] text-gray-600 mt-1">
              <span>₱100</span><span>₱400</span><span>₱800</span>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs text-gray-400 mb-3 uppercase tracking-widest font-medium">
              <MapPin className="w-3.5 h-3.5 text-[#39FF14]" />
              Daily Distance per Rider (km)
              <span className="ml-auto font-orbitron font-bold text-white text-base">{kmPerDay} km</span>
            </label>
            <input
              type="range" min={20} max={150} step={5} value={kmPerDay}
              onChange={(e) => setKmPerDay(Number(e.target.value))}
              className="w-full accent-[#39FF14] h-1.5 rounded-full"
            />
            <div className="flex justify-between text-[10px] text-gray-600 mt-1">
              <span>20 km</span><span>80 km</span><span>150 km</span>
            </div>
          </div>

          {/* Bar chart comparison */}
          <div className="p-5 rounded-xl bg-white/2 border border-white/5">
            <p className="text-xs text-gray-400 uppercase tracking-widest font-medium mb-4">Monthly Cost Comparison</p>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                    Petrol Fleet
                  </span>
                  <span className="text-xs font-semibold text-red-400">₱{petrolMonthlyCost.toLocaleString()}/mo</span>
                </div>
                <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-700"
                    style={{ width: `${petrolWidth}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#39FF14] inline-block" />
                    TRIP E-Bike Fleet
                  </span>
                  <span className="text-xs font-semibold text-[#39FF14]">₱{Math.round(ebikeMonthlyCost).toLocaleString()}/mo</span>
                </div>
                <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#39FF14] to-[#4FFF2A] rounded-full transition-all duration-700"
                    style={{ width: `${ebikeWidth}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="p-8 flex flex-col gap-5">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-medium mb-1">Your Projected Results</p>

          <div className="glass-green rounded-xl p-5 border border-[#39FF14]/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#39FF14]/8 rounded-full blur-xl" />
            <p className="text-xs text-[#39FF14] uppercase tracking-widest font-semibold mb-1">Monthly Savings</p>
            <p className="font-orbitron font-black text-4xl text-[#39FF14]">
              ₱{displaySavings.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-1">across {riders} rider{riders > 1 ? "s" : ""} · 26 working days</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="glass rounded-xl p-4 text-center border border-white/5">
              <TrendingUp className="w-4 h-4 text-[#39FF14] mx-auto mb-2" />
              <p className="font-orbitron font-bold text-lg text-white">₱{(displayAnnual / 1000).toFixed(0)}K</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Annual Savings</p>
            </div>
            <div className="glass rounded-xl p-4 text-center border border-white/5">
              <Calendar className="w-4 h-4 text-[#39FF14] mx-auto mb-2" />
              <p className="font-orbitron font-bold text-lg text-white">
                {roiMonths > 60 ? "60+" : displayROI} <span className="text-sm">mo</span>
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">ROI Breakeven</p>
            </div>
            <div className="glass rounded-xl p-4 text-center border border-white/5">
              <Leaf className="w-4 h-4 text-green-400 mx-auto mb-2" />
              <p className="font-orbitron font-bold text-lg text-white">{displayCO2 > 1000 ? `${(displayCO2 / 1000).toFixed(1)}t` : `${displayCO2}kg`}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">CO₂ Saved/Year</p>
            </div>
          </div>

          {/* Breakdown */}
          <div className="space-y-2">
            {[
              { label: "Savings per rider / day", value: `₱${Math.round(savingsPerRiderPerDay).toLocaleString()}` },
              { label: "Total fleet investment", value: `₱${totalFleetCost.toLocaleString()}` },
              { label: "E-bike energy cost / km", value: "₱0.50" },
              { label: "Payback period", value: roiMonths > 60 ? "60+ months" : `${roiMonths} months` },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-xs text-gray-500">{item.label}</span>
                <span className="text-xs font-semibold text-white">{item.value}</span>
              </div>
            ))}
          </div>

          <div className="mt-auto p-4 rounded-xl bg-[#39FF14]/5 border border-[#39FF14]/15">
            <p className="text-xs text-gray-400 leading-relaxed">
              <span className="text-[#39FF14] font-semibold">Based on:</span> TRIP e-bike electricity cost of ₱0.50/km vs current petrol spend.
              Calculations assume 26 working days/month. Actual savings may vary.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
