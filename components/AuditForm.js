'use client';

import { useState } from 'react';

function normalizeUrl(input) {
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export default function AuditForm({ onSubmit, loading }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const url = normalizeUrl(value);
    try {
      new URL(url);
    } catch {
      setError('Please enter a valid URL');
      return;
    }
    setError('');
    onSubmit(url);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="url"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://example.com"
          className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          disabled={loading}
          aria-label="URL to audit"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-2xl bg-slate-900 px-6 py-3 font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? 'Auditing…' : 'Run audit'}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
  );
}
