# TeesTale — Product Requirements Document

## 1. Overview

TeesTale is an online shop for wholesale and retail apparel and custom mesh clothing. Customers browse products, add them to a cart, check out, and receive a confirmation email. Signed-in users can view their order history at any time.

This is the HNG 15 Lesson 2 individual project. The integrations (auth, database, email) are the main focus, so they take priority over visual polish.

## 2. Users

- **Retail buyer:** buys individual items (polos, accessories) at retail prices.
- **Wholesale buyer:** buys blanks in bulk at wholesale prices (minimum quantity applies).
- **Custom client:** requests bespoke/custom mesh clothing with design notes.

## 3. Product Categories

- Wholesale Blanks
- Retail Polos
- Bespoke / Custom Mesh
- Accessories
- Streetwear

## 4. Must-Have Features (what HNG tests)

1. Shop page with category filters and product detail pages
2. Add-to-cart (quantity, size, color)
3. Checkout page
4. Google sign-in (Google Cloud OAuth)
5. Sign out
6. Orders saved in Supabase (or Neon)
7. "My Orders" page: orders persist across logout, closing the browser, and signing in again
8. Mailgun confirmation email after successful checkout, with a nicely formatted HTML template (order number, items, quantities, total, shop branding)
9. Everything works in production, not just locally

## 5. Nice-to-Have (only after all of the above works)

- Payments in test mode (Paystack, Flutterwave, or Stripe)
- Order status updates
- Admin view for managing products

## 6. Tech Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js (App Router) + Tailwind CSS |
| Auth | Google OAuth via Supabase Auth (client created in Google Cloud Console) |
| Database | Supabase Postgres with row-level security |
| Email | Mailgun (called from a server-side route only) |
| Hosting | Vercel |
| Version control | Git + GitHub (no secrets committed) |

## 7. Data Model

**products**: id, name, slug, category, description, image_url, retail_price, wholesale_price, min_wholesale_qty, sizes[], colors[], is_custom

**orders**: id, user_id, order_type (retail | wholesale | custom), status, total, notes, customer_email, created_at

**order_items**: id, order_id, product_id, product_name, qty, size, color, unit_price

**Security rules (RLS):**

- Users can only SELECT their own orders and order items.
- Products are readable by everyone.
- Orders are inserted by the server route using the authenticated user's id.

## 8. Pages and Routes

- `/` — Home
- `/shop` — product grid with category filters
- `/shop/[slug]` — product detail
- `/cart` — cart
- `/checkout` — checkout (requires sign-in)
- `/orders` — order history (requires sign-in)
- `/auth/callback` — OAuth callback
- `/api/checkout` — creates the order and triggers the Mailgun email

## 9. Environment Variables

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
MAILGUN_API_KEY=
MAILGUN_DOMAIN=
MAILGUN_FROM="TeesTale <orders@YOUR_DOMAIN>"
NEXT_PUBLIC_SITE_URL=
```

Google client ID and secret are stored in Supabase's Google provider settings.

## 10. Build Phases

1. PRD and AGENTS.md
2. Shop UI with seeded product data
3. Supabase project, tables, seed data, RLS
4. Google OAuth (local, then production)
5. Cart and checkout
6. Persist orders
7. "My Orders" page
8. Mailgun confirmation email
9. Test auth and order persistence locally
10. Deploy to Vercel, set production env vars, update Google and Supabase redirect URLs
11. End-to-end production test

## 11. Acceptance Checklist

- [ ] Browse shop and add items to cart
- [ ] Checkout creates an order in the database
- [ ] Google sign-in works in production
- [ ] "My Orders" shows the order
- [ ] Logout works
- [ ] Close browser, reopen, sign in again: orders still visible
- [ ] Confirmation email actually arrives and looks good
- [ ] No secrets in GitHub
- [ ] Submission form sent
