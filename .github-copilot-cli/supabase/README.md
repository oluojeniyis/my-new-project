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

The schema migration can safely be re-run: it creates missing tables and indexes, and replaces the project's named policies. The seed inserts by stable product slug and leaves existing products untouched. It is suitable only for a new development catalog; replace the illustrative products with confirmed catalog data before accepting orders. Apply `migrations/0003_catalog_category_values.sql` to existing projects so newly added Streetwear and slug-based category values are accepted without removing support for legacy category labels.

Row-level security permits public catalog reads and signed-in reads of each user's own orders and order items. The image bucket is public-read so product photos can appear in the storefront. The server verifies the signed-in user's email against `ADMIN_EMAILS` before issuing a one-use signed upload URL; the browser uploads the image directly, then the server verifies and saves the product row.

## Configure the catalog editor

1. In Supabase, open **Project Settings → API Keys** and copy the `service_role` key. Keep it private.
2. Put the project URL, anon key, service-role key, and the Google sign-in email that may edit products into the corresponding fields in `.env.local`. Use `ADMIN_EMAILS` for the allowlist; separate multiple emails with commas.
3. Restart the Next.js app and sign in with an allowlisted Google account.
4. Open `/admin/products` to add products with category, description, optional photo, prices, sizes, colors, and minimum wholesale quantity. You can also upload JPG, PNG, or WebP photos (up to 8 MB), change existing product categories, and edit descriptions.

The service-role key is used by the server-side admin route only. Never put it in a client component or share it in chat. Product creation, uploads, and edits are restricted to emails listed in `ADMIN_EMAILS`; the editor does not delete products. Apply `migrations/0003_catalog_category_values.sql` if your existing catalog table rejects category values.

To apply the category migration in Supabase, open **SQL Editor → New query**, paste the contents of `migrations/0003_catalog_category_values.sql`, and select **Run**. Do not paste service-role keys into the SQL editor.
