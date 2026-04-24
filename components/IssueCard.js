'use client';

import { useState } from 'react';

const DOT = { high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-slate-400' };

export default function IssueCard({ issue }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span
          className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${DOT[issue.severity] || DOT.low}`}
        />
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-slate-900">{issue.label}</div>
          <div className="mt-1 font-mono text-xs text-slate-600">
            {issue.detail}
          </div>
          {issue.fix && (
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="mt-2 text-sm text-slate-700 underline"
            >
              {open ? 'Hide fix' : 'How to fix'}
            </button>
          )}
          {open && issue.fix && (
            <div className="mt-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
              {issue.fix}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
