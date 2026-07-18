import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // All three are self-hosted by next/font in app/layout.tsx, which exposes
        // them as these CSS variables on <html>.
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        tight: ["var(--font-inter-tight)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      colors: {
        // The single accent — royal indigo-blue. Mirrors --accent in globals.css;
        // kept as a scale so utilities like text-accent-600 / bg-accent-50 resolve
        // statically.
        accent: {
          50: "#ECEEFC",
          100: "#DCE0FA",
          200: "#BFC6F4",
          400: "#7E8BEC",
          500: "#4453D6",
          600: "#3341C0",
          700: "#2A359E",
          800: "#232C82",
          900: "#1F2769",
        },
        paper: {
          DEFAULT: "#EEF0FB",
          deep: "#E5E8FA",
        },
        ink: {
          DEFAULT: "#12142A",
          soft: "#3A3D52",
          muted: "#6C7086",
          faint: "#A2A6BC",
        },
        canvas: "#F5F6FB",
        sunken: "#F1F2F9",
        hairline: {
          DEFAULT: "#E8E9F3",
          strong: "#DADCEB",
        },
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(20 20 25 / 0.04)",
        card: "0 1px 3px 0 rgb(20 20 25 / 0.05), 0 0 0 1px rgb(20 20 25 / 0.02)",
        "card-md": "0 4px 16px 0 rgb(20 20 25 / 0.07), 0 0 0 1px rgb(20 20 25 / 0.03)",
        "card-lg": "0 8px 40px 0 rgb(20 20 25 / 0.09), 0 0 0 1px rgb(20 20 25 / 0.04)",
        accent: "0 10px 22px -12px rgb(68 83 214 / 0.65)",
        "accent-lg": "0 14px 30px -12px rgb(68 83 214 / 0.55)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.375rem",
      },
      animation: {
        "fade-up": "fadeUp .18s cubic-bezier(0.16,1,0.3,1) both",
        "fade-in": "fadeIn .15s ease both",
        "scale-up": "scaleUp .16s cubic-bezier(0.16,1,0.3,1) both",
        float: "floaty 5s ease-in-out infinite",
        "spin-slow": "orbSpin 18s linear infinite",
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
