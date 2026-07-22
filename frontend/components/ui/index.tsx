"use client";
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp } from "lucide-react";

/* ── Primitives ─────────────────────────────────────────────────────────── */
export const Button = ({ className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button {...p} className={`btn-primary ${className}`} />
);
/** Ink-filled action, for destructive-adjacent or secondary-primary CTAs. */
export const ButtonInk = ({ className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button {...p} className={`btn-ink ${className}`} />
);
export const ButtonSecondary = ({ className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button {...p} className={`btn-secondary ${className}`} />
);
export const ButtonDanger = ({ className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button {...p} className={`btn-danger ${className}`} />
);

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...p }, ref) => <input ref={ref} {...p} className={`input ${className}`} />
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = "", ...p }, ref) => (
    <textarea ref={ref} {...p} className={`input min-h-[90px] resize-none ${className}`} />
  )
);
Textarea.displayName = "Textarea";

export const Card = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <section className={`card ${className}`}>{children}</section>
);

/* ── Badge ──────────────────────────────────────────────────────────────── */
const BADGE_CLS: Record<string, string> = {
  slate: "badge-slate", blue: "badge-blue", green: "badge-green",
  red: "badge-red", amber: "badge-amber", orange: "badge-orange",
  neutral: "badge-neutral", cyan: "badge-cyan",
};
export const Badge = ({
  children, tone = "slate", className = "",
}: { children: ReactNode; tone?: string; className?: string }) => (
  <span className={`${BADGE_CLS[tone] ?? "badge-slate"} ${className}`}>{children}</span>
);

/* ── Empty state ────────────────────────────────────────────────────────── */
export const Empty = ({
  title, text, icon, action,
}: { title: string; text: string; icon?: ReactNode; action?: ReactNode }) => (
  <div className="flex flex-col items-center py-20 text-center anim-up">
    {icon && (
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-accent-100 bg-accent-50 text-accent-500">
        {icon}
      </div>
    )}
    <p className="font-tight text-base font-semibold text-ink">{title}</p>
    <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-ink-muted">{text}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>
);

/* ── Loading skeleton ───────────────────────────────────────────────────── */
export const Loading = ({ rows = 4, rowH = "h-12" }: { rows?: number; rowH?: string }) => (
  <div className="space-y-3 p-5">
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className={`skeleton ${rowH} w-full`} style={{ animationDelay: `${i * 0.06}s` }} />
    ))}
  </div>
);

/* ── Spinner ────────────────────────────────────────────────────────────── */
export const Spinner = ({ size = 18, className = "" }: { size?: number; className?: string }) => (
  <svg className={`animate-spin ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

/* ── Avatar ─────────────────────────────────────────────────────────────── */
export const Avatar = ({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) => {
  const s = { sm: "h-7 w-7 text-xs", md: "h-9 w-9 text-sm", lg: "h-12 w-12 text-base" };
  // Identity colours, so the same person stays the same colour across screens.
  const colors = [
    "from-accent-500 to-accent-700",
    "from-[#111113] to-[#3A3A3E]",
    "from-emerald-500 to-teal-600",
    "from-amber-500 to-orange-500",
    "from-rose-500 to-pink-600",
  ];
  const color = colors[(name?.charCodeAt(0) ?? 0) % colors.length];
  return (
    <span className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br font-tight font-bold text-white ${color} ${s[size]}`}>
      {name?.[0]?.toUpperCase() ?? "?"}
    </span>
  );
};

/* ── StatCard ───────────────────────────────────────────────────────────── */
// Editorial metric tile — white card that lifts on hover with a soft shadow and
// a tonal bloom from the corner (replaces the old flat left rail). The metric
// name is set in the monospace spec-sheet voice; the value is oversized tabular
// display type. Whole literal class names so Tailwind's static scan keeps them.
const STAT_TONE: Record<
  string,
  { icon: string; iconBg: string; iconBorder: string; dot: string; glow: string }
> = {
  blue:    { icon: "text-accent-600",  iconBg: "bg-accent-50",  iconBorder: "border-accent-100",  dot: "bg-accent-500",  glow: "bg-accent-400/25" },
  amber:   { icon: "text-amber-600",   iconBg: "bg-amber-50",   iconBorder: "border-amber-100",   dot: "bg-amber-500",   glow: "bg-amber-400/25" },
  green:   { icon: "text-emerald-600", iconBg: "bg-emerald-50", iconBorder: "border-emerald-100", dot: "bg-emerald-500", glow: "bg-emerald-400/25" },
  red:     { icon: "text-red-600",     iconBg: "bg-red-50",     iconBorder: "border-red-100",     dot: "bg-red-500",     glow: "bg-red-400/25" },
  neutral: { icon: "text-ink-soft",    iconBg: "bg-sunken",     iconBorder: "border-hairline",    dot: "bg-ink",         glow: "bg-ink/10" },
  cyan:    { icon: "text-[#0B7A78]",   iconBg: "bg-[#E4F6F5]",  iconBorder: "border-[#CDECEA]",   dot: "bg-[#0B7A78]",   glow: "bg-[#0B7A78]/20" },
};

export function StatCard({
  label, value, icon, tone = "blue", delay, sub, trend, trendLabel,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  tone?: string;
  delay?: string;
  sub?: string;
  trend?: "up" | "down";
  trendLabel?: string;
}) {
  const t = STAT_TONE[tone] ?? STAT_TONE.blue;
  return (
    <div
      className={`group anim-up relative overflow-hidden rounded-2xl border border-hairline bg-white p-5 transition-[transform,border-color,box-shadow] duration-[320ms] ease-[cubic-bezier(.22,.61,.36,1)] [will-change:transform] hover:-translate-y-1.5 hover:border-hairline-strong hover:shadow-[0_22px_50px_-28px_rgba(20,20,42,.6)] ${delay ?? ""}`}
    >
      {/* tonal bloom from the top-right corner on hover — no flat rail */}
      <span
        aria-hidden
        className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-0 blur-2xl transition-opacity duration-[450ms] ease-out group-hover:opacity-100 ${t.glow}`}
      />

      <div className="relative mb-5 flex items-start justify-between">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${t.iconBorder} ${t.iconBg} ${t.icon} transition-transform duration-[320ms] ease-[cubic-bezier(.22,.61,.36,1)] group-hover:scale-110`}
        >
          {icon}
        </span>
        {trendLabel ? (
          <span
            className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold ${
              trend === "up" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
            }`}
          >
            {trend === "up" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {trendLabel}
          </span>
        ) : (
          <span className={`mt-1.5 h-1.5 w-1.5 rounded-full opacity-60 ${t.dot}`} />
        )}
      </div>

      <p className="relative font-tight text-[32px] font-extrabold leading-none tracking-[-.03em] text-ink tabular-nums">
        {value}
      </p>
      <p className="relative mt-2.5 font-mono text-[10.5px] font-medium uppercase tracking-[.16em] text-ink-muted">
        {label}
      </p>
      {sub && <p className="relative mt-1.5 text-xs text-ink-muted">{sub}</p>}
    </div>
  );
}

/* ── PageHeader ─────────────────────────────────────────────────────────── */
export function PageHeader({
  title, subtitle, action,
}: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4 anim-up">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-sub">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
    </div>
  );
}

/* ── Pagination ─────────────────────────────────────────────────────────── */
export function Pagination({
  page, pages, total, onChange,
}: { page: number; pages: number; total: number; onChange: (p: number) => void }) {
  return (
    <div className="flex items-center justify-between border-t border-hairline px-5 py-3">
      <p className="text-xs text-ink-muted">
        Page <span className="font-semibold text-ink">{page}</span> of{" "}
        <span className="font-semibold text-ink">{pages}</span> ·{" "}
        <span className="font-semibold text-ink">{total}</span> total
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="btn-ghost btn-sm p-2 disabled:opacity-30"
        >
          <ChevronLeft size={14} />
        </button>
        {Array.from({ length: Math.min(5, pages) }, (_, i) => {
          const p = Math.min(Math.max(page - 2 + i, 1), pages - 4 + i);
          return (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`btn-sm min-w-[32px] rounded-lg px-2 font-semibold ${
                p === page ? "bg-accent-500 text-white" : "text-ink-muted hover:bg-sunken"
              }`}
            >
              {p}
            </button>
          );
        })}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= pages}
          className="btn-ghost btn-sm p-2 disabled:opacity-30"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

/* ── UsageBar ───────────────────────────────────────────────────────────── */
// A value meter for the Billing page (none existed). Fill turns amber past 80%
// and red at/over the limit, so a tenant sees a squeeze coming. A null limit is
// "unlimited" — rendered as an empty track. Matches the light theme tokens.
export function UsageBar({
  used, limit, className = "",
}: { used: number; limit: number | null; className?: string }) {
  const unlimited = limit == null;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
  const tone = pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-accent-500";
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-sunken ${className}`}>
      {!unlimited && (
        <div className={`h-full rounded-full ${tone} transition-[width] duration-500`} style={{ width: `${pct}%` }} />
      )}
    </div>
  );
}

/* ── InfoRow ────────────────────────────────────────────────────────────── */
export function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-xs font-medium text-ink-muted">{label}</span>
      <span className="text-xs font-semibold text-ink-soft">{value}</span>
    </div>
  );
}

/* ── Tabs ───────────────────────────────────────────────────────────────── */
export function Tabs({
  tabs, active, onChange,
}: {
  tabs: { key: string; label: string; icon?: ReactNode }[];
  active: string;
  onChange: (k: string) => void;
}) {
  return (
    <div className="mb-5 flex gap-1 border-b border-hairline">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
            active === t.key
              ? "border-accent-500 text-accent-500"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* ── Divider ────────────────────────────────────────────────────────────── */
export const Divider = ({ className = "" }: { className?: string }) => (
  <hr className={`my-4 border-hairline ${className}`} />
);
