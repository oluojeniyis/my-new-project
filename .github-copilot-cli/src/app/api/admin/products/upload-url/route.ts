import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminSupabase, getAdminAccess } from "@/lib/admin";

export const runtime = "nodejs";

const bucketName = "product-images";
const maxImageSize = 8 * 1024 * 1024;
const imageExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

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
    return errorResponse("This image upload did not come from the TeesTale site.", 403);
  }

  const access = await getAdminAccess();
  if (access.status === "unauthenticated") {
    return errorResponse("Sign in with an approved Google account before uploading product photos.", 401);
  }
  if (access.status === "forbidden") {
    return errorResponse("This Google account is not approved to upload product photos.", 403);
  }
  if (access.status !== "authorized") {
    return errorResponse("Catalog image uploads are not configured on the server yet.", 503);
  }

  const supabase = createAdminSupabase();
  if (!supabase) {
    return errorResponse("Catalog image uploads are not configured on the server yet.", 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("The image upload details could not be read.", 400);
  }
  if (typeof body !== "object" || body === null) {
    return errorResponse("Choose a JPG, PNG, or WebP product photo.", 400);
  }

  const contentType = (body as { contentType?: unknown }).contentType;
  const size = (body as { size?: unknown }).size;
  if (typeof contentType !== "string" || !imageExtensions[contentType]) {
    return errorResponse("Choose a JPG, PNG, or WebP product photo.", 400);
  }
  if (typeof size !== "number" || !Number.isFinite(size) || size <= 0 || size > maxImageSize) {
    return errorResponse("The image must be greater than 0 bytes and no larger than 8 MB.", 400);
  }

  const path = `catalog/${randomUUID()}/${randomUUID()}.${imageExtensions[contentType]}`;
  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUploadUrl(path, { upsert: false });

  if (error || !data) {
    console.error("Unable to create a signed product-image upload.", error);
    return errorResponse("A secure upload could not be prepared. Check the product-images bucket and try again.", 500);
  }

  return NextResponse.json({ path: data.path, token: data.token });
}
