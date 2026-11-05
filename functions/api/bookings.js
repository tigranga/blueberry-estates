// Cloudflare Pages Function: GET /api/bookings
// Bindings: DB (D1)
// Note: In production, protect this endpoint (e.g. with a simple auth header or Cloudflare Access)

export async function onRequestGet(context) {
  const { env } = context;
  if (!env.DB) return new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } });

  const { results } = await env.DB.prepare(`
    SELECT id, guest_name, guest_email, checkin, checkout, guests, amount_cents, status, created_at
    FROM bookings ORDER BY created_at DESC
  `).all();

  return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
}