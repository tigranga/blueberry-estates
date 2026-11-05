import { database, hostAuth, json, readJSON, writeJSON } from "./store.js";

function blockedFromCalendar(calendar) {
  const days = calendar && calendar.days && typeof calendar.days === "object" ? calendar.days : {};
  return Object.entries(days)
    .filter(([date, value]) => /^\d{4}-\d{2}-\d{2}$/.test(date) && value && value.blocked)
    .map(([date]) => date);
}

export default async (req) => {
  if (req.method === "GET") {
    try {
      const listings = await readJSON("listings", null);
      const calendar = await readJSON("calendar", null);
      return json({ connected: true, listings, calendar });
    } catch (err) {
      return json({ connected: false, error: String(err && err.message ? err.message : err), listings: null, calendar: null }, 500);
    }
  }

  if (req.method === "PUT") {
    const auth = hostAuth(req);
    if (!auth.ok) return json({ error: auth.error }, auth.status);
    let body;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
    try {
      if (Array.isArray(body.listings)) await writeJSON("listings", body.listings);
      if (body.calendar && typeof body.calendar === "object") {
        await writeJSON("calendar", body.calendar);
        const db = database();
        const dates = blockedFromCalendar(body.calendar);
        await db.sql`DELETE FROM blocked_dates`;
        for (const date of dates) {
          await db.sql`INSERT INTO blocked_dates (date) VALUES (${date}) ON CONFLICT (date) DO NOTHING`;
        }
      }
    } catch (err) {
      return json({ error: String(err && err.message ? err.message : err) }, 500);
    }
    return json({ ok: true });
  }

  return json({ error: "Method not allowed" }, 405);
};

export const config = { path: "/api/content" };
