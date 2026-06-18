import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Magentic AI", template: "%s · Magentic AI" },
  description: "AI-powered multi-tenant customer support platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        <Toaster
          position="top-right"
          toastOptions={{
            style: { borderRadius: "12px", fontSize: "14px", fontFamily: "Inter, sans-serif", boxShadow: "0 8px 30px rgb(0,0,0,0.12)" },
            success: { iconTheme: { primary: "#22c55e", secondary: "#fff" } },
            error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
          }}
        />
        {children}
      </body>
    </html>
  );
}
