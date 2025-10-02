// api/state.js
// Node.js Serverless Function for Vercel (NOT Edge)
// Works with a standard Redis instance (self-hosted or cloud).

/*
  Environment variables (set in Vercel → Project → Settings → Environment Variables):

  Option A (recommended — single URL, with TLS if your provider supports it):
    REDIS_URL = rediss://default:<password>@<hostname>:<port>
    // use `rediss://` for TLS-enabled Redis; use `redis://` if no TLS

  Option B (separate fields):
    REDIS_HOST = <hostname>
    REDIS_PORT = 6379
    REDIS_PASSWORD = <password>
*/

let client; // cached between invocations

// Choose CommonJS to avoid ESM warnings
const { createClient } = require("redis");

// Force Node.js runtime (redis client is not supported on Edge)
module.exports.config = { runtime: "nodejs" };

// Build a connection using either REDIS_URL or host/port/password
function makeClient() {
  const url = process.env.REDIS_URL;
  if (url) {
    return createClient({ url });
  }
  const host = process.env.REDIS_HOST;
  const port = Number(process.env.REDIS_PORT || 6379);
  const password = process.env.REDIS_PASSWORD;
  if (!host) throw new Error("Redis config missing: set REDIS_URL or REDIS_HOST/PORT/PASSWORD");
  return createClient({
    socket: { host, port, tls: String(process.env.REDIS_TLS || "").toLowerCase() === "true" },
    password,
  });
}

async function getClient() {
  if (!client) {
    client = makeClient();
    client.on("error", (err) => console.error("Redis Client Error:", err?.message || err));
    await client.connect();
  }
  return client;
}

// Helper: parse JSON safely
function safeJSONParse(s, fallback) {
  try { return JSON.parse(s); } catch { return fallback; }
}

// Vercel Node function signature: (req, res)
module.exports = async (req, res) => {
  // Small health probe: /api/state?health=1
  if (req.method === "GET" && (req.query.health === "1" || req.query.health === "true")) {
    const hasUrl = Boolean(process.env.REDIS_URL);
    const hasHost = Boolean(process.env.REDIS_HOST);
    res.status(200).json({ ok: true, runtime: "node", hasUrl, hasHost });
    return;
  }

  const org = (req.query.org || "default").toString();
  const key = `pto:${org}`;

  try {
    const r = await getClient();

    if (req.method === "GET") {
      const raw = await r.get(key);
      const data = raw ? safeJSONParse(raw, null) : null;
      const body = data ?? { org: { markets: {} }, pto: [] };
      res.status(200).json(body);
      return;
    }

    if (req.method === "POST") {
      const body = typeof req.body === "object" ? req.body : safeJSONParse(req.body, null);
      if (!body || typeof body !== "object" || !("org" in body) || !("pto" in body)) {
        res.status(400).json({ ok: false, error: "invalid_body" });
        return;
      }
      await r.set(key, JSON.stringify(body));
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).send("Method Not Allowed");
  } catch (err) {
    console.error("state.js error:", err);
    res.status(500).json({ ok: false, error: "server_error", detail: String(err?.message || err) });
  }
};

  return new Response('Method Not Allowed', { status: 405 });
}
