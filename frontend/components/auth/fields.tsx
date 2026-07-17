import type { ReactNode } from "react";

export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="label">
      {children}
    </label>
  );
}

export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="mt-1.5 text-xs text-[--danger]">{children}</p>;
}

/** Primary CTA — shared by every auth screen. */
export function SubmitButton({ children, pending, pendingLabel }: { children: ReactNode; pending?: boolean; pendingLabel: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary w-full gap-2.5 p-3.5 text-[15px]"
    >
      {pending ? (
        <>
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {pendingLabel}
        </>
      ) : (
        <>
          {children} <span className="text-white/60">→</span>
        </>
      )}
    </button>
  );
}
