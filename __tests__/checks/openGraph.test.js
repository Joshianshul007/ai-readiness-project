const cheerio = require('cheerio');
const check = require('@/lib/checks/openGraph').default;
const run = (html) => check({ $: cheerio.load(html), html, url: '' });

describe('openGraph check', () => {
  it('passes when all three OG tags present', () => {
    const html =
      '<meta property="og:title" content="A"><meta property="og:description" content="B"><meta property="og:image" content="C">';
    expect(run(html).passed).toBe(true);
  });
  it('fails when og:image missing', () => {
    const html =
      '<meta property="og:title" content="A"><meta property="og:description" content="B">';
    expect(run(html).passed).toBe(false);
  });
});
