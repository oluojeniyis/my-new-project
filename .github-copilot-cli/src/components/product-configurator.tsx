"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import type { Product } from "@/lib/products";

export function AddToCartForm({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [size, setSize] = useState(product.sizes[0] ?? "");
  const [color, setColor] = useState(product.colors[0]?.name ?? "");
  const [quantity, setQuantity] = useState(product.minimumWholesaleQuantity ?? 1);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const minimum = product.minimumWholesaleQuantity ?? 1;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!size || !color) {
      setMessage("Choose a size and color before adding this piece.");
      return;
    }
    if (!Number.isInteger(quantity) || quantity < minimum) {
      setMessage(`Choose a quantity of at least ${minimum}.`);
      return;
    }
    addItem({
      productId: product.id,
      quantity,
      size,
      color,
      notes: notes.trim(),
      minimumQuantity: product.minimumWholesaleQuantity,
    });
    setMessage(`${quantity} ${quantity === 1 ? "piece" : "pieces"} added to your cart.`);
  }

  return (
    <form className="configurator" onSubmit={handleSubmit}>
      <fieldset className="option-field">
        <legend>Color <span>{color}</span></legend>
        <div className="color-options">
          {product.colors.map((option) => (
            <button
              aria-label={option.name}
              aria-pressed={color === option.name}
              className="color-option"
              key={option.name}
              onClick={() => setColor(option.name)}
              style={{ "--swatch": option.value } as CSSProperties}
              type="button"
            />
          ))}
        </div>
      </fieldset>
      <fieldset className="option-field">
        <legend>Size</legend>
        <div className="size-options">
          {product.sizes.map((option) => (
            <button
              aria-pressed={size === option}
              className="size-option"
              key={option}
              onClick={() => setSize(option)}
              type="button"
            >
              {option}
            </button>
          ))}
        </div>
      </fieldset>
      {product.isCustom && (
        <label className="option-field notes-field" htmlFor="design-notes">
          Design notes <span>Optional</span>
          <textarea
            id="design-notes"
            maxLength={500}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Colors, marks, or an idea to start from…"
            rows={3}
            value={notes}
          />
          <span className="character-count">{notes.length}/500</span>
        </label>
      )}
      <div className="quantity-row">
        <label htmlFor="product-quantity">Quantity</label>
        <div className="quantity-control">
          <button
            aria-label="Decrease quantity"
            disabled={quantity <= minimum}
            onClick={() => setQuantity((current) => Math.max(minimum, current - 1))}
            type="button"
          >−</button>
          <input
            id="product-quantity"
            min={minimum}
            onChange={(event) => setQuantity(Number(event.target.value))}
            type="number"
            value={quantity}
          />
          <button aria-label="Increase quantity" onClick={() => setQuantity((current) => current + 1)} type="button">+</button>
        </div>
      </div>
      {product.category === "wholesale-blanks" && (
        <p className="inline-note">Wholesale minimum not set for this sample catalog entry.</p>
      )}
      <button className="button button-primary add-to-cart-button" type="submit">
        Add to cart <span aria-hidden="true">↗</span>
      </button>
      <div aria-live="polite" className="cart-feedback">
        {message && <span>{message}</span>}
        {message.includes("added") && <Link href="/cart">View cart →</Link>}
      </div>
    </form>
  );
}
