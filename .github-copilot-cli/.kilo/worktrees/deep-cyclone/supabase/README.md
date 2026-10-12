# Supabase database setup

The browser-readable catalog is seeded with sample products. Prices and wholesale minimums remain unset until the real catalog is confirmed. Admin-uploaded product photos are stored in the public `product-images` bucket.

## Apply in the Supabase dashboard

1. Open the TeesTale project and select **SQL Editor**.
2. Choose **New query**.
3. Open `migrations/0001_initial_schema.sql` from this folder, copy the complete file into the query, and select **Run**.
4. Confirm that the query succeeds before continuing.
5. Start a second new query, copy the complete contents of `seed.sql`, and select **Run**.
6. Open **Table Editor** and verify that `products` contains 12 sample rows and that `orders` and `order_items` exist.
7. Open each table's RLS policies and verify row-level security is enabled.
8. Start a new query, copy the contents of `migrations/0002_product_image_storage.sql`, and select **Run** to create the catalog image bucket.

The schema migration can safely be re-run: it creates missing tables and indexes, and replaces the project's named policies. The seed inserts by stable product slug and leaves existing products untouched. It is suitable only for a new development catalog; replace the illustrative products with confirmed catalog data before accepting orders.

Row-level security permits public catalog reads and signed-in reads of each user's own orders and order items. The image bucket is public-read so product photos can appear in the storefront; uploads and product edits are made only by the server route after it verifies the signed-in user's email against `ADMIN_EMAILS`.

## Configure the catalog editor

1. In Supabase, open **Project Settings → API Keys** and copy the `service_role` key. Keep it private.
2. Put the project URL, anon key, service-role key, and the Google sign-in email that may edit products into the corresponding fields in `.env.local`. Use `ADMIN_EMAILS` for the allowlist; separate multiple emails with commas.
3. Restart the Next.js app and sign in with an allowlisted Google account.
4. Open `/admin/products` to upload JPG, PNG, or WebP photos (up to 8 MB), change a product's category, or edit a product's description.

The service-role key is used by the server-side admin route only. Never put it in a client component or share it in chat. The editor updates existing seeded products; it does not create or delete products.
