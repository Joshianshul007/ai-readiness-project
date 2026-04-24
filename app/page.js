'use client';

import { useState } from 'react';
import AuditForm from '@/components/AuditForm';
import ResultsPanel from '@/components/ResultsPanel';

const ERROR_COPY = {
  INVALID_URL: 'Please enter a valid URL.',
  BLOCKED_HOST: "Private and internal URLs aren't supported.",
  NOT_HTML: "That URL doesn't point to an HTML page.",
  TIMEOUT: 'The site took too long to respond.',
  HTTP_ERROR: 'The site returned an error when we tried to load it.',
  UNREACHABLE: "We couldn't reach that site.",
  PARSE_FAILED: "We couldn't parse the page as HTML.",
  INTERNAL: 'Something went wrong.',
};

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function runAudit(url) {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          Object.prototype.hasOwnProperty.call(ERROR_COPY, data.error)
            ? ERROR_COPY[data.error]
            : ERROR_COPY.INTERNAL,
        );
        return;
      }
      setResult(data);
    } catch {
      setError(ERROR_COPY.INTERNAL);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="mx-auto max-w-5xl px-6 py-6">
        <div className="text-sm font-semibold tracking-tight text-slate-900">
          AI Readiness Audit
        </div>
      </header>

      <section className="mx-auto flex max-w-5xl flex-col items-center px-6 pb-20 pt-8">
        <h1 className="text-center text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Is your site ready for AI?
        </h1>
        <p className="mt-3 max-w-xl text-center text-slate-600">
          Paste a public URL. We fetch the page, run five structure checks, and
          score it out of 100.
        </p>

        <div className="mt-8 flex w-full justify-center">
          <AuditForm onSubmit={runAudit} loading={loading} />
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {loading && (
          <div className="mt-10 w-full max-w-2xl animate-pulse rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
            <div className="mx-auto h-40 w-40 rounded-full bg-slate-100" />
            <div className="mt-6 space-y-2">
              <div className="h-4 w-1/2 rounded bg-slate-100" />
              <div className="h-4 w-3/4 rounded bg-slate-100" />
            </div>
            <p className="mt-4 text-center text-sm text-slate-500">
              Fetching… parsing… scoring…
            </p>
          </div>
        )}

        {result && !loading && (
          <ResultsPanel result={result} onReset={() => setResult(null)} />
        )}
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-4 text-xs text-slate-500">
          Audits run on the server. We don&apos;t store your URLs.
        </div>
      </footer>
    </main>
  );
}
