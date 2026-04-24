const { validateUrl } = require('@/lib/fetchPage');

describe('validateUrl', () => {
  it('accepts https URLs', () => {
    expect(validateUrl('https://example.com').ok).toBe(true);
  });
  it('accepts http URLs', () => {
    expect(validateUrl('http://example.com').ok).toBe(true);
  });
  it('rejects non-http(s)', () => {
    expect(validateUrl('ftp://example.com').ok).toBe(false);
  });
  it('rejects garbage', () => {
    expect(validateUrl('not a url').ok).toBe(false);
  });
  it('blocks localhost', () => {
    expect(validateUrl('http://localhost:3000').ok).toBe(false);
  });
  it('blocks 127.0.0.1', () => {
    expect(validateUrl('http://127.0.0.1').ok).toBe(false);
  });
  it('blocks 10.x private', () => {
    expect(validateUrl('http://10.0.0.1').ok).toBe(false);
  });
  it('blocks 192.168.x private', () => {
    expect(validateUrl('http://192.168.1.1').ok).toBe(false);
  });
});
