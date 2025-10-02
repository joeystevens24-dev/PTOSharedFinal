// /api/state.js
// Edge-compatible state API that works with either:
// - Vercel KV (KV_REST_API_URL / KV_REST_API_TOKEN)
// - Upstash Redis REST (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN)

export const config = { runtime: 'edge' };

// Detect which store you have:
const KV_URL =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// Simple feature flag: true => Vercel KV style, false => Upstash style
const IS_VERCEL_KV = Boolean(process.env.KV_REST_API_URL);

async function kvGet(key) {
  if (!KV_URL || !KV_TOKEN) return null;

  const url = `${KV_URL}/get/${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;

  const data = await res.json(); // { result: string | null }
  if (!data || data.result == null) return null;

  try {
    return JSON.parse(data.result);
  } catch {
    return null;
  }
}

async function kvSet(key, valueObj) {
  if (!KV_URL || !KV_TOKEN) return false;
  const valueStr = JSON.stringify(valueObj);

  if (IS_VERCEL_KV) {
    // Vercel KV REST: POST /set/<key> with JSON body { value: "<string>" }
    const res = await fetch(`${KV_URL}/set/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KV_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ value: valueStr }),
    });
    return res.ok;
  } else {
    // Upstash Redis REST: POST /set/<key>/<value>
    const res = await fetch(
      `${KV_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(valueStr)}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${KV_TOKEN}` },
      }
    );
    return res.ok;
  }
}

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const org = (searchParams.get('org') || 'default').toString();
  const key = `pto:${org}`;

  if (req.method === 'GET') {
    const payload = await kvGet(key);
    const body = payload ?? { org: { markets: {} }, pto: [] };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  if (req.method === 'POST') {
    let body;
    try {
      body = await req.json();
    } catch {
      body = null;
    }
    if (!body || typeof body !== 'object' || !('org' in body) || !('pto' in body)) {
      return new Response(JSON.stringify({ ok: false, error: 'invalid_body' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }
    const ok = await kvSet(key, body);
    return new Response(JSON.stringify({ ok }), {
      status: ok ? 200 : 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response('Method Not Allowed', { status: 405 });
}
