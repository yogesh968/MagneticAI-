import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
      colors: {
        brand: {
          50: "#eff6ff", 100: "#dbeafe", 200: "#bfdbfe",
          400: "#60a5fa", 500: "#3b82f6", 600: "#2563eb",
          700: "#1d4ed8", 800: "#1e40af", 900: "#1e3a8a",
        },
      },
      boxShadow: {
        "xs":      "0 1px 2px 0 rgb(0 0 0 / 0.04)",
        "card":    "0 1px 3px 0 rgb(0 0 0 / 0.05), 0 0 0 1px rgb(0 0 0 / 0.02)",
        "card-md": "0 4px 16px 0 rgb(0 0 0 / 0.08), 0 0 0 1px rgb(0 0 0 / 0.03)",
        "card-lg": "0 8px 40px 0 rgb(0 0 0 / 0.10), 0 0 0 1px rgb(0 0 0 / 0.04)",
        "blue":    "0 2px 8px 0 rgb(37 99 235 / 0.30)",
        "blue-lg": "0 4px 16px 0 rgb(37 99 235 / 0.35)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.375rem",
      },
      animation: {
        "fade-up":  "fadeUp .30s cubic-bezier(0.16,1,0.3,1) both",
        "fade-in":  "fadeIn .25s ease both",
        "scale-up": "scaleUp .22s cubic-bezier(0.16,1,0.3,1) both",
      },
      keyframes: {
        fadeUp:  { from: { opacity: "0", transform: "translateY(12px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        fadeIn:  { from: { opacity: "0" },                                to: { opacity: "1" } },
        scaleUp: { from: { opacity: "0", transform: "scale(0.95)" },      to: { opacity: "1", transform: "scale(1)" } },
      },
    },
  },
  plugins: [],
} satisfies Config;
