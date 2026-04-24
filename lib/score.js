import { CHECK_RUNNERS } from './checks';

/**
 * @param {{ $: import('cheerio').CheerioAPI, html: string, url: string }} context
 */
export function audit(context) {
  const results = CHECK_RUNNERS.map(({ run, meta }) => {
    try {
      return run(context);
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      return { ...meta, passed: false, detail: err, fix: meta.fix || '' };
    }
  });
  const score = results
    .filter((r) => r.passed)
    .reduce((s, r) => s + (r.weight || 0), 0);
  const grade =
    score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F';
  const issues = results.filter((r) => !r.passed);
  const passed = results.filter((r) => r.passed);
  return { score, grade, issues, passed };
}
