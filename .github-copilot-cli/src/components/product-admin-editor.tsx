"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ProductMedia } from "@/components/product-media";
import { createClientSideSupabase } from "@/lib/supabase";
import { categories, isProductCategory, type Product, type ProductCategory } from "@/lib/products";

type UpdatedProduct = Pick<
  Product,
  "id" | "category" | "description" | "imageUrl" | "retailPrice" | "wholesalePrice" | "minimumWholesaleQuantity"
>;

type SaveResponse = {
  error?: string;
  product?: UpdatedProduct | Product;
};

type SignedUploadResponse = {
  error?: string;
  path?: string;
  token?: string;
};

export function ProductAdminEditor({ products: initialProducts }: { products: Product[] }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [products, setProducts] = useState(initialProducts);
  const [selectedId, setSelectedId] = useState(initialProducts[0]?.id ?? "");
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ProductCategory | "">(
    initialProducts[0] && isProductCategory(initialProducts[0].category)
      ? initialProducts[0].category
      : "",
  );
  const [description, setDescription] = useState(initialProducts[0]?.description ?? "");
  const [retailPrice, setRetailPrice] = useState("");
  const [wholesalePrice, setWholesalePrice] = useState("");
  const [minimumWholesaleQuantity, setMinimumWholesaleQuantity] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [sizes, setSizes] = useState("");
  const [colorNames, setColorNames] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const selectedProduct = products.find((product) => product.id === selectedId);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function clearImage() {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  function chooseProduct(product: Product) {
    setIsCreating(false);
    setSelectedId(product.id);
    setCategory(isProductCategory(product.category) ? product.category : "");
    setDescription(product.description);
    setRetailPrice(product.retailPrice?.toString() ?? "");
    setWholesalePrice(product.wholesalePrice?.toString() ?? "");
    setMinimumWholesaleQuantity(product.minimumWholesaleQuantity?.toString() ?? "");
    clearImage();
    setMessage(null);
  }

  function startCreating() {
    setIsCreating(true);
    setName("");
    setCategory("");
    setDescription("");
    setRetailPrice("");
    setWholesalePrice("");
    setMinimumWholesaleQuantity("");
    setSizes("");
    setColorNames("");
    clearImage();
    setMessage(null);
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const file = event.currentTarget.files?.[0] ?? null;
    setSelectedFile(file);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  }

  async function uploadSelectedImage() {
    if (!selectedFile) return null;
    if (selectedFile.size > 8 * 1024 * 1024) {
      throw new Error("The image must be 8 MB or smaller.");
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(selectedFile.type)) {
      throw new Error("Choose a JPG, PNG, or WebP image.");
    }

    const supabase = createClientSideSupabase();
    if (!supabase) {
      throw new Error("Supabase is not configured. Add the public Supabase URL and anon key, then restart the app.");
    }

    const uploadUrlResponse = await fetch("/api/admin/products/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType: selectedFile.type, size: selectedFile.size }),
    });
    const uploadUrlResult = (await uploadUrlResponse.json().catch(() => null)) as SignedUploadResponse | null;
    if (!uploadUrlResponse.ok || !uploadUrlResult?.path || !uploadUrlResult.token) {
      throw new Error(uploadUrlResult?.error ?? "A secure product photo upload could not be prepared.");
    }

    const { error } = await supabase.storage
      .from("product-images")
      .uploadToSignedUrl(uploadUrlResult.path, uploadUrlResult.token, selectedFile, {
        contentType: selectedFile.type,
        upsert: false,
      });
    if (error) {
      console.error("Unable to upload the product photo from the browser.", error);
      throw new Error("The product photo could not be uploaded. Check your connection and try again.");
    }

    const { data } = supabase.storage.from("product-images").getPublicUrl(uploadUrlResult.path);
    return { path: uploadUrlResult.path, url: data.publicUrl };
  }

  async function saveProduct(formData: FormData, creating: boolean) {
    setIsSaving(true);
    setIsUploadingImage(Boolean(selectedFile));
    setMessage(null);

    try {
      if (selectedFile) {
        const uploadedImage = await uploadSelectedImage();
        if (uploadedImage) {
          formData.set("imagePath", uploadedImage.path);
          formData.set("imageUrl", uploadedImage.url);
        }
      }

      const response = await fetch("/api/admin/products", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json().catch(() => null)) as SaveResponse | null;

      if (!response.ok || !result?.product) {
        setMessage({
          tone: "error",
          text: result?.error ?? "The catalog update did not complete. Try again.",
        });
        return;
      }

      if (creating && "name" in result.product && "slug" in result.product) {
        const createdProduct = result.product;
        setProducts((current) => [...current, createdProduct]);
        setSelectedId(createdProduct.id);
        setIsCreating(false);
      } else {
        setProducts((current) =>
          current.map((product) =>
            product.id === result.product?.id
              ? {
                  ...product,
                  category: result.product.category,
                  description: result.product.description,
                  imageUrl: result.product.imageUrl,
                  retailPrice: result.product.retailPrice,
                  wholesalePrice: result.product.wholesalePrice,
                  minimumWholesaleQuantity: result.product.minimumWholesaleQuantity,
                }
              : product,
          ),
        );
      }
      clearImage();
      setMessage({ tone: "success", text: creating ? "Product added to the catalog." : "Catalog changes saved." });
      router.refresh();
    } catch (error) {
      console.error("Unable to save catalog changes.", error);
      setMessage({
        tone: "error",
        text: error instanceof Error
          ? error.message
          : "The catalog could not be reached. Check your connection and try again.",
      });
    } finally {
      setIsSaving(false);
      setIsUploadingImage(false);
    }
  }

  function handleUpdateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProduct) return;

    const formData = new FormData();
    formData.set("intent", "update");
    formData.set("productId", selectedProduct.id);
    formData.set("category", category);
    formData.set("description", description);
    formData.set("retailPrice", retailPrice);
    formData.set("wholesalePrice", wholesalePrice);
    formData.set("minimumWholesaleQuantity", minimumWholesaleQuantity);
    void saveProduct(formData, false);
  }

  function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("intent", "create");
    void saveProduct(formData, true);
  }

  return (
    <div className="admin-editor-layout">
      <nav aria-label="Choose a product to edit" className="admin-product-list">
        <div className="admin-list-heading">
          <p className="admin-list-label">Products</p>
          <button className="admin-add-product-button" onClick={startCreating} type="button">
            + Add product
          </button>
        </div>
        {products.map((product) => (
          <button
            aria-current={!isCreating && product.id === selectedId ? "true" : undefined}
            className="admin-product-choice"
            key={product.id}
            onClick={() => chooseProduct(product)}
            type="button"
          >
            <span>{product.name}</span>
            <span aria-hidden="true">↗</span>
          </button>
        ))}
      </nav>

      {isCreating ? (
        <section aria-labelledby="admin-edit-title" className="admin-edit-panel">
          <div className="admin-edit-heading">
            <div>
              <h2 id="admin-edit-title">Add a product</h2>
              <p>Create a new listing for the TeesTale catalog.</p>
            </div>
            <span className="admin-status-label">New listing</span>
          </div>

          <form className="admin-product-form" onSubmit={handleCreateSubmit}>
            <label className="admin-field" htmlFor="new-product-name">
              Product name
              <input
                autoComplete="off"
                id="new-product-name"
                maxLength={120}
                name="name"
                onChange={(event) => setName(event.currentTarget.value)}
                required
                value={name}
              />
              <span className="admin-field-help">The product URL is generated from this name.</span>
            </label>

            <label className="admin-field" htmlFor="new-product-category">
              Category
              <select
                id="new-product-category"
                name="category"
                onChange={(event) => setCategory(event.currentTarget.value as ProductCategory | "")}
                required
                value={category}
              >
                <option value="">Choose a category</option>
                {categories.map((entry) => (
                  <option key={entry.slug} value={entry.slug}>{entry.name}</option>
                ))}
              </select>
            </label>

            <label className="admin-field" htmlFor="new-product-description">
              Description
              <textarea
                id="new-product-description"
                maxLength={2000}
                name="description"
                onChange={(event) => setDescription(event.currentTarget.value)}
                required
                rows={4}
                value={description}
              />
              <span className="admin-field-help">{description.length}/2000 characters</span>
            </label>

            <div className="admin-price-fields">
              <label className="admin-field" htmlFor="new-product-retail-price">
                Retail price
                <input
                  id="new-product-retail-price"
                  min="0"
                  name="retailPrice"
                  onChange={(event) => setRetailPrice(event.currentTarget.value)}
                  placeholder="Leave blank if unconfirmed"
                  step="0.01"
                  type="number"
                  value={retailPrice}
                />
              </label>
              <label className="admin-field" htmlFor="new-product-wholesale-price">
                Wholesale price
                <input
                  id="new-product-wholesale-price"
                  min="0"
                  name="wholesalePrice"
                  onChange={(event) => setWholesalePrice(event.currentTarget.value)}
                  placeholder="Leave blank if unconfirmed"
                  step="0.01"
                  type="number"
                  value={wholesalePrice}
                />
              </label>
            </div>

            <label className="admin-field" htmlFor="new-product-minimum">
              Minimum wholesale quantity
              <input
                id="new-product-minimum"
                min="1"
                name="minimumWholesaleQuantity"
                onChange={(event) => setMinimumWholesaleQuantity(event.currentTarget.value)}
                placeholder="Optional"
                step="1"
                type="number"
                value={minimumWholesaleQuantity}
              />
              <span className="admin-field-help">Leave blank when no minimum applies.</span>
            </label>

            <label className="admin-field" htmlFor="new-product-sizes">
              Sizes
              <input
                id="new-product-sizes"
                maxLength={500}
                name="sizes"
                onChange={(event) => setSizes(event.currentTarget.value)}
                placeholder="S, M, L, XL"
                required
                value={sizes}
              />
              <span className="admin-field-help">Separate each size with a comma. Use “One Size” for accessories.</span>
            </label>

            <label className="admin-field" htmlFor="new-product-colors">
              Colors
              <input
                id="new-product-colors"
                maxLength={500}
                name="colors"
                onChange={(event) => setColorNames(event.currentTarget.value)}
                placeholder="Black, White, Navy"
                required
                value={colorNames}
              />
              <span className="admin-field-help">Separate each color with a comma.</span>
            </label>

            {previewUrl && (
              <div className="admin-image-preview">
                <Image
                  alt={`Preview of the selected photo for ${name || "new product"}`}
                  className="admin-preview-photo"
                  fill
                  sizes="(max-width: 720px) 100vw, 60vw"
                  src={previewUrl}
                  unoptimized
                />
                <span className="admin-preview-caption">New photo preview</span>
              </div>
            )}

            <label className="admin-field" htmlFor="new-product-image">
              Product photo
              <input
                accept="image/jpeg,image/png,image/webp"
                id="new-product-image"
                onChange={handleImageChange}
                ref={fileInput}
                type="file"
              />
              <span className="admin-field-help">Optional. JPG, PNG, or WebP; maximum file size: 8 MB.</span>
            </label>

            {message && (
              <p aria-live="polite" className={`admin-feedback admin-feedback--${message.tone}`} role="status">
                {message.text}
              </p>
            )}

            <button className="button button-dark admin-save-button" disabled={isSaving} type="submit">
              {isSaving
                ? (isUploadingImage ? "Uploading photo and adding..." : "Adding product...")
                : "Add product"}
              <span aria-hidden="true">{isSaving ? "…" : "↗"}</span>
            </button>
          </form>
        </section>
      ) : selectedProduct ? (
        <section aria-labelledby="admin-edit-title" className="admin-edit-panel">
          <div className="admin-edit-heading">
            <div>
              <h2 id="admin-edit-title">{selectedProduct.name}</h2>
              <p>Update its catalog photo and the details customers see.</p>
            </div>
            <span className="admin-status-label">Catalog edit</span>
          </div>

          <form className="admin-product-form" onSubmit={handleUpdateSubmit}>
            <div className="admin-image-preview">
              {previewUrl ? (
                <Image
                  alt={`Preview of the selected photo for ${selectedProduct.name}`}
                  className="admin-preview-photo"
                  fill
                  sizes="(max-width: 720px) 100vw, 60vw"
                  src={previewUrl}
                  unoptimized
                />
              ) : (
                <ProductMedia
                  className="admin-current-photo"
                  product={selectedProduct}
                  sizes="(max-width: 720px) 100vw, 60vw"
                />
              )}
              <span className="admin-preview-caption">
                {previewUrl ? "New photo preview" : selectedProduct.imageUrl ? "Current catalog photo" : "Product photo to be added"}
              </span>
            </div>

            <label className="admin-field" htmlFor="product-image">
              Product photo
              <input
                accept="image/jpeg,image/png,image/webp"
                id="product-image"
                onChange={handleImageChange}
                ref={fileInput}
                type="file"
              />
              <span className="admin-field-help">JPG, PNG, or WebP. Maximum file size: 8 MB.</span>
            </label>

            <label className="admin-field" htmlFor="product-category">
              Category
              <select
                id="product-category"
                onChange={(event) => setCategory(event.currentTarget.value as ProductCategory | "")}
                value={category}
              >
                <option value="">Choose a category</option>
                {categories.map((entry) => (
                  <option key={entry.slug} value={entry.slug}>{entry.name}</option>
                ))}
              </select>
            </label>

            <label className="admin-field" htmlFor="product-description">
              Description
              <textarea
                id="product-description"
                maxLength={2000}
                onChange={(event) => setDescription(event.currentTarget.value)}
                rows={5}
                value={description}
              />
              <span className="admin-field-help">{description.length}/2000 characters</span>
            </label>

            <div className="admin-price-fields">
              <label className="admin-field" htmlFor="product-retail-price">
                Retail price
                <input
                  id="product-retail-price"
                  min="0"
                  onChange={(event) => setRetailPrice(event.currentTarget.value)}
                  placeholder="Leave blank if unconfirmed"
                  step="0.01"
                  type="number"
                  value={retailPrice}
                />
              </label>
              <label className="admin-field" htmlFor="product-wholesale-price">
                Wholesale price
                <input
                  id="product-wholesale-price"
                  min="0"
                  onChange={(event) => setWholesalePrice(event.currentTarget.value)}
                  placeholder="Leave blank if unconfirmed"
                  step="0.01"
                  type="number"
                  value={wholesalePrice}
                />
              </label>
            </div>

            <label className="admin-field" htmlFor="product-minimum-wholesale">
              Minimum wholesale quantity
              <input
                id="product-minimum-wholesale"
                min="1"
                onChange={(event) => setMinimumWholesaleQuantity(event.currentTarget.value)}
                placeholder="Optional"
                step="1"
                type="number"
                value={minimumWholesaleQuantity}
              />
              <span className="admin-field-help">Leave blank when no minimum applies.</span>
            </label>

            {message && (
              <p aria-live="polite" className={`admin-feedback admin-feedback--${message.tone}`} role="status">
                {message.text}
              </p>
            )}

            <button className="button button-dark admin-save-button" disabled={isSaving} type="submit">
              {isSaving ? (isUploadingImage ? "Uploading photo and saving..." : "Saving changes...") : "Save catalog changes"}
              <span aria-hidden="true">{isSaving ? "…" : "↗"}</span>
            </button>
          </form>
        </section>
      ) : (
        <section aria-labelledby="admin-edit-title" className="admin-edit-panel">
          <div className="admin-edit-heading">
            <div>
              <h2 id="admin-edit-title">No products yet</h2>
              <p>Add the first catalog listing to get started.</p>
            </div>
          </div>
          <button className="button button-dark admin-save-button" onClick={startCreating} type="button">
            Add your first product <span aria-hidden="true">↗</span>
          </button>
        </section>
      )}
    </div>
  );
}
