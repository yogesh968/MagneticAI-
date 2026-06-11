"use client";
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";

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
    <textarea ref={ref} {...p} className={`input min-h-[96px] resize-none ${className}`} />
  )
);
Textarea.displayName = "Textarea";

/* ── Badge ──────────────────────────────────────────────────────────────── */
const badgeCls: Record<string, string> = {
  slate: "badge-slate", blue: "badge-blue", green: "badge-green",
  red: "badge-red", amber: "badge-amber", orange: "badge-orange",
  purple: "badge-purple", cyan: "badge-cyan", pink: "badge-pink",
};
export const Badge = ({
  children, tone = "slate", className = "",
}: { children: ReactNode; tone?: string; className?: string }) => (
  <span className={`${badgeCls[tone] ?? "badge-slate"} ${className}`}>{children}</span>
);

/* ── Spinner ─────────────────────────────────────────────────────────────── */
export const Spinner = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg
    className={`animate-spin shrink-0 ${className}`}
    width={size} height={size}
    viewBox="0 0 24 24" fill="none"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

/* ── Avatar ──────────────────────────────────────────────────────────────── */
const AV_COLORS = [
  "from-blue-500 to-indigo-600", "from-violet-500 to-purple-700",
  "from-emerald-500 to-teal-600", "from-orange-500 to-red-500",
  "from-pink-500 to-rose-600",   "from-cyan-500 to-sky-600",
];
export const Avatar = ({
  name = "?", size = "md",
}: { name: string; size?: "xs" | "sm" | "md" | "lg" | "xl" }) => {
  const s = { xs: "h-6 w-6 text-[10px]", sm: "h-8 w-8 text-xs", md: "h-9 w-9 text-sm", lg: "h-11 w-11 text-base", xl: "h-14 w-14 text-lg" };
  const col = AV_COLORS[(name.charCodeAt(0) ?? 0) % AV_COLORS.length];
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white ${col} ${s[size]}`}>
      {name[0]?.toUpperCase() ?? "?"}
    </span>
  );
};

/* ── Loading skeleton ────────────────────────────────────────────────────── */
export const Loading = ({ rows = 4, rowH = "h-14" }: { rows?: number; rowH?: string }) => (
  <div className="space-y-3 p-6">
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className={`skeleton ${rowH} w-full rounded-xl`} style={{ animationDelay: `${i * 0.07}s` }} />
    ))}
  </div>
);

/* ── Empty state ─────────────────────────────────────────────────────────── */
export const Empty = ({
  title, text, icon, action,
}: { title: string; text: string; icon?: ReactNode; action?: ReactNode }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center px-6">
    {icon && (
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 shadow-inner">
        {icon}
      </div>
    )}
    <p className="text-base font-semibold text-slate-800">{title}</p>
    <p className="mt-2 max-w-sm text-sm text-slate-400 leading-relaxed">{text}</p>
    {action && <div className="mt-6">{action}</div>}
  </div>
);

/* ── Page header ─────────────────────────────────────────────────────────── */
export const PageHeader = ({
  title, subtitle, action,
}: { title: string; subtitle?: string; action?: ReactNode }) => (
  <div className="mb-7 flex items-start justify-between gap-4">
    <div className="anim-up">
      <h1 className="page-title">{title}</h1>
      {subtitle && <p className="page-sub">{subtitle}</p>}
    </div>
    {action && <div className="shrink-0 anim-up d2">{action}</div>}
  </div>
);

/* ── Stat card ───────────────────────────────────────────────────────────── */
const STAT_TONES: Record<string, { bg: string; text: string; ring: string }> = {
  blue:   { bg: "bg-blue-50",    text: "text-blue-600",    ring: "ring-blue-200/60" },
  green:  { bg: "bg-emerald-50", text: "text-emerald-600", ring: "ring-emerald-200/60" },
  amber:  { bg: "bg-amber-50",   text: "text-amber-600",   ring: "ring-amber-200/60" },
  red:    { bg: "bg-red-50",     text: "text-red-600",     ring: "ring-red-200/60" },
  purple: { bg: "bg-purple-50",  text: "text-purple-600",  ring: "ring-purple-200/60" },
  cyan:   { bg: "bg-cyan-50",    text: "text-cyan-600",    ring: "ring-cyan-200/60" },
  orange: { bg: "bg-orange-50",  text: "text-orange-600",  ring: "ring-orange-200/60" },
};
export const StatCard = ({
  label, value, sub, icon, tone = "blue", delay = "", trend,
}: {
  label: string; value: string | number; sub?: string; icon: ReactNode;
  tone?: string; delay?: string; trend?: { value: number; label: string };
}) => {
  const t = STAT_TONES[tone] ?? STAT_TONES.blue;
  return (
    <div className={`card-hover flex flex-col anim-up ${delay}`}>
      <div className="flex items-start justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${t.bg} ${t.text} ${t.ring}`}>
          {icon}
        </div>
        {trend && (
          <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${trend.value >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <p className="mt-4 text-[2rem] font-extrabold tracking-tight text-slate-900 leading-none">{value}</p>
      <p className="mt-1.5 text-sm font-medium text-slate-600">{label}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
};

/* ── Tabs ────────────────────────────────────────────────────────────────── */
export const Tabs = ({
  tabs, active, onChange,
}: { tabs: { key: string; label: string; icon?: ReactNode }[]; active: string; onChange: (k: string) => void }) => (
  <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 w-fit mb-6">
    {tabs.map((t) => (
      <button
        key={t.key}
        onClick={() => onChange(t.key)}
        className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150 ${
          active === t.key
            ? "bg-white text-slate-900 shadow-[0_1px_3px_0_rgb(0,0,0,0.08)] border border-slate-200/60"
            : "text-slate-500 hover:text-slate-800"
        }`}
      >
        {t.icon}
        {t.label}
      </button>
    ))}
  </div>
);

/* ── Pagination ──────────────────────────────────────────────────────────── */
export const Pagination = ({
  page, pages, total, onChange,
}: { page: number; pages: number; total?: number; onChange: (p: number) => void }) => (
  <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5 bg-slate-50/40 rounded-b-2xl">
    <p className="text-xs text-slate-400">
      {total !== undefined ? `${total} total · ` : ""}Page {page} of {pages}
    </p>
    <div className="flex items-center gap-1.5">
      <button
        className="btn-secondary btn-sm"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
      >← Prev</button>
      {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
        const p = i + 1;
        return (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
              p === page
                ? "bg-blue-600 text-white"
                : "text-slate-500 hover:bg-slate-100"
            }`}
          >{p}</button>
        );
      })}
      <button
        className="btn-secondary btn-sm"
        disabled={page === pages}
        onClick={() => onChange(page + 1)}
      >Next →</button>
    </div>
  </div>
);

/* ── Section header ──────────────────────────────────────────────────────── */
export const SectionHeader = ({
  title, desc, action,
}: { title: string; desc?: string; action?: ReactNode }) => (
  <div className="flex items-center justify-between mb-4">
    <div>
      <p className="section-title">{title}</p>
      {desc && <p className="text-xs text-slate-400 mt-0.5">{desc}</p>}
    </div>
    {action}
  </div>
);

/* ── Divider ─────────────────────────────────────────────────────────────── */
export const Divider = () => <hr className="border-slate-100 my-5" />;

/* ── Info row for detail pages ───────────────────────────────────────────── */
export const InfoRow = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
    <span className="text-sm text-slate-500">{label}</span>
    <span className="text-sm font-medium text-slate-900 text-right">{value}</span>
  </div>
);
