import { database, hostAuth, json } from "./store.js";

function publicStay(row) {
  return { checkin: row.checkin, checkout: row.checkout, status: row.status };
}

function hostStay(row) {
  return {
    id: Number(row.id),
    stripe_session_id: row.stripe_session_id,
    guest_name: row.guest_name || "",
    guest_email: row.guest_email || "",
    name: row.guest_name || "",
    email: row.guest_email || "",
    checkin: row.checkin || "",
    checkout: row.checkout || "",
    guests: row.guests || 1,
    amount_cents: row.amount_cents || 0,
    status: row.status,
    message: row.message || "",
    created_at: row.created_at,
  };
}

export default async (req) => {
  const db = database();

  try {
    if (req.method === "GET") {
      const header = req.headers.get("Authorization") || "";
      if (!header) {
        const rows = await db.sql`
          SELECT checkin, checkout, status
          FROM bookings
          WHERE status <> 'cancelled'
          ORDER BY checkin
        `;
        return json(rows.map(publicStay));
      }
      const auth = hostAuth(req);
      if (!auth.ok) return json({ error: auth.error }, auth.status);
      const rows = await db.sql`
        SELECT id, stripe_session_id, guest_name, guest_email, checkin, checkout, guests, amount_cents, status, message, created_at
        FROM bookings
        ORDER BY created_at DESC
      `;
      return json(rows.map(hostStay));
    }

    const auth = hostAuth(req);
    if (!auth.ok) return json({ error: auth.error }, auth.status);

    let body;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
    const id = Number(body.id);
    if (!id) return json({ error: "Booking id required" }, 400);

    if (req.method === "PATCH") {
      const status = body.status === "confirmed" || body.status === "cancelled" || body.status === "paid" || body.status === "pending"
        ? body.status
        : null;
      if (!status) return json({ error: "Unknown status" }, 400);
      const rows = await db.sql`
        UPDATE bookings SET status = ${status} WHERE id = ${id} RETURNING id
      `;
      if (!rows.length) return json({ error: "Booking not found" }, 404);
      return json({ ok: true });
    }

    if (req.method === "DELETE") {
      const rows = await db.sql`DELETE FROM bookings WHERE id = ${id} RETURNING id`;
      if (!rows.length) return json({ error: "Booking not found" }, 404);
      return json({ ok: true });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (err) {
    return json({ error: String(err && err.message ? err.message : err) }, 500);
  }
};

export const config = { path: "/api/bookings" };
