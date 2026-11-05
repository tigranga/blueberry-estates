import { readJSON } from "./store.js";

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) return new Response("Stripe secret key not configured", { status: 500 });

  let body;
  try { body = await req.json(); } catch { return new Response("Invalid JSON", { status: 400 }); }
  const { nights, checkin, checkout, guests, name, email, message, property } = body;

  let unitAmount = 24900;
  let chargeCents = null;
  if (checkin && checkout) {
    try {
      const calendar = await readJSON("calendar", null);
      const listings = await readJSON("listings", null);
      const base = calendar?.settings?.basePrice || listings?.[0]?.price || 249;
      const start = new Date(checkin + "T00:00:00");
      const end = new Date(checkout + "T00:00:00");
      let total = 0;
      let count = 0;
      for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const custom = calendar?.days?.[iso]?.price;
        total += Math.round((custom || base) * 100);
        count += 1;
      }
      if (count > 0) {
        chargeCents = total;
        unitAmount = Math.round(total / count);
      }
    } catch (err) {
      console.warn("price lookup failed", err);
    }
  }

  if (!nights || nights < 1) return new Response("Invalid nights", { status: 400 });
  if (!chargeCents) {
    if (body.amount !== nights * 24900) return new Response("Invalid amount or nights", { status: 400 });
    chargeCents = nights * 24900;
    unitAmount = 24900;
  }

  const origin = new URL(req.url).origin;
  const params = new URLSearchParams();
  params.append("mode", "payment");
  params.append("success_url", `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`);
  params.append("cancel_url", `${origin}/cancel.html`);
  params.append("customer_email", email || "");
  params.append("line_items[0][price_data][currency]", "usd");
  params.append("line_items[0][price_data][product_data][name]", `${property || "RiverStone Retreat"} — ${nights} night${nights > 1 ? "s" : ""}`);
  params.append("line_items[0][price_data][product_data][description]", `Check-in: ${checkin} · Check-out: ${checkout} · Guests: ${guests}`);
  params.append("line_items[0][price_data][unit_amount]", String(unitAmount));
  params.append("line_items[0][quantity]", String(chargeCents === nights * unitAmount ? nights : 1));
  if (chargeCents !== nights * unitAmount) {
    params.set("line_items[0][price_data][unit_amount]", String(chargeCents));
    params.set("line_items[0][quantity]", "1");
  }
  params.append("metadata[checkin]", checkin || "");
  params.append("metadata[checkout]", checkout || "");
  params.append("metadata[guests]", String(guests || ""));
  params.append("metadata[name]", name || "");
  params.append("metadata[message]", message || "");
  params.append("metadata[property]", property || "RiverStone Retreat");

  const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  const data = await stripeRes.json();
  if (!stripeRes.ok) {
    return new Response(JSON.stringify(data), { status: stripeRes.status, headers: { "Content-Type": "application/json" } });
  }
  return new Response(JSON.stringify({ sessionId: data.id }), { headers: { "Content-Type": "application/json" } });
};

export const config = { path: "/api/create-checkout-session" };
