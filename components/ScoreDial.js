'use client';

import { useEffect, useState } from 'react';

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default function ScoreDial({ score, grade }) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const duration = 900;
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = easeInOutCubic(t);
      setDisplayed(Math.round(score * eased));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setDisplayed(score);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [score]);

  const r = 70;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - displayed / 100);
  const color =
    score >= 85
      ? '#16a34a'
      : score >= 70
        ? '#65a30d'
        : score >= 55
          ? '#ca8a04'
          : score >= 40
            ? '#ea580c'
            : '#dc2626';

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: 180, height: 180 }}
    >
      <svg width="180" height="180" className="-rotate-90" aria-hidden>
        <circle
          cx="90"
          cy="90"
          r={r}
          stroke="#e2e8f0"
          strokeWidth="14"
          fill="none"
        />
        <circle
          cx="90"
          cy="90"
          r={r}
          stroke={color}
          strokeWidth="14"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <div className="text-4xl font-bold text-slate-900">{displayed}</div>
        <div className="text-sm text-slate-500">Grade {grade}</div>
      </div>
    </div>
  );
}
