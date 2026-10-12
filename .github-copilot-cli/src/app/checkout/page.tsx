import { CheckoutPageClient } from "@/components/checkout-page-client";
import { getCatalogProducts } from "@/lib/catalog";

export default async function CheckoutPage() {
  const products = await getCatalogProducts();
  return <CheckoutPageClient products={products} />;
}
