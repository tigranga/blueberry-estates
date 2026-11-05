# Blueberry Estates / RiverStone — Cloudflare Pages Package

Fully functional booking site ready for Cloudflare Pages (static + Functions + D1).

## What's included
- Static frontend (`index.html`, `admin.html`, calendar, Stripe redirect)
- Pages Functions:
  - `functions/api/create-checkout-session.js` — creates Stripe Checkout Session
  - `functions/api/webhook.js` — handles payment success + saves booking to D1
  - `functions/api/blocked-dates.js` — GET/POST/DELETE blocked dates
  - `functions/api/bookings.js` — list bookings
- `schema.sql` — D1 tables for bookings and blocked dates

## Deploy to Cloudflare Pages

### 1. Create the project
1. In Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Upload assets**.
2. Name it (e.g. `blueberry-estates`).
3. Upload the entire contents of this folder (including the `functions/` directory).
4. Deploy. You will get a `*.pages.dev` URL.

### 2. Add environment variables
In the Pages project → **Settings** → **Environment variables** (Production):
- `STRIPE_SECRET_KEY` = your Stripe secret key (`sk_test_...` or `sk_live_...`)
- `STRIPE_WEBHOOK_SECRET` = webhook signing secret (from Stripe Dashboard → Developers → Webhooks)
- (Optional) `RESEND_API_KEY` if you add email later

Also set the publishable key in `script.js` (`STRIPE_PUBLISHABLE_KEY`).

### 3. Create D1 database
1. Cloudflare Dashboard → **D1** → Create database (e.g. `blueberry-bookings`).
2. Run the contents of `schema.sql` in the D1 console.
3. In your Pages project → **Settings** → **Functions** → **D1 database bindings**:
   - Variable name: `DB`
   - Database: select the one you created

### 4. Stripe webhook
1. Stripe Dashboard → Developers → Webhooks → Add endpoint.
2. URL: `https://your-domain.com/api/webhook` (or the `*.pages.dev` URL while testing).
3. Events: `checkout.session.completed`.
4. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

### 5. Custom domain (blueberryestates.com)
1. Pages project → **Custom domains** → Add `blueberryestates.com` and `www.blueberryestates.com`.
2. Follow the DNS instructions (recommended: change nameservers in GoDaddy to Cloudflare’s).
3. SSL is automatic.

## Testing
- Use Stripe test card: `4242 4242 4242 4242`
- After payment, check D1 for the new booking row.
- Blocked dates set via the API (or admin updates) will disable those dates on the guest calendar.

## Notes
- Protect `/api/bookings` in production (Cloudflare Access, a simple secret header, etc.).
- The current admin dashboard still uses localStorage for the demo. You can update it later to call `/api/bookings` and `/api/blocked-dates`.
- For guest emails, add a Resend (or similar) call inside the webhook function.

## Local development (optional)
```bash
npx wrangler pages dev .
```
(Requires wrangler and local D1/env setup.)

Ready for long-term use on Cloudflare — upgrade only when you outgrow the free tier.
