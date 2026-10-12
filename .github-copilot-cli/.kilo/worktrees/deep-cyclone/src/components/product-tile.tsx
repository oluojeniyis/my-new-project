"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/cart-provider";
import { ProductMedia } from "@/components/product-media";
import { getCategoryName, type Product } from "@/lib/products";

export function ProductTile({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [size, setSize] = useState(product.sizes[0] ?? "");
  const [color, setColor] = useState(product.colors[0]?.name ?? "");
  const [message, setMessage] = useState("");
  const minimumQuantity = product.minimumWholesaleQuantity ?? 1;

  function handleQuickAdd() {
    if (!size || !color) {
      setMessage("Choose a size and color first.");
      return;
    }

    addItem({
      productId: product.id,
      quantity: minimumQuantity,
      size,
      color,
      notes: "",
      minimumQuantity: product.minimumWholesaleQuantity,
    });
    setMessage(`${minimumQuantity} ${minimumQuantity === 1 ? "piece" : "pieces"} added to cart.`);
  }

  return (
    <article className="product-tile">
      <div className="product-card-media">
        <Link
          aria-label={`View ${product.name} details`}
          className="product-tile-art-link"
          href={`/shop/${product.slug}`}
        >
          <ProductMedia product={product} />
        </Link>
        <div aria-label={`Quick options for ${product.name}`} className="product-quick-panel" role="group">
          <div className="quick-panel-heading">
            <span>Choose a size</span>
            <Link href={`/shop/${product.slug}`}>Full details ↗</Link>
          </div>
          <div aria-label={`${product.name} sizes`} className="quick-sizes" role="group">
            {product.sizes.map((option) => (
              <button
                aria-pressed={size === option}
                key={option}
                onClick={() => setSize(option)}
                type="button"
              >
                {option}
              </button>
            ))}
          </div>
          <div aria-label={`${product.name} colors`} className="quick-colors" role="group">
            {product.colors.map((option) => (
              <button
                aria-label={option.name}
                aria-pressed={color === option.name}
                key={option.name}
                onClick={() => setColor(option.name)}
                style={{ backgroundColor: option.value }}
                type="button"
              />
            ))}
          </div>
          <button className="quick-add" onClick={handleQuickAdd} type="button">
            Add to cart <span aria-hidden="true">↗</span>
          </button>
          {product.isCustom && (
            <Link className="quick-custom-link" href={`/shop/${product.slug}`}>
              Add custom design notes
            </Link>
          )}
          <span aria-live="polite" className="quick-feedback">{message}</span>
        </div>
      </div>
      <div className="product-tile-meta">
        <div>
          <p className="tile-category">{getCategoryName(product.category)}</p>
          <h3><Link href={`/shop/${product.slug}`}>{product.name}</Link></h3>
        </div>
        <p className="price-pending">Price to be confirmed</p>
      </div>
    </article>
  );
}
