import React from "react";

function clamp01(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

export default function RadialGauge({
  value,
  label,
  tone = "primary",
  suffix = "",
  size = 92,
  stroke = 10,
}) {
  const pct = clamp01(Number(value) / 100);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * pct;
  const gap = c - dash;
  const color =
    tone === "warm"
      ? "#ffb020"
      : tone === "cool"
        ? "#58a6ff"
        : "#00ff88";

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div
        className="relative grid place-items-center"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} className="rotate-[-90deg]">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="transparent"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="transparent"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${gap}`}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="text-xl font-headline font-extrabold">
              {Number.isFinite(Number(value)) ? Math.round(Number(value)) : "—"}
              {suffix}
            </div>
          </div>
        </div>
      </div>
      <div className="text-[11px] font-bold tracking-[0.18em] uppercase text-agri-text-muted">
        {label}
      </div>
    </div>
  );
}

