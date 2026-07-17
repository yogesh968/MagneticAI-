/** Wordmark + dipole-arc tile. `mode` describes the surface it sits on, not the mark itself. */
export function Logo({ mode = "dark", size = 34 }: { mode?: "dark" | "light"; size?: number }) {
  const onDark = mode === "dark";
  const radius = Math.round(size * 0.3);
  const fontSize = Math.round(size * 0.56);
  const arcFaint = onDark ? "rgba(10,10,11,.35)" : "rgba(255,255,255,.5)";
  const arcStrong = onDark ? "#0A0A0B" : "#FFFFFF";

  return (
    <div className="inline-flex items-center gap-2.5 leading-none">
      <div
        className="relative flex flex-none items-center justify-center"
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          background: onDark ? "#FAFAFA" : "#0A0A0B",
          boxShadow: onDark
            ? "0 4px 14px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.6)"
            : "0 6px 18px rgba(10,10,11,.28), inset 0 1px 0 rgba(255,255,255,.14)",
        }}
      >
        <svg width="62%" height="62%" viewBox="0 0 24 24" fill="none" style={{ overflow: "visible" }}>
          <path d="M4.5 17.5 A7.5 7.5 0 0 1 19.5 17.5" stroke={arcFaint} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M7.5 17.5 A4.5 4.5 0 0 1 16.5 17.5" stroke={arcStrong} strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="17.5" r="2" fill={arcStrong} />
        </svg>
      </div>
      <span
        className="font-bold"
        style={{ fontSize, letterSpacing: "-.03em", color: onDark ? "#FAFAFA" : "#0A0A0B" }}
      >
        Magnetic<span style={{ color: "#8A8A8F" }}> AI</span>
      </span>
    </div>
  );
}
