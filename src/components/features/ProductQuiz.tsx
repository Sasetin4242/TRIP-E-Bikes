import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Check, Sparkles, HelpCircle, ArrowRight, ArrowLeft, RefreshCw, Zap, Shield, HelpCircle as InfoIcon } from "lucide-react";
import { PRODUCTS } from "@/constants/products";
import type { Product } from "@/types";

interface Question {
  id: number;
  text: string;
  options: {
    value: string;
    label: string;
    description: string;
    icon: string;
  }[];
}

const QUIZ_QUESTIONS: Question[] = [
  {
    id: 1,
    text: "What is your primary use case for an e-bike?",
    options: [
      { value: "delivery", label: "Business & Delivery", description: "Carrying cargo, long delivery shifts, high-mileage utility.", icon: "📦" },
      { value: "commute", label: "Daily Urban Commuting", description: "Getting to work/school, navigating city traffic, easy storage.", icon: "🌆" },
      { value: "adventure", label: "Off-Road & Adventure", description: "Trail riding, weekend exploration, conquering steep hills.", icon: "🏔️" },
    ],
  },
  {
    id: 2,
    text: "What is your typical daily range requirement?",
    options: [
      { value: "short", label: "Under 45 km", description: "Quick trips around the neighborhood or short commutes.", icon: "🔋" },
      { value: "medium", label: "45 to 80 km", description: "Standard city commuting and occasional longer rides.", icon: "🔋🔋" },
      { value: "long", label: "Over 80 km", description: "Continuous driving all day or very long distance commutes.", icon: "⚡" },
    ],
  },
  {
    id: 3,
    text: "What type of terrain will you encounter most often?",
    options: [
      { value: "flat", label: "Flat paved roads", description: "Smooth city streets, bike lanes, and highways.", icon: "🛣️" },
      { value: "rough", label: "Rough city roads & potholes", description: "Standard Philippine city roads, sudden obstacles, and rain.", icon: "🚧" },
      { value: "offroad", label: "Steep hills & unpaved trails", description: "Mountain paths, steep inclines, loose gravel, and dirt.", icon: "🚵" },
    ],
  },
  {
    id: 4,
    text: "What is your top priority for the e-bike?",
    options: [
      { value: "payload", label: "Cargo capacity & payload", description: "Carrying passengers or heavy loads up to 180kg.", icon: "💪" },
      { value: "portability", label: "Compactness & portability", description: "Folding structure, fits in car trunk/office, lightweight.", icon: "🎒" },
      { value: "power", label: "Maximum speed & raw power", description: "Fast acceleration, climbing power, and high speed.", icon: "🔥" },
    ],
  },
];

export default function ProductQuiz() {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<Product | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string>("");
  const [errorOccurred, setErrorOccurred] = useState(false);

  const handleSelectOption = (stepId: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [stepId]: value }));
  };

  const handleNext = () => {
    if (currentStep < QUIZ_QUESTIONS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      generateRecommendation();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const getDeterministicFallback = (): { product: Product; explanation: string } => {
    const primaryUse = answers[1];
    const priority = answers[4];

    let recommendedId = "delivery-ebike";
    let explanation = "";

    if (primaryUse === "delivery" || priority === "payload") {
      recommendedId = "delivery-ebike";
      explanation = "Based on your focus on business, cargo transport, or high-capacity carrying needs, the TRIP Cargo Pro is your perfect match. It features a heavy-duty frame, rated for 180kg payload, and a dual-battery system offering 100-120km range.";
    } else if (primaryUse === "commute" && priority === "portability") {
      recommendedId = "folding-ebike";
      explanation = "Since portability, ease of storage, and urban commuting are your top priorities, the TRIP Fold X is recommended. Its rapid 5-second folding mechanism allows you to store it in small office spaces or car trunks with absolute ease.";
    } else if (primaryUse === "adventure" || priority === "power" || answers[3] === "offroad") {
      recommendedId = "mountain-ebike";
      explanation = "For trail adventure, rough terrain handling, and steep climbing power, the TRIP Ranger 750 is your ideal partner. Its high-torque 750W motor and fat tires deliver unmatched power and traction to tackle rough roads easily.";
    } else {
      // Default fallback if mix of things
      recommendedId = "folding-ebike";
      explanation = "The versatile TRIP Fold X matches your requirements best. It combines active front suspension with dual fat tires to navigate bumpy urban roads while maintaining portable convenience.";
    }

    const matchedProduct = PRODUCTS.find((p) => p.id === recommendedId) || PRODUCTS[0];
    return { product: matchedProduct, explanation };
  };

  const generateRecommendation = async () => {
    setLoading(true);
    setErrorOccurred(false);

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    // Setup prompts
    const promptText = `
      You are an expert e-bike advisor for 'TRIP E-Bikes', a brand engineered specifically for Philippine roads.
      Here are the available models:
      1. TRIP Cargo Pro (id: delivery-ebike): 500W motor, 100-120km range (dual batteries), 180kg cargo capacity, heavy-duty rear rack. Best for food delivery, cargo, long shifts. Price: ₱65,000.
      2. TRIP Fold X (id: folding-ebike): 500W motor, 40-50km range, 5-second folding mechanism, 120kg capacity, fat tires. Best for urban commuting, multi-modal transport, office/apartment storage. Price: ₱57,000.
      3. TRIP Ranger 750 (id: mountain-ebike): 750W high-torque motor, 50-60km range, 150kg capacity, mountain frame, fat tires. Best for off-road, hills, speed, rough adventure. Price: ₱59,000.

      The customer answered these questions:
      - Primary Use Case: ${answers[1]} (options: delivery, commute, adventure)
      - Daily Range Needed: ${answers[2]} (options: short/under 45km, medium/45-80km, long/over 80km)
      - Primary Terrain: ${answers[3]} (options: flat city streets, rough potholes, offroad/hills)
      - Main Priority: ${answers[4]} (options: payload, portability, power)

      Recommend exactly ONE of the three bike IDs: "delivery-ebike", "folding-ebike", or "mountain-ebike".
      Provide a personalized, engaging response in the following strict JSON format:
      {
        "recommended_id": "one of: delivery-ebike, folding-ebike, mountain-ebike",
        "explanation": "2-3 sentences explaining exactly why this model fits their specific answers, addressing their terrain, range, and use case in a friendly, conversational tone."
      }
      Do not return anything other than this JSON string.
    `;

    try {
      if (!apiKey) {
        throw new Error("API Key missing");
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: promptText }] }],
        generationConfig: { responseMimeType: "application/json" }
      });
      
      const text = result.response.text();
      const data = JSON.parse(text);
      
      const matchedProduct = PRODUCTS.find((p) => p.id === data.recommended_id);
      if (matchedProduct) {
        setRecommendation(matchedProduct);
        setAiExplanation(data.explanation);
      } else {
        throw new Error("Invalid ID returned");
      }
    } catch (err) {
      console.warn("Gemini AI failed or not configured, using local fallback recommendation:", err);
      const fallback = getDeterministicFallback();
      setRecommendation(fallback.product);
      setAiExplanation(fallback.explanation);
      setErrorOccurred(true);
    } finally {
      setLoading(false);
    }
  };

  const resetQuiz = () => {
    setCurrentStep(0);
    setAnswers({});
    setRecommendation(null);
    setAiExplanation("");
    setErrorOccurred(false);
  };

  const progressPercent = ((currentStep + 1) / QUIZ_QUESTIONS.length) * 100;
  const currentQuestion = QUIZ_QUESTIONS[currentStep];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <div className="glass-green rounded-2xl p-6 md:p-10 border border-[#39FF14]/15 relative overflow-hidden shadow-[0_0_50px_rgba(57,255,20,0.05)]">
        {/* Glow effect */}
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-[#39FF14]/5 blur-3xl pointer-events-none" />
        
        <div className="relative">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-[#39FF14]/10 border border-[#39FF14]/25 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#39FF14]" />
            </div>
            <div>
              <h3 className="font-orbitron font-black text-lg md:text-xl text-white uppercase tracking-wider">
                E-Bike Configurator
              </h3>
              <p className="text-xs text-gray-400">Gemini-driven recommendation system</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center justify-center py-16 text-center"
              >
                <RefreshCw className="w-12 h-12 text-[#39FF14] animate-spin mb-4" />
                <h4 className="font-orbitron text-white font-bold text-lg mb-2">Analyzing Riding Profile...</h4>
                <p className="text-sm text-gray-500 max-w-md">
                  Processing your requirements with Gemini AI to find your perfect TRIP E-Bike model...
                </p>
              </motion.div>
            ) : recommendation ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", damping: 25 }}
                className="space-y-8"
              >
                <div className="text-center">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#39FF14]/10 border border-[#39FF14]/30 text-xs font-bold text-[#39FF14] mb-3">
                    <Sparkles className="w-3 h-3" />
                    AI Recommendation
                  </div>
                  <h4 className="font-orbitron text-2xl md:text-3xl font-black text-white">
                    You should ride the <span className="text-[#39FF14]">{recommendation.name}</span>
                  </h4>
                  <p className="text-gray-400 mt-1 italic text-sm">{recommendation.tagline}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch mt-6">
                  {/* Bike Image Card */}
                  <div className="relative rounded-xl border border-white/10 overflow-hidden bg-white/2 flex flex-col justify-between">
                    <img
                      src={recommendation.image}
                      alt={recommendation.name}
                      className="w-full h-48 object-cover border-b border-white/5"
                    />
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400 font-bold uppercase tracking-wider">
                            {recommendation.category}
                          </span>
                          <span className="font-orbitron text-sm font-bold text-[#39FF14]">
                            ₱{recommendation.price.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 line-clamp-3 leading-relaxed">
                          {recommendation.description}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-4 text-[11px] border-t border-white/5 pt-3">
                        <div>
                          <span className="text-gray-600">Top Speed:</span>{" "}
                          <span className="text-gray-300 font-semibold">{recommendation.specs.topSpeed}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Range:</span>{" "}
                          <span className="text-gray-300 font-semibold">{recommendation.specs.range}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Motor:</span>{" "}
                          <span className="text-gray-300 font-semibold truncate block">{recommendation.specs.motor}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Payload:</span>{" "}
                          <span className="text-gray-300 font-semibold">{recommendation.specs.payload}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AI Explanation / Specs */}
                  <div className="flex flex-col justify-between space-y-6">
                    <div className="bg-white/2 border border-white/10 rounded-xl p-5 relative">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2.5 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-[#39FF14]" /> Why this fits you
                      </h5>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        {aiExplanation}
                      </p>
                      {errorOccurred && (
                        <div className="mt-3 text-[10px] text-gray-500 flex items-center gap-1">
                          <InfoIcon className="w-3 h-3 text-gray-500 shrink-0" />
                          Running in robust local optimization mode.
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <a
                        href={`/products#${recommendation.id}`}
                        className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#39FF14] text-[#0A0A0A] hover:bg-[#32e610] font-bold text-sm tracking-wide transition-all shadow-[0_0_20px_rgba(57,255,20,0.15)]"
                      >
                        Explore Bike Details
                        <ArrowRight className="w-4 h-4" />
                      </a>
                      <button
                        onClick={resetQuiz}
                        className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg border border-white/10 hover:border-white/20 text-gray-400 hover:text-white font-medium text-sm transition-all"
                      >
                        Retake Configuration Quiz
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="quiz"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-8"
              >
                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                    <span>Question {currentStep + 1} of {QUIZ_QUESTIONS.length}</span>
                    <span>{Math.round(progressPercent)}% Complete</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <motion.div
                      className="h-full bg-gradient-to-r from-[#39FF14] to-[#00FFFF]"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ type: "spring", stiffness: 70 }}
                    />
                  </div>
                </div>

                {/* Question Text */}
                <div>
                  <h4 className="font-orbitron text-xl md:text-2xl font-bold text-white tracking-wide leading-snug">
                    {currentQuestion.text}
                  </h4>
                </div>

                {/* Options list */}
                <div className="grid grid-cols-1 gap-4">
                  {currentQuestion.options.map((option) => {
                    const isSelected = answers[currentQuestion.id] === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() => handleSelectOption(currentQuestion.id, option.value)}
                        className={`w-full flex items-start gap-4 p-4 rounded-xl border text-left transition-all duration-300 hover:bg-white/2 ${
                          isSelected
                            ? "bg-[#39FF14]/10 border-[#39FF14] shadow-[0_0_15px_rgba(57,255,20,0.1)]"
                            : "bg-white/1 border-white/10"
                        }`}
                      >
                        <span className="text-2xl pt-0.5">{option.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm ${isSelected ? "text-[#39FF14]" : "text-white"}`}>
                            {option.label}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                            {option.description}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-[#39FF14] flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 text-[#0A0A0A] stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Footer buttons */}
                <div className="flex items-center justify-between border-t border-white/5 pt-6">
                  <button
                    onClick={handlePrev}
                    disabled={currentStep === 0}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all border border-white/10 ${
                      currentStep === 0
                        ? "opacity-30 cursor-not-allowed text-gray-600"
                        : "text-gray-400 hover:text-white hover:border-white/20"
                    }`}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={!answers[currentQuestion.id]}
                    className={`flex items-center gap-1.5 px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                      answers[currentQuestion.id]
                        ? "bg-[#39FF14] text-[#0A0A0A] hover:bg-[#32e610] shadow-[0_0_15px_rgba(57,255,20,0.15)]"
                        : "bg-white/5 text-gray-600 cursor-not-allowed border border-white/5"
                    }`}
                  >
                    {currentStep === QUIZ_QUESTIONS.length - 1 ? "Get Recommendation" : "Next"}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
