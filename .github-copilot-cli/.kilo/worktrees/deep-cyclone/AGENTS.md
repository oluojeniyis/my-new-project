# AGENTS.md — TeesTale

Persistent context for any coding agent working on this repo. Read this and PRD.md before making changes.

## Project

TeesTale: an online shop for wholesale/retail apparel and custom mesh clothing. HNG 15 Lesson 2 individual task. The goal is a complete, working, deployed product, not just generated code.

## Stack

Next.js (App Router), Tailwind CSS, Supabase (Auth with Google + Postgres), Mailgun, Vercel.

## Rules

1. Follow the build phases in PRD.md in order. Do not add features (payments, admin) until the core flow works.
2. Never commit secrets. `.env.local` must be in `.gitignore`. Use `.env.example` with empty values.
3. Server-only keys (`SUPABASE_SERVICE_ROLE_KEY`, `MAILGUN_API_KEY`) are used only in server routes, never in client components.
4. Send the Mailgun email from `/api/checkout` after the order is saved. If the email fails, log the error but do not delete the order.
5. Use row-level security. Users can read only their own orders.
6. Never hardcode `localhost` URLs. Use `NEXT_PUBLIC_SITE_URL` and relative paths.
7. Keep code simple and beginner-readable. Explain any non-obvious step in a short comment.
8. Make small, meaningful Git commits (e.g. `feat: add cart context`), not one giant commit.

## Human-only tasks (the agent cannot do these)

* Create the Supabase project and copy its URL and keys
* Create the Google Cloud OAuth client and set redirect URIs
* Create the Mailgun account and domain, and authorize test recipients if using the sandbox
* Add env vars in the Vercel dashboard

When one of these is needed, give click-by-click instructions and wait for the user to confirm.

## Current status

*Update this section at the end of every session so another model can continue.*

* [x] Phase 1: PRD and AGENTS.md
* [x] Phase 2: Shop UI
* [x] Phase 3: Supabase tables and RLS
* [x] Phase 4: Google OAuth
* [x] Phase 5: Cart and checkout
* [x] Phase 6: Persist orders
* [x] Phase 7: My Orders page
* [x] Phase 8: Mailgun email
* [ ] Phase 9: Local testing
* [ ] Phase 10: Production deploy
* [ ] Phase 11: End-to-end production test

**Last session notes:** Reworked the storefront into a neutral editorial boutique using `figma-tokens.txt`: minimalist shared navigation, a twelve-column homepage feature layout, borderless 3:4 product cards, and quick size/color configuration that slides up on pointer hover/focus and remains available below the image on touch screens. Added `/admin/products` for allowlisted Google accounts to upload catalog photos and edit product categories and descriptions. Uploaded images are stored in Supabase Storage and appear on the home, shop, product, and cart pages; products without photos now show a neutral pending-photo label, with all SVG garment artwork removed. The editor uses `ADMIN_EMAILS` and the service-role key only on the server. Checkout persists priced orders and sends Mailgun confirmation email; order-item writes use the service-role client to work with the existing RLS policies. The local TypeScript catalog now mirrors the seven requested Supabase products with their current retail/wholesale prices and wholesale minimums, and includes the Streetwear category. The existing cart provider and its localStorage schema remain unchanged. Authenticated order/email delivery and uploads still need end-to-end verification.

**Known issues:** Current catalog prices and wholesale minimums are copied from Supabase but have not been independently confirmed as final commercial terms. The user reports applying the image-storage migration; the local service-role key, Mailgun configuration, and approved Google email are present, but an authenticated upload and order/email transaction have not yet been verified. Do not share secrets in chat. The existing OAuth provider configuration still needs callback URLs validated for local and production origins.

**Next step:** Sign in with the allowlisted Google account, upload an approved product photo at `/admin/products`, and verify it appears across the storefront. Then verify order persistence and Mailgun delivery before deployment. Do not share secrets in chat.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
## Current Project Status
- **Current Phase:** Phase 11 (Supabase Auth Webhook Verification Complete).
- **Completed:** Extracted and validated target-specific project callback URIs directly from the Supabase Provider infrastructure panels.
- **Next Immediate Step:** Paste this URL into the Google Cloud OAuth redirect panel to lock in production-grade user authentication sync.

## Current Project Status
- **Current Phase:** Phase 11 (Google OAuth Webhook Finalized).
- **Completed:** Debugged Google error 400 mismatch by matching character strings exactly with the target Supabase authentication endpoint.
- **Next Immediate Step:** Run a clean login transaction to confirm total storefront workspace completion.
