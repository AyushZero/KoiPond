interface Props {
  /** 0..1 progress toward the goal */
  progress: number;
  running: boolean;
  size?: number;
  isEndless?: boolean;
  mode?: "dark" | "light";
}

export function TimerRing({ progress, running, size = 280, isEndless = false, mode = "dark" }: Props) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(1, Math.max(0, progress));

  if (isEndless) {
    return (
      <div className="relative" style={{ width: size, height: size }}>
        {/* Black hole / ethereal center effect in dark abyss mode */}
        {mode === "dark" && (
          <div
            className="absolute inset-4 rounded-full pointer-events-none transition-all duration-700"
            style={{
              background: "radial-gradient(circle, #000000 70%, rgba(20,20,25,0.8) 95%, transparent 100%)",
              boxShadow: running
                ? "0 0 35px 2px rgba(255, 255, 255, 0.08), inset 0 0 25px rgba(0, 0, 0, 0.95)"
                : "none",
            }}
          />
        )}

        {/* Light mode ripple aura */}
        {mode === "light" && (
          <div
            className="absolute inset-4 rounded-full pointer-events-none transition-all duration-700"
            style={{
              background: "radial-gradient(circle, rgba(255,255,255,0.7) 60%, transparent 100%)",
              boxShadow: running ? "0 0 30px rgba(194, 107, 69, 0.12)" : "none",
            }}
          />
        )}

        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className={`block ${running ? "animate-spin-slow" : ""}`}
          style={{ animationDuration: "36s" }}
          role="img"
          aria-label="Endless session running"
        >
          {/* Subtle outer orbit ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={
              mode === "dark"
                ? "rgba(255, 255, 255, 0.15)"
                : "color-mix(in srgb, var(--z-accent) 25%, transparent)"
            }
            strokeWidth={stroke * 0.75}
            strokeDasharray="4 8"
          />

          {/* Glowing celestial accretion / ripple arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r - 3}
            fill="none"
            stroke={mode === "dark" ? "#ffffff" : "var(--z-accent)"}
            strokeWidth={mode === "dark" ? 2 : stroke}
            strokeLinecap="round"
            strokeDasharray={`${c * 0.28} ${c * 0.06} ${c * 0.15} ${c * 0.51}`}
            style={{
              opacity: running ? 0.9 : 0.4,
              filter:
                mode === "dark" && running
                  ? "drop-shadow(0 0 8px rgba(255, 255, 255, 0.8))"
                  : "none",
              transition: "opacity 400ms ease",
            }}
          />
        </svg>
      </div>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="block"
      role="img"
      aria-label={`Session progress ${Math.round(p * 100)}%`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="color-mix(in srgb, var(--z-textMuted) 18%, transparent)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--z-accent)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - p)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{
          transition: "stroke-dashoffset 300ms linear",
          opacity: p > 0 ? 1 : 0.35,
          filter: running ? "none" : "saturate(0.7)",
        }}
      />
    </svg>
  );
}
