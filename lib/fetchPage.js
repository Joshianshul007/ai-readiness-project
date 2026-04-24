const PRIVATE_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^0\.0\.0\.0$/,
  /^::1$/i,
  /^fe80:/i,
];

/**
 * @param {string} input
 */
export function validateUrl(input) {
  let u;
  try {
    u = new URL(input);
  } catch {
    return { ok: false, error: 'INVALID_URL' };
  }
  if (!['http:', 'https:'].includes(u.protocol)) {
    return { ok: false, error: 'INVALID_URL' };
  }
  if (PRIVATE_PATTERNS.some((p) => p.test(u.hostname))) {
    return { ok: false, error: 'BLOCKED_HOST' };
  }
  return { ok: true, url: u.toString() };
}

const MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 8000;
const USER_AGENT =
  'Mozilla/5.0 (compatible; AIReadinessBot/1.0; +https://example.com/bot)';

/**
 * @param {string} rawUrl
 */
export async function fetchPage(rawUrl) {
  const v = validateUrl(rawUrl);
  if (!v.ok) return { ok: false, error: v.error };

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(v.url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
      },
    });
    if (!res.ok) {
      return { ok: false, error: 'HTTP_ERROR', status: res.status };
    }
    const ct = res.headers.get('content-type') || '';
    if (!/text\/html|application\/xhtml\+xml/i.test(ct)) {
      return { ok: false, error: 'NOT_HTML' };
    }
    const buf = await res.arrayBuffer();
    const bytes = buf.byteLength > MAX_BYTES ? buf.slice(0, MAX_BYTES) : buf;
    const html = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    return { ok: true, url: v.url, html };
  } catch (e) {
    if (e && typeof e === 'object' && 'name' in e && e.name === 'AbortError') {
      return { ok: false, error: 'TIMEOUT' };
    }
    return { ok: false, error: 'UNREACHABLE' };
  } finally {
    clearTimeout(t);
  }
}
