interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  /** Override the automatic score-based color (e.g. to use a category color) */
  color?: string;
}

function scoreToColor(score: number): string {
  if (score >= 80) return "#059669";
  if (score >= 60) return "#0284c7";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

export function ScoreRing({ score, size = 96, strokeWidth = 6, color }: ScoreRingProps) {
  const c = color ?? scoreToColor(score);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="absolute top-0 left-0"
        style={{ transform: "rotate(-90deg)" }}
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e7e5e4"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={c}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="flex flex-col items-center justify-center leading-none select-none">
        <span style={{ color: c, fontSize: size * 0.28, fontWeight: 700, lineHeight: 1 }}>
          {score}
        </span>
        <span style={{ color: "#a8a29e", fontSize: size * 0.15, marginTop: size * 0.03 }}>
          /100
        </span>
      </div>
    </div>
  );
}
