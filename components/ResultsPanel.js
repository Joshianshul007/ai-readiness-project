'use client';

import ScoreDial from './ScoreDial';
import IssueCard from './IssueCard';

export default function ResultsPanel({ result, onReset }) {
  return (
    <div className="mt-8 w-full max-w-2xl">
      <div className="flex flex-col items-center gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <ScoreDial score={result.score} grade={result.grade} />
        <div className="text-center">
          <div className="break-all text-sm text-slate-600">{result.url}</div>
          <div className="text-xs text-slate-400">
            Audited {new Date(result.fetchedAt).toLocaleString()}
          </div>
        </div>
      </div>

      <h2 className="mt-8 text-lg font-semibold text-slate-900">
        {result.issues.length === 0
          ? 'No issues found'
          : `${result.issues.length} issue(s) found`}
      </h2>
      <div className="mt-3 space-y-3">
        {result.issues.map((i) => (
          <IssueCard key={i.id} issue={i} />
        ))}
      </div>

      {result.passed.length > 0 && (
        <details className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          <summary className="cursor-pointer">
            {result.passed.length} checks passed ✓
          </summary>
          <ul className="mt-2 space-y-1">
            {result.passed.map((p) => (
              <li key={p.id}>• {p.label}</li>
            ))}
          </ul>
        </details>
      )}

      <button
        type="button"
        onClick={onReset}
        className="mt-6 text-sm text-slate-700 underline"
      >
        Audit another URL
      </button>
    </div>
  );
}
