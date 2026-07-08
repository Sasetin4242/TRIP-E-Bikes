import { Link } from "react-router-dom";
import { Zap, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="text-center px-6">
        <Zap className="w-16 h-16 text-[#39FF14] mx-auto mb-6 animate-float" fill="#39FF14" />
        <h1 className="font-orbitron font-black text-8xl text-[#39FF14] mb-4">404</h1>
        <h2 className="font-orbitron font-bold text-2xl text-white mb-4">Page Not Found</h2>
        <p className="text-gray-400 mb-10 max-w-md mx-auto">
          Looks like this road doesn't exist. Let us get you back on track.
        </p>
        <div className="flex gap-4 justify-center">
          <Link to="/" className="btn-primary flex items-center gap-2">
            <Home className="w-4 h-4" /> Go Home
          </Link>
          <button onClick={() => window.history.back()} className="btn-outline flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
