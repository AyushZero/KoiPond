interface Props {
  /** 0..1 progress toward the goal */
  progress: number;
  running: boolean;
  size?: number;
}

export function TimerRing({ progress, running, size = 280 }: Props) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(1, Math.max(0, progress));

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
