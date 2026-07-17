"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Code2, Copy, Check, ExternalLink } from "lucide-react";
import { readSessionHint } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
const DEMO_TENANT_ID = process.env.NEXT_PUBLIC_DEMO_TENANT_ID ?? "";

export default function WidgetDemoPage() {
  const [copied, setCopied] = useState(false);
  const [tenantId, setTenantId] = useState(DEMO_TENANT_ID);

  // Prefer the signed-in user's tenant over the build-time demo default.
  useEffect(() => {
    const hint = readSessionHint();
    if (hint?.tenantId) setTenantId(hint.tenantId);
  }, []);

  // Demo intentionally embeds by tenant, which loads that tenant's DEFAULT bot.
  // The dashboard's Widget page hands out per-bot data-bot-id snippets.
  useEffect(() => {
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

  const snippet = `<script\n  src="${API_URL}/widget.js"\n  data-bot-id="YOUR_BOT_ID">\n</script>`;

  const copy = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-ink via-ink-soft to-ink text-white p-8">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-ink/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-ink/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-2xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-ink-faint hover:text-white transition-colors mb-8">
          <ArrowLeft size={14} /> Back to home
        </Link>

        <div className="mb-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink shadow-accent mx-auto mb-4">
            <Code2 size={24} className="text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Live Widget Demo</h1>
          <p className="mt-3 text-ink-faint max-w-md mx-auto">
            The chat widget below is powered by your Magentic AI backend.
            Click the chat icon in the bottom-right corner to test it.
          </p>
        </div>

        {/* Status */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-ink-faint mb-3">Widget Config</p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-ink-faint">API URL</span>
              <span className="font-mono text-emerald-400">{API_URL}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-faint">Tenant ID</span>
              <span className="font-mono text-ink-faint truncate max-w-[200px]">
                {tenantId || <span className="text-amber-400">Not set — run seed first</span>}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-faint">Widget script</span>
              <a href={`${API_URL}/widget.js`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-ink-faint hover:text-white/80 transition-colors">
                {API_URL}/widget.js <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>

        {/* Embed code */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-widest text-ink-faint">Embed Code</p>
            <button
              onClick={copy}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20 transition-colors"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre className="rounded-xl bg-ink/80 border border-white/5 p-4 text-xs text-ink-faint overflow-x-auto whitespace-pre">
{snippet}
          </pre>
        </div>

        {/* Instructions */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <p className="text-xs font-bold uppercase tracking-widest text-ink-faint mb-3">How to embed</p>
          <ol className="space-y-3 text-sm text-ink-faint">
            {[
              "Run `npm run seed` to create the demo tenant, bots, and knowledge base",
              "Open Dashboard → Bots and copy a bot's embed code",
              "Paste it before </body> on your website",
              "Each bot answers only from the documents you gave that bot",
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink/30 text-[10px] font-bold text-ink-faint mt-0.5">{i + 1}</span>
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
