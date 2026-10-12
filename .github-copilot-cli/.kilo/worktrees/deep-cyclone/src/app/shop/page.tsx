import type { Metadata } from "next";
import Link from "next/link";
import { ProductTile } from "@/components/product-tile";
import { categories } from "@/lib/products";
import { getCatalogProducts } from "@/lib/catalog";

export const metadata: Metadata = { title: "The shop" };

type ShopPageProps = {
  searchParams: Promise<{ category?: string; q?: string }>;
};

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const { category, q } = await searchParams;
  const products = await getCatalogProducts();
  const selectedCategory = categories.find((entry) => entry.slug === category);
  const searchTerm = q?.trim() ?? "";
  const filteredProducts = products.filter((product) => {
    const matchesCategory = !selectedCategory || product.category === selectedCategory.slug;
    const matchesQuery = !searchTerm || `${product.name} ${product.description}`.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  return (
    <main className="shop-page section-wrap" id="main-content">
      <div className="page-title-line">
        <div>
          <h1>{selectedCategory?.name ?? "The shop"}</h1>
          <p>{selectedCategory?.description ?? "Find your way across all four TeesTale rails."}</p>
        </div>
        <span className="page-count">{String(filteredProducts.length).padStart(2, "0")} / {String(products.length).padStart(2, "0")} PIECES</span>
      </div>

      <div className="shop-toolbar">
        <nav aria-label="Filter by category" className="filter-rails">
          <Link aria-current={!selectedCategory ? "page" : undefined} href="/shop">All rails</Link>
          {categories.map((entry) => (
            <Link
              aria-current={selectedCategory?.slug === entry.slug ? "page" : undefined}
              href={`/shop?category=${entry.slug}`}
              key={entry.slug}
            >
              {entry.shortName}
            </Link>
          ))}
        </nav>
        <form action="/shop" className="shop-search" role="search">
          {selectedCategory && <input name="category" type="hidden" value={selectedCategory.slug} />}
          <label className="visually-hidden" htmlFor="shop-search-input">Search the shop</label>
          <input defaultValue={searchTerm} id="shop-search-input" name="q" placeholder="Search the rails" type="search" />
          <button aria-label="Search the shop" type="submit">↗</button>
        </form>
      </div>

      <p className="sample-catalog-notice">
        Sample catalog: product details, pictured colors, sizes, prices, and wholesale minimums are illustrative or still to be confirmed.
      </p>

      {filteredProducts.length > 0 ? (
        <div className="product-grid">
          {filteredProducts.map((product) => <ProductTile key={product.id} product={product} />)}
        </div>
      ) : (
        <div className="empty-results">
          <h2>No pieces on this rail.</h2>
          <p>Try another search or browse all categories.</p>
          <Link className="button button-primary" href="/shop">Show all pieces</Link>
        </div>
      )}
    </main>
  );
}
