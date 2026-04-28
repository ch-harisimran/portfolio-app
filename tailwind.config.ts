import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#3b82f6",
          dark: "#2563eb",
          light: "#60a5fa",
          faint: "rgba(59,130,246,0.08)",
        },
        surface: {
          DEFAULT: "#0a0f1e",
          card: "#111827",
          elevated: "#1f2937",
          border: "#1e2d40",
        },
        profit: "#10b981",
        loss: "#ef4444",
        warning: "#f59e0b",
        muted: "#6b7280",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "Consolas", "monospace"],
      },
      boxShadow: {
        "glow-brand": "0 0 20px rgba(59, 130, 246, 0.3), 0 0 60px rgba(59, 130, 246, 0.1)",
        "glow-brand-sm": "0 0 12px rgba(59, 130, 246, 0.25)",
        "glow-profit": "0 0 20px rgba(16, 185, 129, 0.25)",
        "glow-loss": "0 0 20px rgba(239, 68, 68, 0.25)",
        "glow-warning": "0 0 20px rgba(245, 158, 11, 0.25)",
        "card": "0 4px 24px rgba(0, 0, 0, 0.4), 0 1px 0 rgba(255,255,255,0.03) inset",
        "card-hover": "0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(59,130,246,0.2)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-brand": "linear-gradient(135deg, #3b82f6, #2563eb)",
        "gradient-profit": "linear-gradient(135deg, #10b981, #059669)",
        "gradient-loss": "linear-gradient(135deg, #ef4444, #dc2626)",
        "gradient-warning": "linear-gradient(135deg, #f59e0b, #d97706)",
        "gradient-purple": "linear-gradient(135deg, #8b5cf6, #7c3aed)",
        "gradient-card": "linear-gradient(145deg, rgba(31,41,55,0.8) 0%, rgba(17,24,39,0.9) 100%)",
        "gradient-mesh": "radial-gradient(at 20% 50%, rgba(59,130,246,0.08) 0px, transparent 60%), radial-gradient(at 80% 20%, rgba(16,185,129,0.06) 0px, transparent 60%), radial-gradient(at 50% 80%, rgba(139,92,246,0.04) 0px, transparent 60%)",
      },
      animation: {
        "fade-in": "fadeIn 0.35s ease-in-out",
        "fade-up": "fadeInUp 0.4s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 3s linear infinite",
        "float": "float 3s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        fadeInUp: { from: { opacity: "0", transform: "translateY(12px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        slideUp: { from: { transform: "translateY(8px)", opacity: "0" }, to: { transform: "translateY(0)", opacity: "1" } },
        float: { "0%, 100%": { transform: "translateY(0px)" }, "50%": { transform: "translateY(-6px)" } },
      },
    },
  },
  plugins: [],
};

export default config;
