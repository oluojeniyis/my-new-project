export const categories = [
  {
    slug: "wholesale-blanks",
    name: "Wholesale Blanks",
    shortName: "Blanks",
    description: "Everyday foundations, ready for the next step.",
    index: "01",
  },
  {
    slug: "retail-polos",
    name: "Retail Polos",
    shortName: "Polos",
    description: "Easy, considered staples for the daily rotation.",
    index: "02",
  },
  {
    slug: "bespoke-custom-mesh",
    name: "Bespoke / Custom Mesh",
    shortName: "Custom mesh",
    description: "Mesh pieces made personal with your design notes.",
    index: "03",
  },
  {
    slug: "accessories",
    name: "Accessories",
    shortName: "Accessories",
    description: "The useful details that finish a look.",
    index: "04",
  },
  {
    slug: "streetwear",
    name: "Streetwear",
    shortName: "Streetwear",
    description: "Comfort-led everyday layers.",
    index: "05",
  },
] as const;

export type ProductCategory = (typeof categories)[number]["slug"];
export type ProductArt = "tee" | "hoodie" | "polo" | "jersey" | "shorts" | "sweatpants" | "cap" | "tote" | "socks";

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  detail: string;
  retailPrice: number | null;
  wholesalePrice: number | null;
  minimumWholesaleQuantity: number | null;
  sizes: string[];
  colors: { name: string; value: string }[];
  isCustom: boolean;
  imageUrl?: string | null;
  art: ProductArt;
};

const colorValues: Record<string, string> = {
  White: "#F9FAFB",
  Black: "#111827",
  Navy: "#1E3A5F",
  Grey: "#9CA3AF",
  Red: "#B91C1C",
  Custom: "#6B7280",
  Natural: "#D1C3A1",
  Beige: "#D6C6A8",
};

const colors = (...names: string[]) =>
  names.map((name) => ({ name, value: colorValues[name] ?? "#6B7280" }));

const standardSizes = ["S", "M", "L", "XL", "XXL"];

export const products: Product[] = [
  {
    id: "4267e424-a979-4f13-8c3c-9c847a4ccd15",
    slug: "classic-blank-tee",
    name: "Classic Blank Tee (Pack)",
    category: "wholesale-blanks",
    description: "Heavy cotton blank tees, ready for printing.",
    detail: "Pack of blank tees for printing and bulk orders.",
    retailPrice: 5000,
    wholesalePrice: 3500,
    minimumWholesaleQuantity: 12,
    sizes: standardSizes,
    colors: colors("White", "Black", "Navy", "Grey"),
    isCustom: false,
    imageUrl: null,
    art: "tee",
  },
  {
    id: "3be2dcfd-8541-43f2-a48d-a5ad4abb335e",
    slug: "teestale-branded-polo",
    name: "TeesTale Branded Polo",
    category: "retail-polos",
    description: "Soft pique polo with a clean, modern fit.",
    detail: "A soft piqué polo with TeesTale branding.",
    retailPrice: 16500,
    wholesalePrice: 12500,
    minimumWholesaleQuantity: 6,
    sizes: standardSizes,
    colors: colors("White", "Black", "Navy", "Red"),
    isCustom: false,
    imageUrl: null,
    art: "polo",
  },
  {
    id: "99a03db9-8719-4faf-bb9f-5f8177db0627",
    slug: "bespoke-custom-mesh-jersey",
    name: "Bespoke Custom Mesh Jersey",
    category: "bespoke-custom-mesh",
    description: "Breathable mesh jersey made to your design.",
    detail: "Describe the colors, marks, and placement for a bespoke jersey.",
    retailPrice: 22000,
    wholesalePrice: 16500,
    minimumWholesaleQuantity: 10,
    sizes: standardSizes,
    colors: colors("Custom"),
    isCustom: true,
    imageUrl: null,
    art: "jersey",
  },
  {
    id: "3375198c-2fe0-48ad-aab0-2b7d99446c65",
    slug: "teestale-cap",
    name: "TeesTale Cap",
    category: "accessories",
    description: "Adjustable cap with embroidered logo.",
    detail: "An adjustable cap with an embroidered TeesTale logo.",
    retailPrice: 4000,
    wholesalePrice: 3000,
    minimumWholesaleQuantity: 12,
    sizes: ["One Size"],
    colors: colors("Black", "White", "Navy"),
    isCustom: false,
    imageUrl: null,
    art: "cap",
  },
  {
    id: "a143b1ae-55a2-4ec3-9b31-e7b6e7d37fad",
    slug: "teestale-heavyweight-hoodie",
    name: "TeesTale Heavyweight Hoodie",
    category: "streetwear",
    description: "Premium fleece cotton hoodie with fleece lining and kangaroo pocket.",
    detail: "A heavyweight fleece hoodie with a relaxed everyday fit.",
    retailPrice: 28000,
    wholesalePrice: 21000,
    minimumWholesaleQuantity: 6,
    sizes: standardSizes,
    colors: colors("Black", "Grey", "Beige"),
    isCustom: false,
    imageUrl: null,
    art: "hoodie",
  },
  {
    id: "c0b4b185-17ed-4538-99bd-4a1018ae8c2d",
    slug: "teestale-essential-sweatpants",
    name: "TeesTale Essential Sweatpants",
    category: "streetwear",
    description: "Comfortable heavyweight fleece sweatpants with a relaxed drawstring waist.",
    detail: "Heavyweight fleece sweatpants with a relaxed drawstring waist.",
    retailPrice: 24000,
    wholesalePrice: 18000,
    minimumWholesaleQuantity: 6,
    sizes: standardSizes,
    colors: colors("Black", "Grey", "Beige"),
    isCustom: false,
    imageUrl: null,
    art: "sweatpants",
  },
  {
    id: "b038986b-ef91-4f23-8bbe-61af025042c5",
    slug: "canvas-legacy-tote-bag",
    name: "Canvas Legacy Tote Bag",
    category: "accessories",
    description: "Durable heavy canvas tote bag with reinforced handles and interior pocket.",
    detail: "A durable heavy canvas tote with reinforced handles and an interior pocket.",
    retailPrice: 8500,
    wholesalePrice: 6000,
    minimumWholesaleQuantity: 15,
    sizes: ["One Size"],
    colors: colors("Natural", "Black"),
    isCustom: false,
    imageUrl: null,
    art: "tote",
  },
];

export function isProductCategory(value: string): value is ProductCategory {
  return categories.some((entry) => entry.slug === value);
}

export function getCategoryName(category: string) {
  return categories.find((entry) => entry.slug === category)?.name ?? category;
}

export function getProductBySlug(slug: string) {
  return products.find((product) => product.slug === slug);
}
