const cheerio = require('cheerio');
const check = require('@/lib/checks/metaTags').default;
const run = (html) => check({ $: cheerio.load(html), html, url: '' });

const okDesc =
  'This meta description is definitely long enough to satisfy the length requirement.';

describe('metaTags check', () => {
  it('passes with good title and description', () => {
    const html = `<title>Reasonable page title for testing</title><meta name="description" content="${okDesc}">`;
    expect(run(html).passed).toBe(true);
  });
  it('fails with missing title', () => {
    const html = `<meta name="description" content="${okDesc}">`;
    expect(run(html).passed).toBe(false);
  });
  it('fails with too-short description', () => {
    const html = '<title>Reasonable page title for testing</title><meta name="description" content="short">';
    expect(run(html).passed).toBe(false);
  });
});
