import Image from "next/image";
import type { Product } from "@/lib/products";

export function ProductMedia({
  product,
  className = "",
  sizes = "(max-width: 720px) 50vw, 33vw",
}: {
  product: Product;
  className?: string;
  sizes?: string;
}) {
  if (!product.imageUrl) {
    return (
      <div
        aria-label={`Product photo pending for ${product.name}`}
        className={`product-photo-pending ${className}`}
        role="img"
      >
        <span>Product photo</span>
        <strong>To be added</strong>
      </div>
    );
  }

  return (
    <Image
      alt={`Photograph of ${product.name}`}
      className={`product-photo ${className}`}
      fill
      sizes={sizes}
      src={product.imageUrl}
      unoptimized
    />
  );
}
