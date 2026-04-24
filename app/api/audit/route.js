import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { fetchPage } from '@/lib/fetchPage';
import { audit } from '@/lib/score';

const ERROR_STATUS = {
  INVALID_URL: 400,
  BLOCKED_HOST: 400,
  NOT_HTML: 415,
  TIMEOUT: 504,
  HTTP_ERROR: 502,
  UNREACHABLE: 502,
  PARSE_FAILED: 500,
  INTERNAL: 500,
};

export const runtime = 'nodejs';

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_URL' }, { status: 400 });
  }

  const url = body?.url;
  if (typeof url !== 'string' || !url.trim()) {
    return NextResponse.json({ error: 'INVALID_URL' }, { status: 400 });
  }

  const fetched = await fetchPage(url);
  if (!fetched.ok) {
    return NextResponse.json(
      { error: fetched.error, status: fetched.status },
      { status: ERROR_STATUS[fetched.error] ?? 500 },
    );
  }

  let $;
  try {
    $ = cheerio.load(fetched.html);
  } catch {
    return NextResponse.json({ error: 'PARSE_FAILED' }, { status: 500 });
  }

  const result = audit({ $, html: fetched.html, url: fetched.url });
  return NextResponse.json({
    url: fetched.url,
    fetchedAt: new Date().toISOString(),
    ...result,
  });
}
