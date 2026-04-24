const cheerio = require('cheerio');
const check = require('@/lib/checks/headings').default;
const run = (html) => check({ $: cheerio.load(html), html, url: '' });

describe('headings check', () => {
  it('passes with exactly one h1 and h2s and no skipped levels', () => {
    expect(run('<h1>A</h1><h2>B</h2><h3>C</h3>').passed).toBe(true);
  });
  it('fails with zero h1', () => {
    expect(run('<h2>B</h2>').passed).toBe(false);
  });
  it('fails with multiple h1', () => {
    expect(run('<h1>A</h1><h1>B</h1><h2>C</h2>').passed).toBe(false);
  });
  it('fails when h3 appears before h2', () => {
    expect(run('<h1>A</h1><h3>C</h3>').passed).toBe(false);
  });
});
