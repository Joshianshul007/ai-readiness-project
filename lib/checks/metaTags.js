/**
 * @param {{ $: import('cheerio').CheerioAPI }} context
 */
export const meta = {
  id: 'metaTags',
  label: 'Title and meta description',
  severity: 'medium',
  weight: 20,
  fix: 'Add a <title> (10–70 chars) and <meta name="description"> (50–160 chars).',
};

export default function check({ $ }) {
  const title = ($('title').first().text() || '').trim();
  const desc = ($('meta[name="description"]').attr('content') || '').trim();
  const titleOk = title.length >= 10 && title.length <= 70;
  const descOk = desc.length >= 50 && desc.length <= 160;
  if (titleOk && descOk) {
    return {
      ...meta,
      passed: true,
      detail: `Title ${title.length} chars, description ${desc.length} chars.`,
    };
  }
  const reasons = [];
  if (!title) reasons.push('title missing');
  else if (!titleOk) reasons.push(`title ${title.length} chars (want 10–70)`);
  if (!desc) reasons.push('description missing');
  else if (!descOk) reasons.push(`description ${desc.length} chars (want 50–160)`);
  return { ...meta, passed: false, detail: reasons.join('; ') };
}
