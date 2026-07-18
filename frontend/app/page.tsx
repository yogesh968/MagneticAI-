import Link from "next/link";
import { LayoutDashboard, MessageSquare, Code2, ArrowRight, ArrowUpRight, Shield, Bot, BarChart3, Activity } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { OrbBot3D } from "@/components/brand/OrbBot3D";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001";
const DEMO_TENANT_ID = process.env.NEXT_PUBLIC_DEMO_TENANT_ID ?? "6a29ab35723320fa9897f463";

const ACCESS = [
  {
    idx: "01",
    eyebrow: "Admin Panel",
    title: "Support Dashboard",
    desc: "Tickets, conversations, knowledge base, analytics and AI configuration.",
    code: "/dashboard",
    href: "/admin/login",
    cta: "Open dashboard",
    icon: LayoutDashboard,
    external: false,
  },
  {
    idx: "02",
    eyebrow: "Backend API",
    title: "Express + Socket.io",
    desc: "REST API with JWT auth, RAG engine, Qdrant vector search and websockets.",
    code: `${API_URL}/health`,
    href: `${API_URL}/health`,
    cta: "Check API status",
    icon: Bot,
    external: true,
  },
  {
    idx: "03",
    eyebrow: "Chat Widget",
    title: "Embeddable Anywhere",
    desc: "One script tag. Tenant-isolated, real-time AI chat with human handoff.",
    code: `${API_URL}/widget.js`,
    href: "/widget-demo",
    cta: "Live demo",
    icon: Code2,
    external: false,
  },
];

const FEATURES = [
  { icon: Bot, label: "RAG Answers", desc: "Groq llama-3.3-70b + Cohere embeddings" },
  { icon: Shield, label: "Auto Escalation", desc: "Keyword-based ticket creation" },
  { icon: MessageSquare, label: "Real-time Chat", desc: "Socket.io human handoff" },
  { icon: BarChart3, label: "Analytics", desc: "30-day trends & resolution rate" },
];

const STACK: [string, string][] = [
  ["Frontend", "Next.js 14 · TypeScript · Tailwind"],
  ["Backend", "Node.js · Express · Socket.io"],
  ["AI", "Groq llama-3.3-70b · Cohere embed"],
  ["Data", "MongoDB Atlas · Qdrant Cloud"],
];

export default function LandingPage() {
  return (
    <main className="dot-grid relative min-h-screen bg-canvas text-ink">
      {/* accent washes */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-40 -top-20 h-[520px] w-[520px] rounded-full bg-accent-200/30 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-[460px] w-[460px] rounded-full bg-[#D9D2C4]/50 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6">
        {/* ── Top bar ─────────────────────────────────────────────────── */}
        <header className="flex items-center justify-between py-7">
          <Logo mode="light" size={30} />
          <div className="hidden items-center gap-6 sm:flex">
            <span className="mono-tick">◆ Property Index · 2026</span>
            <Link href="/login" className="btn-ink btn-sm gap-1.5">
              Sign in <ArrowUpRight size={13} />
            </Link>
          </div>
        </header>

        {/* ── Hero ────────────────────────────────────────────────────── */}
        <section className="grid items-center gap-10 pb-6 pt-10 lg:grid-cols-[1.1fr_.9fr] lg:pt-16">
          <div className="anim-up">
            <div className="mono-label-accent mb-6">AI Customer Support · Platform</div>
            <h1 className="display text-[clamp(3rem,8.5vw,6.5rem)]">
              SUPPORT
              <br />
              ON <span className="text-accent-500">AUTOPILOT</span>
            </h1>
            <p className="mt-7 max-w-md text-lg leading-relaxed text-ink-soft">
              A multi-tenant RAG support platform — real-time chat, auto-escalation, smart
              ticketing and a drop-in embeddable widget. Answers on autopilot, humans when it matters.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/admin/login" className="btn-primary gap-2 px-6 py-3.5 text-[15px]">
                Open Admin Panel <ArrowRight size={16} />
              </Link>
              <Link href="/widget-demo" className="btn-secondary gap-2 px-6 py-3.5 text-[15px]">
                <MessageSquare size={16} /> Live Widget Demo
              </Link>
            </div>

            {/* spec strip */}
            <div className="mt-11 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-hairline-strong pt-6">
              <div>
                <div className="font-tight text-2xl font-extrabold tracking-tight text-ink">70B</div>
                <div className="mono-tick mt-0.5">Model params</div>
              </div>
              <div className="hidden h-8 w-px bg-hairline-strong sm:block" />
              <div>
                <div className="font-tight text-2xl font-extrabold tracking-tight text-ink">&lt;1s</div>
                <div className="mono-tick mt-0.5">Median reply</div>
              </div>
              <div className="hidden h-8 w-px bg-hairline-strong sm:block" />
              <div>
                <div className="font-tight text-2xl font-extrabold tracking-tight text-ink">24/7</div>
                <div className="mono-tick mt-0.5">Always on</div>
              </div>
            </div>
          </div>

          {/* Bot stage */}
          <div className="anim-scale relative flex items-center justify-center">
            <div className="paper-panel dot-grid dot-grid-fade bracket relative flex aspect-square w-full max-w-[420px] items-center justify-center rounded-3xl border border-hairline-strong shadow-card-lg">
              <div className="absolute left-4 top-4 mono-tick">◆ Unit · MG-01</div>
              <div className="absolute right-4 top-4 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-success anim-dot" />
                <span className="mono-tick">Online</span>
              </div>
              <OrbBot3D size={288} variant="wire" />
              <div className="absolute bottom-4 left-4 mono-tick">Magnetic Assistant</div>
              <div className="absolute bottom-4 right-4 mono-tick">v2026.7</div>
            </div>
          </div>
        </section>

        {/* ── Access cards ────────────────────────────────────────────── */}
        <section className="mt-16">
          <div className="mb-5 flex items-center gap-3">
            <span className="mono-label">Endpoints</span>
            <span className="h-px flex-1 bg-hairline-strong" />
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {ACCESS.map(({ idx, eyebrow, title, desc, code, href, cta, icon: Icon, external }) => (
              <div
                key={idx}
                className="group relative flex flex-col rounded-2xl border border-hairline bg-surface p-6 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-1 hover:border-hairline-strong hover:shadow-card-lg"
              >
                <div className="mb-5 flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-accent-100 bg-accent-50 text-accent-600">
                    <Icon size={19} />
                  </div>
                  <span className="mono-tick">{idx}</span>
                </div>
                <div className="mono-label-accent mb-1.5">{eyebrow}</div>
                <p className="font-tight text-lg font-bold text-ink">{title}</p>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-ink-muted">{desc}</p>
                <div className="mt-4 truncate rounded-lg border border-hairline bg-sunken px-3 py-2 font-mono text-[11px] text-ink-muted">
                  {code}
                </div>
                {external ? (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm mt-4 justify-center gap-1.5">
                    {cta} <ArrowUpRight size={13} />
                  </a>
                ) : (
                  <Link href={href} className="btn-secondary btn-sm mt-4 justify-center gap-1.5 group-hover:border-accent-200 group-hover:bg-accent-50 group-hover:text-accent-600">
                    {cta} <ArrowRight size={13} />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Features ────────────────────────────────────────────────── */}
        <section className="mt-14">
          <div className="mb-5 flex items-center gap-3">
            <span className="mono-label">Capabilities</span>
            <span className="h-px flex-1 bg-hairline-strong" />
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="rounded-2xl border border-hairline bg-surface p-5 transition-colors hover:border-hairline-strong">
                <Icon size={18} className="mb-3 text-accent-600" />
                <p className="font-tight text-sm font-bold text-ink">{label}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Tech stack ──────────────────────────────────────────────── */}
        <section className="mt-14">
          <div className="paper-panel dot-grid rounded-2xl border border-hairline-strong p-7">
            <div className="mb-5 flex items-center gap-2">
              <Activity size={14} className="text-accent-600" />
              <span className="mono-label-accent">Tech Stack</span>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {STACK.map(([layer, tech]) => (
                <div key={layer} className="rounded-xl border border-hairline bg-surface/80 px-4 py-3.5">
                  <p className="mono-tick mb-1.5">{layer}</p>
                  <p className="text-[13px] font-medium leading-snug text-ink-soft">{tech}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="mt-16 flex flex-col items-center gap-2 border-t border-hairline pb-12 pt-8 text-center">
          <Logo mode="light" size={24} />
          <p className="mono-tick mt-2">Magnetic AI · Support Platform · 2026 Edition</p>
        </footer>
      </div>
    </main>
  );
}
