const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const check = require('@/lib/checks/faq').default;

function load(name) {
  const html = fs.readFileSync(
    path.join(__dirname, '..', '..', 'fixtures', name),
    'utf8',
  );
  return { $: cheerio.load(html), html, url: 'https://example.com' };
}

describe('faq check', () => {
  it('passes when FAQPage JSON-LD exists', () => {
    expect(check(load('perfect.html')).passed).toBe(true);
  });

  it('passes when a heading says FAQ and has question children', () => {
    const $ = cheerio.load(
      '<h2>FAQ</h2><h3>What?</h3><h3>Why?</h3>',
    );
    expect(check({ $, html: '', url: '' }).passed).toBe(true);
  });

  it('fails when page has no FAQ signal', () => {
    expect(check(load('barebones.html')).passed).toBe(false);
  });
});
