"use client";

import Link from "next/link";
import { ProductMedia } from "@/components/product-media";
import { useCart } from "@/components/cart-provider";
import { getCategoryName, type Product } from "@/lib/products";

export function CartPageClient({ products }: { products: Product[] }) {
  const { items, removeItem, setQuantity, storageMessage } = useCart();
  const cartProducts = items.map((item) => ({
    line: item,
    product: products.find((product) => product.id === item.productId),
  })).filter((entry) => entry.product);

  return (
    <main className="cart-page section-wrap" id="main-content">
      <div className="page-title-line">
        <div>
          <h1>Your pull slip.</h1>
          <p>Review each piece and its options before checkout.</p>
        </div>
        <span className="page-count">{String(cartProducts.length).padStart(2, "0")} LINES</span>
      </div>
      {storageMessage && <p className="storage-warning" role="status">{storageMessage}</p>}
      {cartProducts.length === 0 ? (
        <section className="cart-empty">
          <span className="empty-slip-mark" aria-hidden="true">TT / —</span>
          <h2>No selections on the slip yet.</h2>
          <p>Pick a rail, choose your options, and your pieces will collect here.</p>
          <Link className="button button-primary" href="/shop">Browse the shop <span aria-hidden="true">↗</span></Link>
        </section>
      ) : (
        <div className="cart-layout">
          <section aria-label="Cart items" className="cart-lines">
            {cartProducts.map(({ line, product }) => product && (
              <article className="cart-line" key={line.key}>
                <Link aria-label={`View ${product.name}`} className="cart-line-art" href={`/shop/${product.slug}`}>
                  <ProductMedia product={product} sizes="116px" />
                </Link>
                <div className="cart-line-info">
                  <p className="tile-category">{getCategoryName(product.category)}</p>
                  <h2><Link href={`/shop/${product.slug}`}>{product.name}</Link></h2>
                  <p>Color: {line.color} <span aria-hidden="true">·</span> Size: {line.size}</p>
                  {line.notes && <p className="cart-line-notes">Notes: {line.notes}</p>}
                  <button className="remove-link" onClick={() => removeItem(line.key)} type="button">Remove</button>
                </div>
                <div className="cart-line-quantity">
                  <label className="visually-hidden" htmlFor={`quantity-${line.key}`}>Quantity for {product.name}</label>
                  <input
                    id={`quantity-${line.key}`}
                    min={line.minimumQuantity ?? 1}
                    onChange={(event) => setQuantity(line.key, Number(event.target.value))}
                    type="number"
                    value={line.quantity}
                  />
                </div>
                <span className="cart-line-price">Price TBD</span>
              </article>
            ))}
          </section>
          <aside className="cart-summary">
            <h2>Order summary</h2>
            <div className="summary-rule" />
            <p><span>Pieces</span><strong>{items.reduce((count, item) => count + item.quantity, 0)}</strong></p>
            <p><span>Subtotal</span><strong>To be confirmed</strong></p>
            <div className="summary-rule" />
            <p className="summary-total"><span>Total</span><strong>To be confirmed</strong></p>
            <p className="summary-note">Prices and wholesale minimums are pending confirmation. Checkout will remain paused until real catalog prices are added.</p>
            <Link className="button button-primary checkout-link" href="/checkout">
              Continue to checkout <span aria-hidden="true">→</span>
            </Link>
            <Link className="text-link continue-shopping" href="/shop">← Keep browsing</Link>
          </aside>
        </div>
      )}
    </main>
  );
}
