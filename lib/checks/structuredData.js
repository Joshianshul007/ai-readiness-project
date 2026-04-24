/**
 * @param {{ $: import('cheerio').CheerioAPI }} context
 */
export const meta = {
  id: 'structuredData',
  label: 'Structured data (schema.org JSON-LD)',
  severity: 'high',
  weight: 25,
  fix: 'Add a <script type="application/ld+json"> block describing your page using schema.org vocabulary.',
};

export default function check({ $ }) {
  const scripts = $('script[type="application/ld+json"]');
  if (scripts.length === 0) {
    return { ...meta, passed: false, detail: 'No JSON-LD script tags found.' };
  }
  let validCount = 0;
  scripts.each((_, el) => {
    const raw = $(el).text();
    try {
      JSON.parse(raw);
      validCount += 1;
    } catch {
      // invalid block
    }
  });
  if (validCount === 0) {
    return {
      ...meta,
      passed: false,
      detail: `Found ${scripts.length} JSON-LD block(s) but all had invalid JSON.`,
    };
  }
  return { ...meta, passed: true, detail: `Found ${validCount} valid JSON-LD block(s).` };
}
