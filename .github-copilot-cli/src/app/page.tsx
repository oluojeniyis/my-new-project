import Link from "next/link";
import { ProductTile } from "@/components/product-tile";
import { ProductMedia } from "@/components/product-media";
import { categories } from "@/lib/products";
import { getCatalogProducts } from "@/lib/catalog";

export default async function HomePage() {
  const products = await getCatalogProducts();
  const heroProduct = products.find((product) => product.slug === "heavyweight-cotton-tee") ?? products[0];
  const meshProduct = products.find((product) => product.category === "bespoke-custom-mesh") ?? heroProduct;
  const poloProduct = products.find((product) => product.category === "retail-polos") ?? heroProduct;
  const featured = products.slice(0, 4);

  if (!heroProduct || !meshProduct || !poloProduct) {
    throw new Error("The TeesTale catalog does not contain products for the homepage. ");
  }

  return (
    <main id="main-content">
      <section aria-labelledby="hero-title" className="editorial-hero">
        <article className="hero-feature">
          <div className="hero-feature-art">
            <ProductMedia className="hero-artwork" product={heroProduct} sizes="(max-width: 720px) 76vw, 45vw" />
            <span className="hero-art-caption">
              {heroProduct.imageUrl ? "Catalog photo / sample listing" : "Product photo to be added"}
            </span>
          </div>
          <div className="hero-feature-copy">
            <p className="hero-eyebrow">TeesTale / apparel sourcing</p>
            <h1 id="hero-title">Apparel for<br />every day.</h1>
            <p>Explore a considered selection of everyday apparel, wholesale blanks, and custom mesh.</p>
            <Link className="editorial-action" href="/shop">
              Explore the collection <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <span aria-hidden="true" className="hero-index">01 — 04</span>
        </article>

        <div aria-label="Featured categories" className="hero-side-grid">
          <Link className="hero-side-tile hero-side-tile--mesh" href="/shop?category=bespoke-custom-mesh">
            <ProductMedia className="hero-side-artwork" product={meshProduct} sizes="(max-width: 720px) 45vw, 24vw" />
            <span className="hero-side-copy">
              <span>Made your own</span>
              <strong>Custom mesh</strong>
              <span aria-hidden="true">Explore ↗</span>
            </span>
          </Link>
          <Link className="hero-side-tile hero-side-tile--polo" href="/shop?category=retail-polos">
            <ProductMedia className="hero-side-artwork" product={poloProduct} sizes="(max-width: 720px) 45vw, 24vw" />
            <span className="hero-side-copy">
              <span>Everyday essentials</span>
              <strong>Retail polos</strong>
              <span aria-hidden="true">Explore ↗</span>
            </span>
          </Link>
        </div>
      </section>

      <section className="category-section" id="the-rails">
        <div className="section-wrap">
          <div className="section-heading-row">
            <h2>Shop by collection</h2>
            <p>Four ways to find the right starting point.</p>
          </div>
          <nav aria-label="Shop product collections" className="category-rails">
            {categories.map((category) => (
              <Link
                className="category-rail-link"
                href={`/shop?category=${category.slug}`}
                key={category.slug}
              >
                <span className="category-index">{category.index}</span>
                <span className="category-link-name">{category.name}</span>
                <span className="category-link-description">{category.description}</span>
                <span aria-hidden="true" className="category-link-arrow">↗</span>
              </Link>
            ))}
          </nav>
        </div>
      </section>

      <section className="featured-section section-wrap">
        <div className="section-heading-row featured-heading">
          <div>
            <p className="hero-eyebrow">The edit</p>
            <h2>Selected pieces</h2>
          </div>
          <Link className="text-link" href="/shop">View the full collection <span aria-hidden="true">→</span></Link>
        </div>
        <p className="sample-catalog-notice">
          Sample catalog: product details, pictured colors, sizes, prices, and wholesale minimums are illustrative or still to be confirmed.
        </p>
        <div className="product-grid product-grid--four">
          {featured.map((product) => <ProductTile key={product.id} product={product} />)}
        </div>
      </section>
    </main>
  );
}
