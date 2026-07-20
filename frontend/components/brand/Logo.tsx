/** Wordmark + spark tile. `mode` describes the surface it sits on, not the mark itself. */
export function Logo({ mode = "dark", size = 42 }: { mode?: "dark" | "light"; size?: number }) {
  const onDark = mode === "dark";
  const radius = Math.round(size * 0.3);
  const fontSize = Math.round(size * 0.54);
  const sparkFaint = onDark ? "rgba(10,10,11,.35)" : "rgba(255,255,255,.45)";
  const sparkStrong = onDark ? "#0A0A0B" : "#FFFFFF";

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
        <svg width="60%" height="60%" viewBox="0 0 24 24" fill="none" style={{ overflow: "visible" }}>
          {/* four-point compass / north-star mark */}
          <path
            d="M12 1 L14.4 9.6 L23 12 L14.4 14.4 L12 23 L9.6 14.4 L1 12 L9.6 9.6 Z"
            fill={sparkStrong}
          />
          {/* faint diagonal rays */}
          <path
            d="M12 6.5 L13 11 L17.5 12 L13 13 L12 17.5 L11 13 L6.5 12 L11 11 Z"
            fill={sparkFaint}
          />
        </svg>
      </div>
      <span
        className="font-bold"
        style={{ fontSize, letterSpacing: "-.03em", color: onDark ? "#FAFAFA" : "#0A0A0B" }}
      >
        Astrex<span style={{ color: "#8A8A8F" }}>.ai</span>
      </span>
    </div>
  );
}
