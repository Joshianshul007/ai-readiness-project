/**
 * @param {{ $: import('cheerio').CheerioAPI }} context
 */
export const meta = {
  id: 'headings',
  label: 'Heading structure',
  severity: 'medium',
  weight: 20,
  fix: 'Use exactly one <h1>, include <h2> sections, and never skip heading levels.',
};

export default function check({ $ }) {
  const levels = [];
  $('h1,h2,h3,h4,h5,h6').each((_, el) => {
    levels.push(parseInt(el.tagName.slice(1), 10));
  });
  const h1Count = levels.filter((l) => l === 1).length;
  const h2Count = levels.filter((l) => l === 2).length;

  if (h1Count !== 1) {
    return { ...meta, passed: false, detail: `Expected exactly 1 <h1>, found ${h1Count}.` };
  }
  if (h2Count < 1) {
    return { ...meta, passed: false, detail: 'No <h2> headings found.' };
  }
  const seen = new Set();
  for (const l of levels) {
    if (l > 1 && !seen.has(l - 1)) {
      return {
        ...meta,
        passed: false,
        detail: `Heading level h${l} appears before an h${l - 1} (skipped level or wrong order).`,
      };
    }
    seen.add(l);
  }
  return { ...meta, passed: true, detail: `1 h1, ${h2Count} h2(s), no skipped levels.` };
}
