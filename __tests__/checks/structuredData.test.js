const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const check = require('@/lib/checks/structuredData').default;

function load(name) {
  const html = fs.readFileSync(
    path.join(__dirname, '..', '..', 'fixtures', name),
    'utf8',
  );
  return { $: cheerio.load(html), html, url: 'https://example.com' };
}

describe('structuredData check', () => {
  it('passes when valid JSON-LD exists', () => {
    const result = check(load('perfect.html'));
    expect(result.passed).toBe(true);
  });

  it('fails when no JSON-LD present', () => {
    const result = check(load('barebones.html'));
    expect(result.passed).toBe(false);
    expect(result.detail).toMatch(/no.*json-ld/i);
  });

  it('fails when JSON-LD is malformed', () => {
    const $ = cheerio.load(
      '<script type="application/ld+json">{broken</script>',
    );
    const result = check({ $, html: '', url: '' });
    expect(result.passed).toBe(false);
    expect(result.detail).toMatch(/invalid/i);
  });
});
