/**
 * @param {{ $: import('cheerio').CheerioAPI }} context
 */
export const meta = {
  id: 'openGraph',
  label: 'Open Graph tags',
  severity: 'low',
  weight: 15,
  fix: 'Add <meta property="og:title">, og:description, and og:image for social/AI previews.',
};

const REQUIRED = ['og:title', 'og:description', 'og:image'];

/**
 * @param {{ $: import('cheerio').CheerioAPI }} context
 */
export default function check({ $ }) {
  const missing = REQUIRED.filter((p) => {
    const v = ($(`meta[property="${p}"]`).attr('content') || '').trim();
    return !v;
  });
  if (missing.length === 0) {
    return { ...meta, passed: true, detail: 'og:title, og:description, og:image all present.' };
  }
  return { ...meta, passed: false, detail: `Missing: ${missing.join(', ')}.` };
}
