// Cloudflare Pages Function: POST /api/webhook
// Handles Stripe checkout.session.completed
// Bindings: STRIPE_WEBHOOK_SECRET (secret), DB (D1)

export async function onRequestPost(context) {
  const { request, env } = context;
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return new Response('Webhook secret not configured', { status: 500 });
  }

  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  // Note: Full signature verification requires the Stripe library or crypto.
  // For production, use Stripe's constructEvent equivalent or a library.
  // This is a simplified example — add proper verification before going live.

  let event;
  try {
    event = JSON.parse(body);
  } catch {
    return new Response('Invalid payload', { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log('Payment succeeded:', session.customer_email, session.metadata);

    // Save booking to D1 if bound
    if (env.DB) {
      try {
        await env.DB.prepare(`
          INSERT INTO bookings (stripe_session_id, guest_name, guest_email, checkin, checkout, guests, amount_cents, status, message)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'paid', ?)
        `).bind(
          session.id,
          session.metadata?.name || '',
          session.customer_email || '',
          session.metadata?.checkin || '',
          session.metadata?.checkout || '',
          parseInt(session.metadata?.guests || '1'),
          session.amount_total || 0,
          session.metadata?.message || ''
        ).run();
      } catch (err) {
        console.error('D1 insert failed:', err);
      }
    }

    // Optional: send confirmation email via Resend or similar
    // if (env.RESEND_API_KEY) { ... }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
}