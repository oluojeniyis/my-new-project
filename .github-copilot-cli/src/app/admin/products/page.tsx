import type { Metadata } from "next";
import Link from "next/link";
import { ProductAdminEditor } from "@/components/product-admin-editor";
import { getAdminAccess } from "@/lib/admin";
import { getCatalogProducts } from "@/lib/catalog";

export const metadata: Metadata = { title: "Manage catalog" };
export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const access = await getAdminAccess();

  if (access.status !== "authorized") {
    const messages = {
      "allowlist-missing": "Admin editing is disabled. Add the approved Google sign-in email to the server-only ADMIN_EMAILS setting.",
      "supabase-unconfigured": "Supabase is not configured. Add the public Supabase URL and anon key to .env.local, then restart the app.",
      unauthenticated: "Sign in with the approved Google account to manage the catalog.",
      forbidden: "This Google account is not approved to manage the catalog.",
      "service-role-missing": "Image uploads are unavailable until the server-only Supabase service-role key is configured.",
      "auth-error": "The signed-in account could not be verified. Try signing in again.",
    } as const;

    return (
      <main className="admin-page section-wrap" id="main-content">
        <h1>Catalog editor</h1>
        <div className="admin-access-message" role="status">
          <p>{messages[access.status]}</p>
          <Link className="text-link" href="/">Return to TeesTale sign-in →</Link>
        </div>
      </main>
    );
  }

  const products = await getCatalogProducts();

  return (
    <main className="admin-page section-wrap" id="main-content">
      <div className="admin-page-heading">
        <div>
          <h1>Catalog editor</h1>
          <p>Add catalog listings, set prices and options, and manage product photographs and descriptions.</p>
        </div>
        <span>Visible to customers</span>
      </div>
      <p className="admin-editor-note">
        Changes publish directly to the storefront. Upload only images you have permission to use.
      </p>
      <ProductAdminEditor products={products} />
    </main>
  );
}
