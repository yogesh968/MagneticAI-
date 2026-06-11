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
  purple: "badge-purple", cyan: "badge-cyan",
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
  <div className="flex flex-col items-center py-20 text-center">
    {icon && (
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        {icon}
      </div>
    )}
    <p className="text-base font-semibold text-slate-800">{title}</p>
    <p className="mt-1.5 max-w-sm text-sm text-slate-500">{text}</p>
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
  const colors = [
    "from-blue-500 to-blue-600", "from-violet-500 to-violet-600",
    "from-emerald-500 to-teal-600", "from-amber-500 to-orange-500", "from-pink-500 to-rose-500",
  ];
  const color = colors[(name?.charCodeAt(0) ?? 0) % colors.length];
  return (
    <span className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br font-bold text-white ${color} ${s[size]}`}>
      {name?.[0]?.toUpperCase() ?? "?"}
    </span>
  );
};

/* ── StatCard ───────────────────────────────────────────────────────────── */
const STAT_TONE: Record<string, { bg: string; text: string; ring: string }> = {
  blue:   { bg: "bg-blue-50",   text: "text-blue-600",   ring: "ring-blue-200/60" },
  amber:  { bg: "bg-amber-50",  text: "text-amber-600",  ring: "ring-amber-200/60" },
  green:  { bg: "bg-green-50",  text: "text-green-600",  ring: "ring-green-200/60" },
  red:    { bg: "bg-red-50",    text: "text-red-600",    ring: "ring-red-200/60" },
  purple: { bg: "bg-purple-50", text: "text-purple-600", ring: "ring-purple-200/60" },
  cyan:   { bg: "bg-cyan-50",   text: "text-cyan-600",   ring: "ring-cyan-200/60" },
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
    <div className={`card group anim-up ${delay ?? ""}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-2.5 text-3xl font-extrabold tabular-nums tracking-tight text-slate-900">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
          {trendLabel && (
            <div className={`mt-2 flex items-center gap-1 text-xs font-semibold ${trend === "up" ? "text-emerald-600" : "text-red-500"}`}>
              {trend === "up" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {trendLabel}
            </div>
          )}
        </div>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 transition-transform group-hover:scale-110 ${t.bg} ${t.ring}`}>
          <span className={t.text}>{icon}</span>
        </div>
      </div>
    </div>
  );
}

/* ── PageHeader ─────────────────────────────────────────────────────────── */
export function PageHeader({
  title, subtitle, action,
}: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-sub">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ── Pagination ─────────────────────────────────────────────────────────── */
export function Pagination({
  page, pages, total, onChange,
}: { page: number; pages: number; total: number; onChange: (p: number) => void }) {
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
      <p className="text-xs text-slate-400">
        Page <span className="font-semibold text-slate-700">{page}</span> of{" "}
        <span className="font-semibold text-slate-700">{pages}</span> ·{" "}
        <span className="font-semibold text-slate-700">{total}</span> total
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
              className={`btn-sm min-w-[32px] px-2 rounded-lg font-semibold ${
                p === page ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
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

/* ── InfoRow ────────────────────────────────────────────────────────────── */
export function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <span className="text-xs font-semibold text-slate-800">{value}</span>
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
    <div className="mb-5 flex gap-1 border-b border-slate-200">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
            active === t.key
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
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
  <hr className={`my-4 border-slate-100 ${className}`} />
);
