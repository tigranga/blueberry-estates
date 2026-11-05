// Cloudflare Pages Function: GET/POST /api/blocked-dates
// Bindings: DB (D1)

export async function onRequestGet(context) {
  const { env } = context;
  if (!env.DB) return new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } });

  const { results } = await env.DB.prepare('SELECT date FROM blocked_dates ORDER BY date').all();
  const dates = results.map(r => r.date);
  return new Response(JSON.stringify(dates), { headers: { 'Content-Type': 'application/json' } });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.DB) return new Response('Database not configured', { status: 500 });

  const { dates } = await request.json(); // array of YYYY-MM-DD
  if (!Array.isArray(dates)) return new Response('dates array required', { status: 400 });

  for (const date of dates) {
    await env.DB.prepare('INSERT OR IGNORE INTO blocked_dates (date) VALUES (?)').bind(date).run();
  }
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  if (!env.DB) return new Response('Database not configured', { status: 500 });

  const { date } = await request.json();
  await env.DB.prepare('DELETE FROM blocked_dates WHERE date = ?').bind(date).run();
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}