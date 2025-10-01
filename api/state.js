// Edge-compatible KV via REST API (no @vercel/kv import needed)
export const config = { runtime: 'edge' };

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

async function kvGet(key) {
  if (!KV_URL || !KV_TOKEN) return null;
  const res = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const data = await res.json(); // { result: string | null }
  if (!data || data.result == null) return null;
  try { return JSON.parse(data.result); } catch { return null; }
}

async function kvSet(key, valueObj) {
  if (!KV_URL || !KV_TOKEN) return false;
  const res = await fetch(`${KV_URL}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: JSON.stringify(valueObj) }),
  });
  return res.ok;
}

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const org = searchParams.get('org') || 'default';
  const key = `pto:${org}`;

  if (req.method === 'GET') {
    const payload = await kvGet(key);
    const body = payload ?? { org: { markets: {} }, pto: [] };
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
  }

  if (req.method === 'POST') {
    let body;
    try { body = await req.json(); } catch { body = null; }
    if (!body || typeof body !== 'object' || !('org' in body) || !('pto' in body)) {
      return new Response(JSON.stringify({ ok: false, error: 'invalid_body' }), { status: 400, headers: { 'content-type': 'application/json' } });
    }
    const ok = await kvSet(key, body);
    return new Response(JSON.stringify({ ok }), { status: ok ? 200 : 500, headers: { 'content-type': 'application/json' } });
  }

  return new Response('Method Not Allowed', { status: 405 });
}
