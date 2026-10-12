import { CartPageClient } from "@/components/cart-page-client";
import { getCatalogProducts } from "@/lib/catalog";

export default async function CartPage() {
  const products = await getCatalogProducts();
  return <CartPageClient products={products} />;
}
