import { database } from "./store.js";

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const secret = typeof Netlify !== "undefined" && Netlify.env
    ? Netlify.env.get("STRIPE_WEBHOOK_SECRET")
    : process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook secret not configured", { status: 500 });

  let event;
  try { event = JSON.parse(await req.text()); } catch { return new Response("Invalid payload", { status: 400 }); }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const db = database();
    await db.sql`
      INSERT INTO bookings (
        stripe_session_id, guest_name, guest_email, checkin, checkout, guests, amount_cents, status, message
      ) VALUES (
        ${session.id},
        ${session.metadata?.name || ""},
        ${session.customer_email || session.customer_details?.email || ""},
        ${session.metadata?.checkin || ""},
        ${session.metadata?.checkout || ""},
        ${parseInt(session.metadata?.guests || "1", 10)},
        ${session.amount_total || 0},
        ${"paid"},
        ${session.metadata?.message || ""}
      )
      ON CONFLICT (stripe_session_id) DO NOTHING
    `;
  }

  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
};

export const config = { path: "/api/webhook" };
