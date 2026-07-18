import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { OrbBot3D } from "@/components/brand/OrbBot3D";

/**
 * The two-up auth layout, editorial edition: a warm paper brand panel on the
 * left (dotted engineering grid, monospace spec metadata, an oversized display
 * headline, and the floating 3D OrbBot), and the form on the right on clean
 * white. Below `lg` the brand panel drops away and the form takes full width.
 */
export function AuthShell({
  eyebrow,
  headline,
  blurb,
  footnotes,
  children,
}: {
  eyebrow: string;
  headline: ReactNode;
  blurb?: ReactNode;
  footnotes: string[];
  children: ReactNode;
}) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* ── Brand panel ─────────────────────────────────────────────────── */}
      <div className="paper-panel dot-grid relative hidden flex-col justify-between p-10 xl:p-14 lg:flex">
        {/* soft accent wash so the paper isn't flat */}
        <div className="pointer-events-none absolute -left-24 top-1/3 h-[420px] w-[420px] rounded-full bg-accent-200/40 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-0 h-[320px] w-[320px] rounded-full bg-[#D9D2C4]/50 blur-3xl" />

        {/* top row: mark + spec metadata */}
        <div className="relative z-[2] flex items-start justify-between">
          <Link href="/">
            <Logo mode="light" size={30} />
          </Link>
          <div className="text-right leading-relaxed">
            <div className="mono-label-accent">Magnetic AI Corp</div>
            <div className="mono-tick mt-1">Secure Access · 2026</div>
          </div>
        </div>

        {/* centre: floating bot + oversized headline */}
        <div className="relative z-[2]">
          <div className="mb-8 flex justify-start">
            <OrbBot3D size={188} variant="core" />
          </div>
          <div className="mono-label-accent mb-4">{eyebrow}</div>
          <h2 className="display max-w-[9ch] text-[clamp(2.6rem,6.4vw,5rem)]">{headline}</h2>
          {blurb && <div className="mt-6 max-w-[420px]">{blurb}</div>}
        </div>

        {/* bottom: spec footnotes */}
        <div className="relative z-[2] flex items-center gap-6 border-t border-[--hairline-strong] pt-5">
          {footnotes.map((f) => (
            <span key={f} className="mono-tick">
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* ── Form panel ──────────────────────────────────────────────────── */}
      <div className="relative flex items-center justify-center bg-[--surface] p-6 sm:p-11">
        {/* corner metadata for the technical frame */}
        <div className="pointer-events-none absolute right-6 top-6 hidden sm:block">
          <span className="mono-tick">◆ / Portal Access</span>
        </div>
        {children}
      </div>
    </main>
  );
}

/** The checked-perk list used on the register panel — dark ink on warm paper. */
export function PerkList({ perks }: { perks: string[] }) {
  return (
    <div className="flex max-w-[380px] flex-col gap-3.5">
      {perks.map((p) => (
        <div key={p} className="flex items-center gap-3">
          <span className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-lg border border-accent-200 bg-accent-50">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M5 12.5 L10 17 L19 7" stroke="#4453D6" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="text-[14.5px] text-ink-soft">{p}</span>
        </div>
      ))}
    </div>
  );
}
