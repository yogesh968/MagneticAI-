"use client";
import { useEffect } from "react";
import { RotateCw } from "lucide-react";
import { OrbBot3D } from "@/components/brand/OrbBot3D";

/**
 * Route-level error boundary. Any uncaught render/data error under the root lands
 * here instead of a blank screen — the orb stays, and `reset()` re-renders the
 * failed segment without a full reload.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="dot-grid flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center">
      <OrbBot3D size={190} variant="core" />
      <p className="mono-label-accent mt-4">Something went wrong</p>
      <h1 className="display mt-3 text-[clamp(2.2rem,6vw,4rem)]">UNEXPECTED ERROR</h1>
      <p className="mt-4 max-w-sm text-ink-soft">
        Kuch galat ho gaya. Dobara try karo — problem bani rahe to page refresh kar lena.
      </p>
      <button onClick={reset} className="btn-primary mt-8 gap-2 px-6 py-3.5 text-[15px]">
        <RotateCw size={16} /> Try again
      </button>
    </main>
  );
}
