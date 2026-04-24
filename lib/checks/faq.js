/**
 * @param {{ $: import('cheerio').CheerioAPI }} context
 */
export const meta = {
  id: 'faq',
  label: 'FAQ content',
  severity: 'high',
  weight: 20,
  fix: 'Add an FAQ section (heading "FAQ" + question/answer pairs) or FAQPage schema.org JSON-LD.',
};

export default function check({ $ }) {
  let hasFaqSchema = false;
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).text();
    try {
      const data = JSON.parse(raw);
      const items = [].concat(data);
      for (const d of items) {
        if (!d || typeof d !== 'object') continue;
        const types = [].concat(d['@type'] || []);
        for (const x of types) {
          if (x === 'FAQPage' || (typeof x === 'string' && /FAQPage/i.test(x))) {
            hasFaqSchema = true;
            break;
          }
        }
      }
    } catch {
      // ignore
    }
  });
  if (hasFaqSchema) {
    return { ...meta, passed: true, detail: 'FAQPage JSON-LD detected.' };
  }

  const faqHeading = $('h1,h2,h3')
    .filter((_, el) => /faq|frequently asked/i.test($(el).text().trim()))
    .first();
  if (faqHeading.length) {
    const questionLike = faqHeading.nextAll('h2,h3,h4,dt,summary').length;
    if (questionLike >= 2) {
      return {
        ...meta,
        passed: true,
        detail: `FAQ heading found with ${questionLike} question-like siblings.`,
      };
    }
  }
  return { ...meta, passed: false, detail: 'No FAQPage schema or FAQ section detected.' };
}
