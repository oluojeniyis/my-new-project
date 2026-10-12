import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartForm } from "@/components/product-configurator";
import { ProductMedia } from "@/components/product-media";
import { getCategoryName, isProductCategory, products } from "@/lib/products";
import { getCatalogProducts } from "@/lib/catalog";

type ProductPageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const catalog = await getCatalogProducts();
  const product = catalog.find((entry) => entry.slug === slug);
  return { title: product?.name ?? "Piece not found" };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const catalog = await getCatalogProducts();
  const product = catalog.find((entry) => entry.slug === slug);
  if (!product) notFound();

  return (
    <main className="product-page section-wrap" id="main-content">
      <nav aria-label="Breadcrumb" className="breadcrumbs">
        <Link href="/shop">The shop</Link><span aria-hidden="true">/</span>
        <Link href={isProductCategory(product.category) ? `/shop?category=${product.category}` : "/shop"}>
          {getCategoryName(product.category)}
        </Link>
        <span aria-hidden="true">/</span><span aria-current="page">{product.name}</span>
      </nav>
      <div className="product-detail-layout">
        <div className="product-detail-art">
          <ProductMedia
            className={product.imageUrl ? "product-photo--detail" : "product-art--detail"}
            product={product}
            sizes="(max-width: 720px) 100vw, 52vw"
          />
          <span className="detail-image-note">
            {product.imageUrl ? "CATALOG PHOTO" : "PRODUCT PHOTO TO BE ADDED"}
          </span>
        </div>
        <div className="product-info">
          <p className="product-category-mark">{getCategoryName(product.category)}</p>
          <h1>{product.name}</h1>
          <p className="product-description">{product.description}</p>
          <p className="product-detail-copy">{product.detail}</p>
          <div className="product-price-block">
            <span>Price</span>
            <strong>To be confirmed</strong>
          </div>
          {product.category === "wholesale-blanks" && (
            <p className="minimum-note">
              Wholesale minimum quantity: to be confirmed for this sample listing.
            </p>
          )}
          <AddToCartForm product={product} />
          <p className="product-data-note">
            Sample catalog entry. Final garment details, options, and pricing are not yet confirmed.
          </p>
        </div>
      </div>
    </main>
  );
}
