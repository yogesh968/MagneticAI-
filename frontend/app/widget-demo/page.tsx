"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Code2, Copy, Check, ExternalLink } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
const DEMO_TENANT_ID = process.env.NEXT_PUBLIC_DEMO_TENANT_ID ?? "";

export default function WidgetDemoPage() {
  const [copied, setCopied] = useState(false);
  const [tenantId, setTenantId] = useState(DEMO_TENANT_ID);

  useEffect(() => {
    // Try to get tenantId from logged-in user
    try {
      const u = JSON.parse(localStorage.getItem("user") ?? "{}");
      if (u.tenantId) setTenantId(u.tenantId);
    } catch {}

    // Inject widget script
    if (!tenantId) return;
    const existing = document.getElementById("magnetic-widget-demo");
    if (existing) existing.remove();
    const script = document.createElement("script");
    script.id = "magnetic-widget-demo";
    script.src = `${API_URL}/widget.js`;
    script.setAttribute("data-tenant-id", tenantId);
    document.body.appendChild(script);
    return () => { script.remove(); };
  }, [tenantId]);

  const snippet = `<script\n  src="${API_URL}/widget.js"\n  data-tenant-id="${tenantId || "YOUR_TENANT_ID"}">\n</script>`;

  const copy = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white p-8">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-violet-600/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-2xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-8">
          <ArrowLeft size={14} /> Back to home
        </Link>

        <div className="mb-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 shadow-[0_4px_24px_0_rgb(124,58,237,0.4)] mx-auto mb-4">
            <Code2 size={24} className="text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Live Widget Demo</h1>
          <p className="mt-3 text-slate-400 max-w-md mx-auto">
            The chat widget below is powered by your Magentic AI backend.
            Click the chat icon in the bottom-right corner to test it.
          </p>
        </div>

        {/* Status */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Widget Config</p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">API URL</span>
              <span className="font-mono text-emerald-400">{API_URL}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Tenant ID</span>
              <span className="font-mono text-blue-400 truncate max-w-[200px]">
                {tenantId || <span className="text-amber-400">Not set — run seed first</span>}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Widget script</span>
              <a href={`${API_URL}/widget.js`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors">
                {API_URL}/widget.js <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>

        {/* Embed code */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Embed Code</p>
            <button
              onClick={copy}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20 transition-colors"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre className="rounded-xl bg-slate-900/80 border border-white/5 p-4 text-xs text-slate-300 overflow-x-auto whitespace-pre">
{snippet}
          </pre>
        </div>

        {/* Instructions */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">How to embed</p>
          <ol className="space-y-3 text-sm text-slate-400">
            {[
              "Run `npm run seed` to create the demo tenant and knowledge base",
              "Copy the embed code above and paste it before </body> on your website",
              "Replace YOUR_TENANT_ID with your actual tenant ID from the dashboard",
              "The widget will auto-load your bot settings and knowledge base",
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600/30 text-[10px] font-bold text-blue-400 mt-0.5">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {!tenantId && (
          <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-center">
            <p className="text-sm font-semibold text-amber-300">No tenant ID found</p>
            <p className="text-xs text-amber-400/80 mt-1">
              Run <code className="font-mono bg-amber-500/20 px-1.5 py-0.5 rounded">npm run seed</code> then sign in to see the live widget.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
