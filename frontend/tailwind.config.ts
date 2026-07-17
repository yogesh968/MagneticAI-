import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Both are self-hosted by next/font in app/layout.tsx, which exposes them
        // as these CSS variables on <html>.
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        tight: ["var(--font-inter-tight)", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        // The single accent. Mirrors --accent in globals.css; kept as a scale so
        // utilities like text-accent-600 / bg-accent-50 resolve statically.
        accent: {
          50: "#EEF3FF",
          100: "#DBE5FF",
          200: "#BDCEFF",
          400: "#6C93FF",
          500: "#2F6BFF",
          600: "#1E55E0",
          700: "#1743B4",
          800: "#13358C",
          900: "#112B6E",
        },
        ink: {
          DEFAULT: "#0A0A0B",
          soft: "#2A2A2E",
          muted: "#6B6B70",
          faint: "#9A9AA0",
        },
        canvas: "#FBFAF8",
        sunken: "#F5F3EF",
        hairline: {
          DEFAULT: "#E8E6E1",
          strong: "#D9D6CF",
        },
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(20 20 25 / 0.04)",
        card: "0 1px 3px 0 rgb(20 20 25 / 0.05), 0 0 0 1px rgb(20 20 25 / 0.02)",
        "card-md": "0 4px 16px 0 rgb(20 20 25 / 0.07), 0 0 0 1px rgb(20 20 25 / 0.03)",
        "card-lg": "0 8px 40px 0 rgb(20 20 25 / 0.09), 0 0 0 1px rgb(20 20 25 / 0.04)",
        accent: "0 10px 22px -12px rgb(47 107 255 / 0.65)",
        "accent-lg": "0 14px 30px -12px rgb(47 107 255 / 0.55)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.375rem",
      },
      animation: {
        "fade-up": "fadeUp .18s cubic-bezier(0.16,1,0.3,1) both",
        "fade-in": "fadeIn .15s ease both",
        "scale-up": "scaleUp .16s cubic-bezier(0.16,1,0.3,1) both",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        scaleUp: {
          from: { opacity: "0", transform: "scale(0.98)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
