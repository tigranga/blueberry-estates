import { database, hostAuth, json } from "./store.js";

function nights(checkin, checkout) {
  if (!checkin || !checkout) return [];
  const out = [];
  const cursor = new Date(`${checkin}T00:00:00Z`);
  const end = new Date(`${checkout}T00:00:00Z`);
  while (cursor < end) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

export default async (req) => {
  const db = database();

  if (req.method === "GET") {
    const blocked = await db.sql`SELECT date FROM blocked_dates ORDER BY date`;
    const stays = await db.sql`SELECT checkin, checkout FROM bookings WHERE status <> 'cancelled'`;
    const dates = new Set(blocked.map((row) => row.date));
    for (const stay of stays) nights(stay.checkin, stay.checkout).forEach((date) => dates.add(date));
    return json([...dates].sort());
  }

  const auth = hostAuth(req);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  if (req.method === "POST") {
    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.dates)) return json({ error: "dates array required" }, 400);
    for (const date of body.dates) {
      if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      await db.sql`INSERT INTO blocked_dates (date) VALUES (${date}) ON CONFLICT (date) DO NOTHING`;
    }
    return json({ ok: true });
  }

  if (req.method === "DELETE") {
    const body = await req.json().catch(() => null);
    if (!body?.date) return json({ error: "date required" }, 400);
    await db.sql`DELETE FROM blocked_dates WHERE date = ${body.date}`;
    return json({ ok: true });
  }

  return json({ error: "Method not allowed" }, 405);
};

export const config = { path: "/api/blocked-dates" };
