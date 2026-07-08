import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        brand: {
          green: "#39FF14",
          lime: "#A8FF3E",
          cyan: "#00FFFF",
          black: "#0A0A0A",
          carbon: "#111111",
          graphite: "#1A1A1A",
          gray: "#2A2A2A",
          silver: "#C0C0C0",
        },
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        orbitron: ["Orbitron", "monospace"],
        inter: ["Inter", "sans-serif"],
      },
      backgroundImage: {
        "hero-gradient": "radial-gradient(ellipse at 50% 0%, rgba(57,255,20,0.15) 0%, transparent 60%), radial-gradient(ellipse at 100% 50%, rgba(0,255,255,0.08) 0%, transparent 50%), linear-gradient(180deg, #0A0A0A 0%, #111111 100%)",
        "card-gradient": "linear-gradient(135deg, rgba(57,255,20,0.05) 0%, rgba(0,255,255,0.03) 100%)",
        "section-gradient": "linear-gradient(180deg, #0A0A0A 0%, #111827 50%, #0A0A0A 100%)",
      },
      animation: {
        "fade-up": "fadeUp 0.8s ease forwards",
        "glow-pulse": "glowPulse 3s ease-in-out infinite",
        "float": "float 4s ease-in-out infinite",
        "spin-slow": "spin-slow 20s linear infinite",
      },
      boxShadow: {
        "neon-green": "0 0 20px rgba(57,255,20,0.4), 0 0 60px rgba(57,255,20,0.2)",
        "neon-cyan": "0 0 20px rgba(0,255,255,0.4), 0 0 60px rgba(0,255,255,0.2)",
        "glass": "0 8px 32px rgba(0,0,0,0.4)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
