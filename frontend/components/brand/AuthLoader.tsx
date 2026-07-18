"use client";
import { useEffect, useState } from "react";
import { OrbBot3D } from "@/components/brand/OrbBot3D";

/**
 * The sign-in / sign-up loading experience. Instead of a plain button spinner,
 * a full-screen overlay drops in with the live 3D orb-bot spinning and a status
 * line that steps through the real stages of the request. Shown while a form is
 * submitting; it stays up through the redirect on success and unmounts on error.
 */
export function AuthLoader({
  title = "Signing you in",
  steps = ["Verifying credentials", "Securing your session", "Preparing your workspace"],
  variant = "swarm",
}: {
  title?: string;
  steps?: string[];
  variant?: "core" | "wire" | "swarm";
}) {
  const [i, setI] = useState(0);

  useEffect(() => {
    // Advance the status line, but hold on the last step (the redirect lands there).
    const id = setInterval(() => setI((v) => Math.min(v + 1, steps.length - 1)), 1050);
    return () => clearInterval(id);
  }, [steps.length]);

  return (
    <div
      className="anim-in fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[--canvas]/80 backdrop-blur-md"
      role="status"
      aria-live="polite"
      aria-label={title}
    >
      <OrbBot3D size={210} variant={variant} />

      <div className="anim-up mt-1 flex flex-col items-center">
        <h2 className="font-tight text-[22px] font-bold tracking-[-.02em] text-ink">{title}</h2>
        <p key={i} className="anim-in mt-2 h-5 text-sm font-medium text-ink-muted">
          {steps[i]}…
        </p>

        {/* indeterminate progress track */}
        <div className="mt-5 h-1 w-56 overflow-hidden rounded-full bg-sunken">
          <div className="h-full w-1/4 rounded-full bg-accent-500" style={{ animation: "loadSweep 1.15s ease-in-out infinite" }} />
        </div>

        {/* step dots */}
        <div className="mt-4 flex items-center gap-2">
          {steps.map((_, s) => (
            <span
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${s <= i ? "w-5 bg-accent-500" : "w-1.5 bg-hairline-strong"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
