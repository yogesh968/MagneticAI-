import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { MagneticField } from "@/components/brand/MagneticField";

/**
 * The two-up auth layout: dark brand panel on the left, form on the right.
 * Below `lg` the brand panel drops away and the form takes the full width.
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
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-ink p-11 lg:flex">
        <div className="pointer-events-none absolute inset-0">
          <MagneticField theme="dark" density={200} speed={1} />
        </div>

        <div className="relative z-[2]">
          <Link href="/">
            <Logo mode="dark" size={32} />
          </Link>
        </div>

        <div className="relative z-[2]">
          <div className="mb-5 font-tight text-xs uppercase tracking-[.16em] text-[#D4D4D8]">{eyebrow}</div>
          <h2 className="m-0 mb-[26px] max-w-[420px] font-tight text-[40px] font-bold leading-[1.1] tracking-[-.03em] text-white">
            {headline}
          </h2>
          {blurb}
        </div>

        <div className="relative z-[2] flex gap-6 font-tight text-[11px] tracking-[.1em] text-ink-muted">
          {footnotes.map((f) => (
            <span key={f}>{f}</span>
          ))}
        </div>
      </div>

      <div className="relative flex items-center justify-center bg-canvas p-6 sm:p-11">{children}</div>
    </main>
  );
}

/** The checked-perk list used on the register panel. */
export function PerkList({ perks }: { perks: string[] }) {
  return (
    <div className="flex max-w-[380px] flex-col gap-4">
      {perks.map((p) => (
        <div key={p} className="flex items-center gap-3">
          <span className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-lg border border-white/30 bg-white/[.16]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M5 12.5 L10 17 L19 7" stroke="#D4D4D8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="text-[14.5px] text-[#D4D4D8]">{p}</span>
        </div>
      ))}
    </div>
  );
}
