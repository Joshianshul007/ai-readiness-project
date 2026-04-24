const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { audit } = require('@/lib/score');

function ctx(name) {
  const html = fs.readFileSync(
    path.join(__dirname, '..', 'fixtures', name),
    'utf8',
  );
  return { $: cheerio.load(html), html, url: 'https://example.com' };
}

describe('audit scoring', () => {
  it('perfect.html scores 100 with grade A', () => {
    const r = audit(ctx('perfect.html'));
    expect(r.score).toBe(100);
    expect(r.grade).toBe('A');
    expect(r.issues).toHaveLength(0);
  });
  it('barebones.html scores 0 with grade F', () => {
    const r = audit(ctx('barebones.html'));
    expect(r.score).toBe(0);
    expect(r.grade).toBe('F');
    expect(r.issues.length).toBe(5);
  });
  it('mixed.html scores 20 (meta only)', () => {
    const r = audit(ctx('mixed.html'));
    expect(r.score).toBe(20);
    expect(r.issues.map((i) => i.id).sort()).toEqual(
      expect.arrayContaining([
        'structuredData',
        'faq',
        'headings',
        'openGraph',
      ]),
    );
  });
});
