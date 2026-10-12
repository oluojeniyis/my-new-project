import "server-only";

import { categories, products, type Product, type ProductCategory } from "@/lib/products";
import { createServerSupabase } from "@/lib/supabase-server";

function getCategory(value: string): string {
  const normalized = value.trim().toLowerCase();
  const matchingCategory = categories.find((category) => category.slug === normalized);
  if (matchingCategory) return matchingCategory.slug;

  const legacyCategories: Record<string, ProductCategory> = {
    "wholesale blanks": "wholesale-blanks",
    "retail polos": "retail-polos",
    "bespoke/custom mesh": "bespoke-custom-mesh",
    "bespoke / custom mesh": "bespoke-custom-mesh",
    accessories: "accessories",
  };

  return legacyCategories[normalized] ?? value.trim();
}

function isColorOption(value: unknown): value is Product["colors"][number] {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof value.name === "string" &&
    "value" in value &&
    typeof value.value === "string"
  );
}

function getFallbackProduct(
  productId: string,
  category: string,
  name: string,
  slug: string,
) {
  const exactMatch = products.find((product) => product.id === productId);
  if (exactMatch) return exactMatch;

  const listing = `${name} ${slug}`.toLowerCase();
  const art = listing.includes("hoodie")
    ? "hoodie"
    : listing.includes("polo")
      ? "polo"
      : listing.includes("short")
        ? "shorts"
        : listing.includes("jersey") || listing.includes("mesh")
          ? "jersey"
          : listing.includes("cap")
            ? "cap"
            : listing.includes("sock")
              ? "socks"
              : listing.includes("tote")
                ? "tote"
                : category === "bespoke-custom-mesh"
                  ? "jersey"
                  : category === "retail-polos"
                    ? "polo"
                    : category === "accessories"
                      ? "tote"
                      : "tee";

  return products.find((product) => product.art === art) ??
    products.find((product) => product.category === category) ??
    products[0];
}

export async function getCatalogProducts(): Promise<Product[]> {
  const supabase = await createServerSupabase();
  if (!supabase) {
    return products;
  }

  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, slug, category, description, image_url, retail_price, wholesale_price, min_wholesale_qty, sizes, colors, is_custom",
    )
    .order("id", { ascending: true });

  if (error) {
    console.error("Unable to load the TeesTale catalog from Supabase.", error);
    throw new Error("The catalog could not be loaded. Check the Supabase products table and connection.");
  }

  if (!data.length) {
    return [];
  }

  return data.map((row) => {
    const category = getCategory(row.category);

    const sample = getFallbackProduct(row.id, category, row.name, row.slug);
    if (row.image_url !== null && typeof row.image_url !== "string") {
      throw new Error(`The image URL for ${row.name} is invalid.`);
    }

    return {
      ...sample,
      name: row.name,
      slug: row.slug,
      category,
      description: row.description,
      imageUrl: row.image_url,
      retailPrice: row.retail_price === null ? null : Number(row.retail_price),
      wholesalePrice: row.wholesale_price === null ? null : Number(row.wholesale_price),
      minimumWholesaleQuantity: row.min_wholesale_qty,
      sizes: Array.isArray(row.sizes)
        ? row.sizes.filter((size): size is string => typeof size === "string")
        : sample.sizes,
      colors: Array.isArray(row.colors)
        ? row.colors.filter(isColorOption)
        : sample.colors,
      isCustom: row.is_custom,
    };
  });
}
