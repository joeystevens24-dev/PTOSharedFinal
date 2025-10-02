export const config = { runtime: 'edge' };

export default async function handler(req) {
  const vars = {
    has_VERCEL_KV_URL: Boolean(process.env.KV_REST_API_URL),
    has_VERCEL_KV_TOKEN: Boolean(process.env.KV_REST_API_TOKEN),
    has_UPSTASH_URL: Boolean(process.env.UPSTASH_REDIS_REST_URL),
    has_UPSTASH_TOKEN: Boolean(process.env.UPSTASH_REDIS_REST_TOKEN),
    kv_url_prefix: (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '').slice(0, 32),
    runtime: 'edge',
  };
  return new Response(JSON.stringify(vars), { status: 200, headers: { 'content-type': 'application/json' } });
}
