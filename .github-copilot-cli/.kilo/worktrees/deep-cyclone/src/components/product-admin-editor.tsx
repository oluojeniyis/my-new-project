"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ProductMedia } from "@/components/product-media";
import { categories, isProductCategory, type Product, type ProductCategory } from "@/lib/products";

type UpdatedProduct = {
  id: string;
  category: ProductCategory;
  description: string;
  imageUrl: string | null;
};

type SaveResponse = {
  error?: string;
  product?: UpdatedProduct;
};

export function ProductAdminEditor({ products: initialProducts }: { products: Product[] }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [products, setProducts] = useState(initialProducts);
  const [selectedId, setSelectedId] = useState(initialProducts[0]?.id ?? "");
  const [category, setCategory] = useState<ProductCategory | "">(
    initialProducts[0] && isProductCategory(initialProducts[0].category)
      ? initialProducts[0].category
      : "",
  );
  const [description, setDescription] = useState(initialProducts[0]?.description ?? "");
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

  function chooseProduct(product: Product) {
    setSelectedId(product.id);
    setCategory(isProductCategory(product.category) ? product.category : "");
    setDescription(product.description);
    setSelectedFile(null);
    setPreviewUrl(null);
    setMessage(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const file = event.currentTarget.files?.[0] ?? null;
    setSelectedFile(file);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProduct) return;

    setIsSaving(true);
    setMessage(null);

    const formData = new FormData();
    formData.set("productId", selectedProduct.id);
    formData.set("category", category);
    formData.set("description", description);
    if (selectedFile) formData.set("image", selectedFile);

    try {
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

      setProducts((current) =>
        current.map((product) =>
          product.id === result.product?.id
            ? {
                ...product,
                category: result.product.category,
                description: result.product.description,
                imageUrl: result.product.imageUrl,
              }
            : product,
        ),
      );
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInput.current) fileInput.current.value = "";
      setMessage({ tone: "success", text: "Catalog changes saved." });
      router.refresh();
    } catch (error) {
      console.error("Unable to save catalog changes.", error);
      setMessage({ tone: "error", text: "The catalog could not be reached. Check your connection and try again." });
    } finally {
      setIsSaving(false);
    }
  }

  if (!selectedProduct) {
    return <p className="admin-empty">There are no products to edit yet. Seed the catalog in Supabase first.</p>;
  }

  return (
    <div className="admin-editor-layout">
      <nav aria-label="Choose a product to edit" className="admin-product-list">
        <p className="admin-list-label">Products</p>
        {products.map((product) => (
          <button
            aria-current={product.id === selectedId ? "true" : undefined}
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

      <section aria-labelledby="admin-edit-title" className="admin-edit-panel">
        <div className="admin-edit-heading">
          <div>
            <h2 id="admin-edit-title">{selectedProduct.name}</h2>
            <p>Update its catalog photo and the details customers see.</p>
          </div>
          <span className="admin-status-label">Catalog edit</span>
        </div>

        <form className="admin-product-form" onSubmit={handleSubmit}>
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

          {message && (
            <p aria-live="polite" className={`admin-feedback admin-feedback--${message.tone}`} role="status">
              {message.text}
            </p>
          )}

          <button className="button button-dark admin-save-button" disabled={isSaving} type="submit">
            {isSaving ? "Saving changes..." : "Save catalog changes"}
            <span aria-hidden="true">{isSaving ? "…" : "↗"}</span>
          </button>
        </form>
      </section>
    </div>
  );
}
