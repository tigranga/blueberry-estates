import { readJSON, writeJSON } from "./store.js";

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!process.env.STRIPE_WEBHOOK_SECRET) return new Response("Webhook secret not configured", { status: 500 });

  let event;
  try { event = JSON.parse(await req.text()); } catch { return new Response("Invalid payload", { status: 400 }); }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const bookings = await readJSON("bookings", []);
    if (!bookings.some((booking) => booking.stripe_session_id === session.id)) {
      bookings.unshift({
        id: Date.now(),
        stripe_session_id: session.id,
        guest_name: session.metadata?.name || "",
        guest_email: session.customer_email || "",
        checkin: session.metadata?.checkin || "",
        checkout: session.metadata?.checkout || "",
        guests: parseInt(session.metadata?.guests || "1", 10),
        amount_cents: session.amount_total || 0,
        status: "paid",
        message: session.metadata?.message || "",
        created_at: new Date().toISOString(),
      });
      await writeJSON("bookings", bookings);
    }
  }

  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
};

export const config = { path: "/api/webhook" };
