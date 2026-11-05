// Public read / host write for listings + calendar.
// Binding: DB (D1). Secret: ADMIN_TOKEN.

const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers });

async function ensure(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS site_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
  )`).run();
}

async function readKey(env, key) {
  const row = await env.DB.prepare('SELECT value FROM site_state WHERE key = ?').bind(key).first();
  if (!row) return null;
  try { return JSON.parse(row.value); } catch { return null; }
}

export async function onRequestGet(context) {
  const { env } = context;
  if (!env.DB) return json({ connected: false, listings: null, calendar: null });
  try {
    await ensure(env);
    const listings = await readKey(env, 'listings');
    const calendar = await readKey(env, 'calendar');
    return json({ connected: true, listings, calendar });
  } catch (err) {
    return json({ connected: false, error: String(err), listings: null, calendar: null }, 500);
  }
}

export async function onRequestPut(context) {
  const { env, request } = context;
  if (!env.DB) {
    return json({ error: 'Database is not connected. In Cloudflare, bind a D1 database as DB.' }, 503);
  }
  if (!env.ADMIN_TOKEN) {
    return json({ error: 'Set the ADMIN_TOKEN secret on the Pages project, then enter that same host key here.' }, 503);
  }
  const auth = request.headers.get('Authorization') || '';
  if (auth !== `Bearer ${env.ADMIN_TOKEN}`) {
    return json({ error: 'Host key does not match ADMIN_TOKEN.' }, 401);
  }

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  await ensure(env);
  const put = async (key, value) => {
    await env.DB.prepare(
      `INSERT INTO site_state (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    ).bind(key, JSON.stringify(value)).run();
  };

  if (Array.isArray(body.listings)) await put('listings', body.listings);
  if (body.calendar && typeof body.calendar === 'object') await put('calendar', body.calendar);
  return json({ ok: true });
}
