"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Fire this to start the top bar for a programmatic navigation (router.push /
 * replace / an async action that ends in a redirect). Link clicks are detected
 * automatically and do not need it.
 */
export function startNavProgress() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("navprogress:start"));
}

/**
 * A thin top progress bar that gives instant feedback on every navigation.
 *
 * The App Router has no public "navigation started" event, so intent is detected
 * the only reliable way: a capture-phase click on an internal <a> (plus an
 * explicit startNavProgress() for router.push buttons). The bar creeps toward
 * ~90% immediately, then snaps to 100% and fades once the pathname actually
 * changes — so a click never feels like it did nothing, even when the
 * destination is a slow server component.
 */
export function NavProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timers = useRef<number[]>([]);
  const active = useRef(false);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const start = () => {
    if (active.current) return;
    active.current = true;
    clearTimers();
    setVisible(true);
    setProgress(8);
    // Creep upward, but never reach 100 until the navigation actually resolves.
    ([[40, 120], [62, 380], [78, 800], [88, 1600]] as const).forEach(([to, delay]) => {
      timers.current.push(window.setTimeout(() => setProgress((p) => Math.max(p, to)), delay));
    });
  };

  // Complete whenever the path changes.
  useEffect(() => {
    if (!active.current) return;
    clearTimers();
    setProgress(100);
    timers.current.push(window.setTimeout(() => setVisible(false), 240));
    timers.current.push(
      window.setTimeout(() => {
        setProgress(0);
        active.current = false;
      }, 500),
    );
    return clearTimers;
  }, [pathname]);

  // Detect link clicks anywhere in the document.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || a.target === "_blank" || a.hasAttribute("download")) return;
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    };
    const onStart = () => start();
    document.addEventListener("click", onClick, true);
    window.addEventListener("navprogress:start", onStart);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("navprogress:start", onStart);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-[3px]" aria-hidden>
      <div
        className="h-full rounded-r-full bg-accent-500 transition-[width,opacity] duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: visible ? 1 : 0,
          boxShadow: "0 0 10px var(--accent-ring), 0 0 4px var(--accent)",
        }}
      />
    </div>
  );
}
