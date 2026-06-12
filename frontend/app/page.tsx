import Link from "next/link";
import { Zap, LayoutDashboard, MessageSquare, Code2, ArrowRight, Shield, Bot, BarChart3 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001";
const DEMO_TENANT_ID = process.env.NEXT_PUBLIC_DEMO_TENANT_ID ?? "6a29ab35723320fa9897f463";

export default function LandingPage() {
  const widgetSnippet = `<script src="${API_URL}/widget.js" data-tenant-id="${DEMO_TENANT_ID}"></script>`;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-violet-600/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-5xl px-6 py-20">
        {/* Header */}
        <div className="mb-16 text-center">
          <div className="mb-6 inline-flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 shadow-[0_4px_24px_0_rgb(37,99,235,0.5)]">
              <Zap size={22} className="text-white" fill="white" />
            </div>
            <span className="text-2xl font-bold tracking-tight">Magnetic AI</span>
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight leading-tight">
            AI-Powered Customer Support
            <span className="block mt-2 bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              Built for Every Business
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-slate-400 leading-relaxed">
            Multi-tenant RAG support platform with real-time chat, auto-escalation, smart ticketing, and a drop-in embeddable widget.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_2px_12px_0_rgb(37,99,235,0.5)] hover:bg-blue-500 transition-all hover:shadow-[0_4px_20px_0_rgb(37,99,235,0.6)] hover:-translate-y-0.5"
            >
              Open Admin Panel <ArrowRight size={15} />
            </Link>
            <Link
              href="/widget-demo"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/10 transition-all"
            >
              <MessageSquare size={15} /> Live Widget Demo
            </Link>
          </div>
        </div>

        {/* Three URL cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14">
          {/* Admin Panel */}
          <div className="group rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur hover:border-blue-500/40 hover:bg-white/8 transition-all">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 border border-blue-500/30">
              <LayoutDashboard size={18} className="text-blue-400" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-1">Admin Panel</p>
            <p className="text-base font-bold text-white mb-1">Support Dashboard</p>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Manage tickets, conversations, knowledge base, analytics and AI configuration.
            </p>
            <div className="rounded-lg bg-slate-900/60 border border-white/5 px-3 py-2 font-mono text-xs text-slate-300 truncate mb-4">
              /dashboard
            </div>
            <div className="text-xs text-slate-500 mb-1">Demo login</div>
            <div className="rounded-lg bg-slate-900/60 border border-white/5 px-3 py-2 text-xs text-slate-300">
              <span className="text-blue-400">admin@demo.com</span> · Demo@1234
            </div>
            <Link
              href="/login"
              className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
            >
              Open Dashboard <ArrowRight size={13} />
            </Link>
          </div>

          {/* API / Backend */}
          <div className="group rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur hover:border-emerald-500/40 hover:bg-white/8 transition-all">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-500/30">
              <Bot size={18} className="text-emerald-400" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-1">Backend API</p>
            <p className="text-base font-bold text-white mb-1">Express + Socket.io</p>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              REST API with JWT auth, RAG engine, Qdrant vector search, and real-time websockets.
            </p>
            <div className="rounded-lg bg-slate-900/60 border border-white/5 px-3 py-2 font-mono text-xs text-slate-300 truncate mb-4">
              {API_URL}
            </div>
            <div className="text-xs text-slate-500 mb-1">Health check</div>
            <div className="rounded-lg bg-slate-900/60 border border-white/5 px-3 py-2 font-mono text-xs text-slate-300">
              GET {API_URL}/health
            </div>
            <a
              href={`${API_URL}/health`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
            >
              Check API Status <ArrowRight size={13} />
            </a>
          </div>

          {/* Widget */}
          <div className="group rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur hover:border-violet-500/40 hover:bg-white/8 transition-all">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20 border border-violet-500/30">
              <Code2 size={18} className="text-violet-400" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-1">Chat Widget</p>
            <p className="text-base font-bold text-white mb-1">Embeddable on Any Site</p>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Drop one script tag on your website. Tenant-isolated, real-time AI chat with human handoff.
            </p>
            <div className="rounded-lg bg-slate-900/60 border border-white/5 px-3 py-2 font-mono text-xs text-slate-300 truncate mb-4">
              {API_URL}/widget.js
            </div>
            <div className="text-xs text-slate-500 mb-1">Embed code</div>
            <div className="rounded-lg bg-slate-900/60 border border-white/5 px-3 py-1.5 font-mono text-[10px] text-slate-400 break-all leading-relaxed">
              {`<script src="${API_URL}/widget.js"`}<br />
              {`  data-tenant-id="${DEMO_TENANT_ID}">`}<br />
              {`</script>`}
            </div>
            <Link
              href="/widget-demo"
              className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2.5 text-sm font-semibold text-violet-400 hover:bg-violet-500/20 transition-colors"
            >
              Live Demo <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-14">
          {[
            { icon: Bot, label: "RAG Answers", desc: "Groq llama-3.3-70b + Cohere embeddings" },
            { icon: Shield, label: "Auto Escalation", desc: "Keyword-based ticket creation" },
            { icon: MessageSquare, label: "Real-time Chat", desc: "Socket.io human handoff" },
            { icon: BarChart3, label: "Analytics", desc: "30-day trends & resolution rate" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="rounded-2xl border border-white/8 bg-white/3 p-4 backdrop-blur">
              <Icon size={16} className="text-blue-400 mb-2" />
              <p className="text-sm font-semibold text-white">{label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
            </div>
          ))}
        </div>

        {/* Stack */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Tech Stack</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {[
              ["Frontend", "Next.js 14, TypeScript, Tailwind"],
              ["Backend", "Node.js, Express, Socket.io"],
              ["AI", "Groq llama-3.3-70b, Cohere embed"],
              ["Data", "MongoDB Atlas, Qdrant Cloud"],
            ].map(([layer, tech]) => (
              <div key={layer} className="rounded-xl bg-slate-900/50 border border-white/5 px-3 py-2.5">
                <p className="font-bold text-slate-400 mb-1">{layer}</p>
                <p className="text-slate-500">{tech}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-slate-600">
          Magnetic AI Support Platform · Built with Next.js + Express + MongoDB + Qdrant
        </p>
      </div>
    </main>
  );
}
