'use client';

import { useEffect, useState } from 'react';
import type { ScoreResult } from '@aetherlink/core';

export function ScoreBar({ result }: { result: ScoreResult }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const t = requestAnimationFrame(() => setWidth(result.score));
    return () => cancelAnimationFrame(t);
  }, [result.score]);

  const colorClass =
    result.percentileColor === 'green'
      ? 'text-[var(--success)]'
      : result.percentileColor === 'amber'
        ? 'text-[var(--warning)]'
        : 'text-[var(--danger)]';

  const barClass =
    result.percentileColor === 'green'
      ? 'score-bar-fill high'
      : result.percentileColor === 'amber'
        ? 'score-bar-fill mid'
        : 'score-bar-fill low';

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between">
        <span className={`score-bar-value font-display text-3xl font-bold ${colorClass}`}>
          {result.score}%
        </span>
        <span className="font-mono text-sm text-[var(--text-secondary)]">{result.percentileLabel}</span>
      </div>
      <div className="score-bar h-2 overflow-hidden rounded-full">
        <div
          className={`h-full rounded-full transition-all duration-[600ms] ease-out ${barClass}`}
          style={{ '--score-width': `${width}%` } as React.CSSProperties}
        />
      </div>
      <p className="text-sm text-[var(--text-secondary)]">
        {result.matched.length} matched · {result.missing.length} gaps
      </p>
    </div>
  );
}
