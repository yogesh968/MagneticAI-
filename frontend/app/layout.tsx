import type { Metadata } from "next";
import { Inter, Inter_Tight, JetBrains_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { NavProgress } from "@/components/brand/NavProgress";
import "./globals.css";

// Self-hosted at build time: no render-blocking round trip to Google, and no
// swap flash. The whole type scale is tuned for these three — a fallback breaks it.
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });
const interTight = Inter_Tight({ subsets: ["latin"], display: "swap", variable: "--font-inter-tight" });
// The technical/spec-sheet voice: monospace micro-labels, IDs, corner metadata.
const jetBrainsMono = JetBrains_Mono({ subsets: ["latin"], display: "swap", variable: "--font-mono" });

export const metadata: Metadata = {
  title: { default: "Astrex.ai", template: "%s · Astrex.ai" },
  description: "AI-powered multi-tenant customer support platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full ${inter.variable} ${interTight.variable} ${jetBrainsMono.variable}`}>
      <body className="h-full">
        <NavProgress />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              borderRadius: "12px",
              fontSize: "14px",
              fontFamily: "var(--font-inter), Inter, system-ui, sans-serif",
              border: "1px solid #E8E6E1",
              boxShadow: "0 8px 30px rgb(0,0,0,0.12)",
            },
            success: { iconTheme: { primary: "#0F9D63", secondary: "#fff" } },
            error: { iconTheme: { primary: "#DC2626", secondary: "#fff" } },
          }}
        />
        {children}
      </body>
    </html>
  );
}
