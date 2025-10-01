import { kv } from '@vercel/kv';

// Simple JSON bag-of-state per org.
// GET /api/state?org=<id>  -> returns { org, pto }
// POST body: { org, pto }  -> saves and returns { ok: true }

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const org = searchParams.get('org') || 'default';

  if (req.method === 'GET') {
    const data = await kv.get(`pto:${org}`);
    if (!data) {
      // initialize empty on first GET
      const empty = { org: { markets: {} }, pto: [] };
      return new Response(JSON.stringify(empty), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Response(JSON.stringify(data), { status: 200, headers: { 'content-type': 'application/json' } });
  }

  if (req.method === 'POST') {
    const body = await req.json();
    // basic validation
    if (!body || typeof body !== 'object' || !('org' in body) || !('pto' in body)) {
      return new Response(JSON.stringify({ ok: false, error: 'invalid_body' }), { status: 400, headers: { 'content-type': 'application/json' } });
    }
    await kv.set(`pto:${org}`, body);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
  }

  return new Response('Method Not Allowed', { status: 405 });
}
