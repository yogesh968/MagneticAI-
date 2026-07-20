"use client";
import { OrbBot3D } from "@/components/brand/OrbBot3D";

/**
 * Full-panel route loader rendered by the various loading.tsx boundaries while a
 * segment renders on the server. Same live 3D orb as the sign-in loader, sized
 * down, with an indeterminate sweep — so a slow page never reads as a dead click.
 */
export function RouteLoader({
  label = "Loading",
  size = 150,
  variant = "wire",
}: {
  label?: string;
  size?: number;
  variant?: "core" | "wire" | "swarm";
}) {
  return (
    <div className="anim-in flex min-h-[60vh] w-full flex-col items-center justify-center px-6 py-16">
      <OrbBot3D size={size} variant={variant} />
      <p className="mt-2 font-tight text-[15px] font-semibold tracking-[-.01em] text-ink">{label}…</p>
      <div className="mt-4 h-1 w-44 overflow-hidden rounded-full bg-sunken">
        <div className="h-full w-1/3 rounded-full bg-accent-500" style={{ animation: "loadSweep 1.15s ease-in-out infinite" }} />
      </div>
    </div>
  );
}
