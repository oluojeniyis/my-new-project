"use client";

import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import type { Product } from "@/lib/products";

export function CheckoutSummary({ products }: { products: Product[] }) {
  const { items } = useCart();
  const cartProducts = items.map((item) => ({
    line: item,
    product: products.find((product) => product.id === item.productId),
  })).filter((entry) => entry.product);

  return (
    <aside className="checkout-summary">
      <h2>The pull slip</h2>
      {cartProducts.length ? (
        cartProducts.map(({ line, product }) => product && (
          <div className="checkout-summary-line" key={line.key}>
            <div>
              <strong>{product.name}</strong>
              <span>{line.quantity} × {line.size} / {line.color}</span>
            </div>
            <span>Price TBD</span>
          </div>
        ))
      ) : (
        <div className="checkout-summary-empty">
          <p>Your slip is empty.</p>
          <Link className="text-link" href="/shop">Browse the shop →</Link>
        </div>
      )}
      <div className="summary-rule" />
      <p className="checkout-summary-total"><span>Order total</span><strong>To be confirmed</strong></p>
      <p className="summary-note">Final catalog prices and wholesale minimums need confirmation before an order can be placed.</p>
    </aside>
  );
}
