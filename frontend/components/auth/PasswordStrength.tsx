const LEVELS = [
  { label: "Too short", hint: "Use at least 8 characters." },
  { label: "Weak", hint: "Add a number and a symbol." },
  { label: "Fair", hint: "Add a symbol or more length." },
  { label: "Good", hint: "Add a symbol for a stronger password." },
  { label: "Strong", hint: "8+ chars with a number and symbol." },
] as const;

/**
 * Bar colour per score, kept semantic rather than on-brand: this meter reports
 * good/bad, not "clickable", so it never reaches for accent blue.
 * Static lookup — never build `bg-${x}-500` from a variable, that class never
 * compiles because Tailwind scans source statically.
 */
const BAR_COLOR = ["bg-hairline-strong", "bg-red-500", "bg-amber-500", "bg-amber-500", "bg-emerald-500"] as const;

/**
 * 0–4, matching the meter's four bars. Length is the gate: under 8 characters
 * nothing else can lift the score, since that's what the API enforces.
 */
export function scorePassword(password: string): number {
  if (password.length < 8) return 0;
  let score = 1;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (password.length >= 12) score++;
  return Math.min(score, 4);
}

export function PasswordStrength({ score, show }: { score: number; show: boolean }) {
  if (!show) return null;
  const level = LEVELS[score];
  const barColor = BAR_COLOR[score] ?? BAR_COLOR[0];

  return (
    <div aria-live="polite">
      <div className="mt-2.5 flex gap-[5px]">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-sm transition-colors ${i < score ? barColor : "bg-hairline"}`}
          />
        ))}
      </div>
      <div className="mt-1.5 text-xs text-ink-muted">
        {level.label} — {level.hint}
      </div>
    </div>
  );
}
