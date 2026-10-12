import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createAdminSupabase, getAdminAccess } from "@/lib/admin";
import { categories } from "@/lib/products";

export const runtime = "nodejs";

const bucketName = "product-images";
const maxImageSize = 8 * 1024 * 1024;
const imageTypes = {
  "image/jpeg": { extension: "jpg", signature: (bytes: Buffer) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  "image/png": {
    extension: "png",
    signature: (bytes: Buffer) =>
      bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  "image/webp": {
    extension: "webp",
    signature: (bytes: Buffer) => bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP",
  },
} as const;

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
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
  const category = categoryEntry;
  const description = descriptionEntry.trim();

  if (!productId) return errorResponse("Choose a product before saving.", 400);
  if (!categories.some((entry) => entry.slug === category)) {
    return errorResponse("Choose one of the available TeesTale categories.", 400);
  }
  if (description.length > 2000) {
    return errorResponse("Descriptions must be 2,000 characters or fewer.", 400);
  }

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

  const imageValue = form.get("image");
  const imageFile = imageValue instanceof File && imageValue.size > 0 ? imageValue : null;
  let imageUrl: string | null = null;
  let uploadedPath: string | null = null;

  if (imageFile) {
    const imageType = imageTypes[imageFile.type as keyof typeof imageTypes];
    if (!imageType) {
      return errorResponse("Choose a JPG, PNG, or WebP image.", 400);
    }
    if (imageFile.size > maxImageSize) {
      return errorResponse("The image must be 8 MB or smaller.", 400);
    }

    const imageBytes = Buffer.from(await imageFile.arrayBuffer());
    if (!imageType.signature(imageBytes)) {
      return errorResponse("The selected file does not match its image format.", 400);
    }

    uploadedPath = `catalog/${productId}/${randomUUID()}.${imageType.extension}`;
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(uploadedPath, imageBytes, {
        contentType: imageFile.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Unable to upload the catalog image.", uploadError);
      return errorResponse("The photo could not be uploaded. Check the product-images bucket and try again.", 500);
    }

    imageUrl = supabase.storage.from(bucketName).getPublicUrl(uploadedPath).data.publicUrl;
  }

  const update = {
    category,
    description,
    ...(imageUrl ? { image_url: imageUrl } : {}),
  };
  const { data: product, error: updateError } = await supabase
    .from("products")
    .update(update)
    .eq("id", productId)
    .select("id, category, description, image_url")
    .single();

  if (updateError || !product) {
    console.error("Unable to save the catalog product.", updateError);
    if (uploadedPath) {
      const { error: cleanupError } = await supabase.storage.from(bucketName).remove([uploadedPath]);
      if (cleanupError) console.error("Unable to remove an unused catalog image.", cleanupError);
    }
    return errorResponse("The catalog changes could not be saved. Please try again.", 500);
  }

  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/shop/[slug]", "page");
  revalidatePath("/cart");

  return NextResponse.json({
    ok: true,
    product: {
      id: product.id,
      category: product.category,
      description: product.description,
      imageUrl: product.image_url,
    },
  });
}
