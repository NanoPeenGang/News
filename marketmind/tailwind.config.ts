import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#070A10",
          900: "#0B0F17",
          850: "#0E1420",
          800: "#121A28",
          700: "#1A2436",
          600: "#243247",
          500: "#33455F",
        },
        mist: {
          100: "#F2F5FA",
          200: "#D7DEE9",
          300: "#AAB6C8",
          400: "#7C8AA0",
          500: "#5B6980",
        },
        teal: {
          glow: "#2DD4BF",
          soft: "#14B8A6",
          dim: "#0D9488",
        },
        profit: "#22C55E",
        loss: "#EF4444",
        amber: { warn: "#F59E0B" },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "'SF Mono'", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 24px rgba(45, 212, 191, 0.15)",
        card: "0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px rgba(0,0,0,0.35)",
      },
      backdropBlur: { xs: "2px" },
      animation: {
        "fade-in": "fadeIn 0.35s ease-out",
        "slide-up": "slideUp 0.35s ease-out",
        "pulse-dot": "pulseDot 1.6s ease-in-out infinite",
        shimmer: "shimmer 1.8s linear infinite",
        "flash-up": "flashUp 0.7s ease-out",
        "flash-down": "flashDown 0.7s ease-out",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
        shimmer: {
          from: { backgroundPosition: "200% 0" },
          to: { backgroundPosition: "-200% 0" },
        },
        flashUp: {
          "0%": { backgroundColor: "rgba(34,197,94,0.25)" },
          "100%": { backgroundColor: "transparent" },
        },
        flashDown: {
          "0%": { backgroundColor: "rgba(239,68,68,0.25)" },
          "100%": { backgroundColor: "transparent" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
