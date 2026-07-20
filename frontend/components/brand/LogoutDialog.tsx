"use client";
import { useEffect } from "react";
import { LogOut, X } from "lucide-react";
import { OrbBot3D } from "@/components/brand/OrbBot3D";

/**
 * A genuine sign-out confirmation — not a browser confirm(), not a generic
 * centered card. The live 3D orb sits on a dotted spec-sheet panel, the current
 * user is shown so it's clear *who* is signing out, and Escape / backdrop click
 * both cancel. Confirming hands off to the AuthLoader overlay.
 */
export function LogoutDialog({
  open,
  user,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  user: { name: string; role: string };
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onCancel]);

  if (!open) return null;

  const initials = user.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  const role = user.role.charAt(0).toUpperCase() + user.role.slice(1);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Sign out">
      <div className="anim-in absolute inset-0 bg-ink/45 backdrop-blur-[6px]" onClick={onCancel} />

      <div className="anim-scale relative w-full max-w-[404px] overflow-hidden rounded-[26px] border border-hairline-strong bg-white shadow-[0_40px_90px_-40px_rgba(18,20,42,.6)]">
        <button
          onClick={onCancel}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-sunken hover:text-ink"
        >
          <X size={16} />
        </button>

        {/* Orb stage — dotted spec-sheet panel, faded at the edges */}
        <div className="dot-grid dot-grid-fade relative flex justify-center bg-paper pb-2 pt-7">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-white" />
          <OrbBot3D size={128} variant="wire" />
        </div>

        <div className="px-7 pb-7 pt-1 text-center">
          <p className="mono-label-accent">Session · End</p>
          <h2 className="mt-2 font-tight text-[23px] font-bold leading-tight tracking-[-.02em] text-ink">
            Sign out of Astrex.ai?
          </h2>

          {/* Who is signing out */}
          <div className="mx-auto mt-5 flex w-fit items-center gap-2.5 rounded-full border border-hairline bg-sunken/70 py-1.5 pl-1.5 pr-4">
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-accent-700 text-[11px] font-bold text-white">
              {initials}
            </span>
            <span className="text-left leading-tight">
              <span className="block text-[13px] font-semibold text-ink">{user.name}</span>
              <span className="block text-[11px] font-medium text-ink-muted">{role}</span>
            </span>
          </div>

          <p className="mx-auto mt-4 max-w-[300px] text-[13.5px] leading-relaxed text-ink-muted">
            Tumhari session close ho jayegi. Wapas sign in karke jahan chhoda tha wahin se continue kar sakte ho.
          </p>

          <div className="mt-7 flex gap-3">
            <button onClick={onCancel} className="btn-secondary flex-1 justify-center py-3 text-[14.5px]">
              Stay signed in
            </button>
            <button onClick={onConfirm} className="btn-ink flex-1 justify-center gap-2 py-3 text-[14.5px]">
              Sign out <LogOut size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
