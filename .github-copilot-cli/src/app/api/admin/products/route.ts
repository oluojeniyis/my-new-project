import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createAdminSupabase, getAdminAccess } from "@/lib/admin";
import { categories, products, type Product } from "@/lib/products";

export const runtime = "nodejs";

const bucketName = "product-images";
const imagePathPattern = /^catalog\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/i;
const colorValues: Record<string, string> = {
  beige: "#D6C6A8",
  black: "#111827",
  blue: "#2563EB",
  brown: "#78350F",
  green: "#15803D",
  grey: "#9CA3AF",
  gray: "#9CA3AF",
  navy: "#1E3A5F",
  natural: "#D1C3A1",
  orange: "#EA580C",
  pink: "#DB2777",
  purple: "#7E22CE",
  red: "#B91C1C",
  white: "#F9FAFB",
  yellow: "#CA8A04",
};

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

function parseOptionalNumber(
  form: FormData,
  field: string,
  label: string,
  integer = false,
): ValidationResult<number | null> {
  const raw = form.get(field);
  if (typeof raw !== "string") {
    return { ok: false, error: `${label} is missing.` };
  }
  if (!raw.trim()) {
    return { ok: true, value: null };
  }

  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || (integer && (!Number.isInteger(value) || value === 0))) {
    return {
      ok: false,
      error: `${label} must be ${integer ? "a positive whole number" : "a non-negative number"}, or left blank.`,
    };
  }
  if (value > 99_999_999.99) {
    return { ok: false, error: `${label} is above the supported catalog limit.` };
  }
  return { ok: true, value };
}

function parseCommaSeparated(form: FormData, field: string, label: string): ValidationResult<string[]> {
  const raw = form.get(field);
  if (typeof raw !== "string") {
    return { ok: false, error: `${label} is missing.` };
  }
  const values = [...new Set(raw.split(",").map((value) => value.trim()).filter(Boolean))];
  if (!values.length || values.length > 20 || values.some((value) => value.length > 40)) {
    return {
      ok: false,
      error: `Enter 1–20 ${label.toLowerCase()}, separated by commas; each can be up to 40 characters.`,
    };
  }
  return { ok: true, value: values };
}

function createSlug(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function getVerifiedImage(form: FormData, supabase: NonNullable<ReturnType<typeof createAdminSupabase>>) {
  const pathEntry = form.get("imagePath");
  const urlEntry = form.get("imageUrl");
  if (pathEntry === null && urlEntry === null) {
    return { ok: true, path: null, url: null } as const;
  }
  if (typeof pathEntry !== "string" || typeof urlEntry !== "string" || !imagePathPattern.test(pathEntry)) {
    return { ok: false, error: "The uploaded product image reference is invalid." } as const;
  }

  const storage = supabase.storage.from(bucketName);
  const expectedUrl = storage.getPublicUrl(pathEntry).data.publicUrl;
  if (urlEntry !== expectedUrl) {
    return { ok: false, error: "The image URL does not match the uploaded TeesTale product photo." } as const;
  }

  const { data, error } = await storage.download(pathEntry);
  if (error) {
    console.error("Unable to verify the uploaded product image.", error);
    return { ok: false, error: "The uploaded product photo could not be verified. Try uploading it again." } as const;
  }
  if (data.size > 8 * 1024 * 1024) {
    return { ok: false, error: "The uploaded product photo is larger than 8 MB." } as const;
  }

  const bytes = Buffer.from(await data.arrayBuffer());
  const extension = pathEntry.match(imagePathPattern)?.[1].toLowerCase();
  const signatureMatches = extension === "jpg"
    ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    : extension === "png"
      ? bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
      : extension === "webp"
        ? bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP"
        : false;
  if (!signatureMatches) {
    return { ok: false, error: "The uploaded file does not match its image format." } as const;
  }

  return { ok: true, path: pathEntry, url: expectedUrl } as const;
}

function revalidateCatalog() {
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/shop/[slug]", "page");
  revalidatePath("/cart");
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  let originIsValid = false;
  try {
    originIsValid = Boolean(origin && new URL(origin).origin === new URL(request.url).origin);
  } catch {
    originIsValid = false;
  }
  if (!originIsValid) {
    return errorResponse("This catalog update did not come from the TeesTale site.", 403);
  }

  const access = await getAdminAccess();
  if (access.status === "unauthenticated") {
    return errorResponse("Sign in with an approved Google account before editing the catalog.", 401);
  }
  if (access.status === "forbidden") {
    return errorResponse("This Google account is not approved to edit the catalog.", 403);
  }
  if (access.status !== "authorized") {
    return errorResponse("Catalog editing is not configured on the server yet.", 503);
  }

  const supabase = createAdminSupabase();
  if (!supabase) {
    return errorResponse("Catalog editing is not configured on the server yet.", 503);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorResponse("The catalog form could not be read. Please try again.", 400);
  }

  const intent = form.get("intent");
  if (intent === "create") {
    const nameEntry = form.get("name");
    const categoryEntry = form.get("category");
    const descriptionEntry = form.get("description");
    if (
      typeof nameEntry !== "string" ||
      typeof categoryEntry !== "string" ||
      typeof descriptionEntry !== "string"
    ) {
      return errorResponse("The product name, category, or description is missing.", 400);
    }

    const name = nameEntry.trim();
    const category = categories.find((entry) => entry.slug === categoryEntry);
    const description = descriptionEntry.trim();
    if (!name || name.length > 120) {
      return errorResponse("Product names must be between 1 and 120 characters.", 400);
    }
    if (!category) {
      return errorResponse("Choose one of the available TeesTale categories.", 400);
    }
    if (description.length > 2000) {
      return errorResponse("Descriptions must be 2,000 characters or fewer.", 400);
    }

    const slug = createSlug(name);
    if (!slug) {
      return errorResponse("Use a product name that includes letters or numbers.", 400);
    }

    const retailPrice = parseOptionalNumber(form, "retailPrice", "Retail price");
    const wholesalePrice = parseOptionalNumber(form, "wholesalePrice", "Wholesale price");
    const minimumWholesaleQuantity = parseOptionalNumber(
      form,
      "minimumWholesaleQuantity",
      "Minimum wholesale quantity",
      true,
    );
    const sizes = parseCommaSeparated(form, "sizes", "Sizes");
    const colorNames = parseCommaSeparated(form, "colors", "Colors");
    if (!retailPrice.ok) return errorResponse(retailPrice.error, 400);
    if (!wholesalePrice.ok) return errorResponse(wholesalePrice.error, 400);
    if (!minimumWholesaleQuantity.ok) return errorResponse(minimumWholesaleQuantity.error, 400);
    if (!sizes.ok) return errorResponse(sizes.error, 400);
    if (!colorNames.ok) return errorResponse(colorNames.error, 400);

    const image = await getVerifiedImage(form, supabase);
    if (!image.ok) return errorResponse(image.error, 400);

    const productId = randomUUID();
    const colorOptions = colorNames.value.map((colorName) => ({
      name: colorName,
      value: colorValues[colorName.toLowerCase()] ?? "#6B7280",
    }));
    const { data: row, error: insertError } = await supabase
      .from("products")
      .insert({
        id: productId,
        name,
        slug,
        category: category.slug,
        description,
        image_url: image.url,
        retail_price: retailPrice.value,
        wholesale_price: wholesalePrice.value,
        min_wholesale_qty: minimumWholesaleQuantity.value,
        sizes: sizes.value,
        colors: colorOptions,
        is_custom: category.slug === "bespoke-custom-mesh",
      })
      .select("id, name, slug, category, description, image_url, retail_price, wholesale_price, min_wholesale_qty, sizes, colors, is_custom")
      .single();

    if (insertError || !row) {
      console.error("Unable to create the catalog product.", insertError);
      if (image.path) {
        const { error: cleanupError } = await supabase.storage.from(bucketName).remove([image.path]);
        if (cleanupError) console.error("Unable to remove an unused catalog image.", cleanupError);
      }
      if (insertError?.code === "23505") {
        return errorResponse("A product with this name already exists. Choose a distinct product name.", 409);
      }
      return errorResponse("The new product could not be saved. Check the catalog table and try again.", 500);
    }

    const sample = products.find((product) => product.category === category.slug) ?? products[0];
    const product: Product = {
      ...sample,
      id: row.id,
      name: row.name,
      slug: row.slug,
      category: category.slug,
      description: row.description,
      detail: row.description,
      imageUrl: row.image_url,
      retailPrice: row.retail_price === null ? null : Number(row.retail_price),
      wholesalePrice: row.wholesale_price === null ? null : Number(row.wholesale_price),
      minimumWholesaleQuantity: row.min_wholesale_qty,
      sizes: row.sizes,
      colors: colorOptions,
      isCustom: row.is_custom,
    };

    revalidateCatalog();
    return NextResponse.json({ ok: true, product }, { status: 201 });
  }

  if (intent !== "update") {
    return errorResponse("Choose whether to create or update a product.", 400);
  }

  const productIdEntry = form.get("productId");
  const categoryEntry = form.get("category");
  const descriptionEntry = form.get("description");
  if (
    typeof productIdEntry !== "string" ||
    typeof categoryEntry !== "string" ||
    typeof descriptionEntry !== "string"
  ) {
    return errorResponse("The product, category, or description is missing.", 400);
  }

  const productId = productIdEntry;
  const category = categories.find((entry) => entry.slug === categoryEntry);
  const description = descriptionEntry.trim();
  if (!productId) return errorResponse("Choose a product before saving.", 400);
  if (!category) return errorResponse("Choose one of the available TeesTale categories.", 400);
  if (description.length > 2000) {
    return errorResponse("Descriptions must be 2,000 characters or fewer.", 400);
  }

  const retailPrice = parseOptionalNumber(form, "retailPrice", "Retail price");
  const wholesalePrice = parseOptionalNumber(form, "wholesalePrice", "Wholesale price");
  const minimumWholesaleQuantity = parseOptionalNumber(
    form,
    "minimumWholesaleQuantity",
    "Minimum wholesale quantity",
    true,
  );
  if (!retailPrice.ok) return errorResponse(retailPrice.error, 400);
  if (!wholesalePrice.ok) return errorResponse(wholesalePrice.error, 400);
  if (!minimumWholesaleQuantity.ok) return errorResponse(minimumWholesaleQuantity.error, 400);

  const { data: existingProduct, error: lookupError } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .maybeSingle();
  if (lookupError) {
    console.error("Unable to verify the product before editing.", lookupError);
    return errorResponse("The product could not be found. Check the Supabase catalog and try again.", 500);
  }
  if (!existingProduct) return errorResponse("That product is no longer in the catalog.", 404);

  const image = await getVerifiedImage(form, supabase);
  if (!image.ok) return errorResponse(image.error, 400);
  const update = {
    category: category.slug,
    description,
    is_custom: category.slug === "bespoke-custom-mesh",
    retail_price: retailPrice.value,
    wholesale_price: wholesalePrice.value,
    min_wholesale_qty: minimumWholesaleQuantity.value,
    ...(image.url ? { image_url: image.url } : {}),
  };
  const { data: row, error: updateError } = await supabase
    .from("products")
    .update(update)
    .eq("id", productId)
    .select("id, category, description, image_url, retail_price, wholesale_price, min_wholesale_qty")
    .single();

  if (updateError || !row) {
    console.error("Unable to save the catalog product.", updateError);
    if (image.path) {
      const { error: cleanupError } = await supabase.storage.from(bucketName).remove([image.path]);
      if (cleanupError) console.error("Unable to remove an unused catalog image.", cleanupError);
    }
    return errorResponse("The catalog changes could not be saved. Please try again.", 500);
  }

  revalidateCatalog();
  return NextResponse.json({
    ok: true,
    product: {
      id: row.id,
      category: row.category,
      description: row.description,
      imageUrl: row.image_url,
      retailPrice: row.retail_price === null ? null : Number(row.retail_price),
      wholesalePrice: row.wholesale_price === null ? null : Number(row.wholesale_price),
      minimumWholesaleQuantity: row.min_wholesale_qty,
    },
  });
}
