"use client";

import React, { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { nanoid } from "nanoid";
import { apiCreateProduct } from "../../../lib/api/marketplace";
import { CONDITION_OPTIONS, CATEGORY_OPTIONS, STORAGE_BUCKET_PRODUCT_IMAGES } from "../../../lib/config";
import type { ProductCondition } from "../../../lib/types";
import { parseSizes } from "../../../lib/format";
import { useUserProfile } from "../../../components/providers/UserProvider";
import AuthGate from "../../../components/AuthGate";
import { fileToDataUrl } from "../../../lib/image";
import { hasSupabase, supabase } from "../../../lib/supabase";

export default function NewListingPage() {
  const router = useRouter();
  const { sellerName, setSellerName } = useUserProfile();

  const [sellerDraft, setSellerDraft] = useState(sellerName);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<string>("");
  const [category, setCategory] = useState<string>(CATEGORY_OPTIONS[0]);
  const [size, setSize] = useState<string>("M, L");
  const [condition, setCondition] = useState<ProductCondition>("Good");
  const [images, setImages] = useState<{ preview: string; dataUrl: string; file?: File }[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const normalizedPrice = price.replace(/[^\d.]/g, "");
  const parsedPrice = Number(normalizedPrice);

  const canSubmit = useMemo(() => {
    return (
      sellerDraft.trim() &&
      title.trim() &&
      description.trim() &&
      normalizedPrice.trim() &&
      Number.isFinite(parsedPrice) &&
      parsedPrice > 0 &&
      images.length > 0 &&
      parseSizes(size).length > 0
    );
  }, [sellerDraft, title, description, normalizedPrice, parsedPrice, images.length, size]);

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    setImageError(null);

    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!list.length) {
      setImageError("Please select image files only.");
      return;
    }

    try {
      const dataUrls = await Promise.all(
        list.slice(0, 5).map(async (file) => {
          const dataUrl = await fileToDataUrl(file);
          return { preview: dataUrl, dataUrl, file };
        })
      );

      setImages((prev) => {
        const merged = [...prev, ...dataUrls];
        return merged.slice(0, 5);
      });
    } catch {
      setImageError("Failed to read one of the images.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      toast.error("Please complete all fields and add at least one image");
      return;
    }
    setSubmitting(true);
    try {
      const dataUrls = images.map((img) => img.dataUrl);
      let imageUrls = dataUrls;

      if (hasSupabase) {
        const files = images.map((img) => img.file).filter(Boolean) as File[];
        try {
          imageUrls = await Promise.all(
            files.map(async (file) => {
              const ext = file.name.split(".").pop() || "jpg";
              const path = `products/${Date.now()}-${nanoid(6)}.${ext}`;
              const { error } = await supabase.storage
                .from(STORAGE_BUCKET_PRODUCT_IMAGES)
                .upload(path, file, {
                  contentType: file.type || "image/jpeg",
                  upsert: false,
                });
              if (error) throw error;
              const { data } = supabase.storage
                .from(STORAGE_BUCKET_PRODUCT_IMAGES)
                .getPublicUrl(path);
              return data.publicUrl;
            })
          );
        } catch (err: unknown) {
          toast.error(
            err instanceof Error
              ? err.message
              : "Image upload failed. Check your Supabase storage bucket."
          );
          setSubmitting(false);
          return;
        }
      }

      const product = await apiCreateProduct({
        sellerName: sellerDraft,
        title,
        description,
        price: parsedPrice,
        category,
        size,
        condition,
        images: imageUrls,
      });

      setSellerName(sellerDraft);
      toast.success("Listing created");
      router.push(`/product/${product.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create listing");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthGate title="Log in to list an item" message="Sign in to create listings and manage your shop.">
    <main className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-xl font-extrabold mb-4">Create Listing</h1>

      <form onSubmit={submit} className="rounded-3xl border border-black/10 bg-white p-5 md:p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <div className="text-xs font-semibold text-black/60">Seller name</div>
            <input
              value={sellerDraft}
              onChange={(e) => setSellerDraft(e.target.value)}
              className="mt-1 w-full border border-black/10 rounded-2xl px-3 py-2"
              placeholder="e.g., Amina Thrift"
            />
          </label>

          <label className="block">
            <div className="text-xs font-semibold text-black/60">Category</div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full border border-black/10 rounded-2xl px-3 py-2"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="block md:col-span-2">
            <div className="text-xs font-semibold text-black/60">Title</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full border border-black/10 rounded-2xl px-3 py-2"
              placeholder="e.g., Vintage Denim Shirt"
            />
          </label>

          <label className="block">
            <div className="text-xs font-semibold text-black/60">Price (KSh)</div>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="numeric"
              className="mt-1 w-full border border-black/10 rounded-2xl px-3 py-2"
              placeholder="e.g., 2400"
            />
            {price.trim() && (!Number.isFinite(parsedPrice) || parsedPrice <= 0) ? (
              <div className="mt-1 text-xs text-red-700 font-semibold">Enter a valid price.</div>
            ) : null}
          </label>

          <label className="block">
            <div className="text-xs font-semibold text-black/60">Condition</div>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as ProductCondition)}
              className="mt-1 w-full border border-black/10 rounded-2xl px-3 py-2"
            >
              {CONDITION_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="block md:col-span-2">
            <div className="text-xs font-semibold text-black/60">Sizes (comma-separated)</div>
            <input
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="mt-1 w-full border border-black/10 rounded-2xl px-3 py-2"
              placeholder="e.g., S, M, L"
            />
          </label>

          <label className="block md:col-span-2">
            <div className="text-xs font-semibold text-black/60">Description</div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full border border-black/10 rounded-2xl px-3 py-2"
              placeholder="Fabric, fit, defects (if any), and delivery notes…"
              rows={5}
            />
          </label>
        </div>

        <div className="rounded-3xl border border-black/10 bg-gray-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-extrabold">Product Images</div>
              <div className="text-sm text-black/60">Add up to 5 images (supports zoom on the product page).</div>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center justify-center px-4 py-2 rounded-full border border-black/10 bg-white font-extrabold text-sm"
            >
              Upload
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => onFiles(e.currentTarget.files)}
            />
          </div>

          {imageError ? (
            <div className="mt-2 text-sm text-red-700 font-semibold">{imageError}</div>
          ) : null}

          {images.length ? (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {images.map((img, idx) => (
                <div key={idx} className="rounded-2xl border border-black/10 overflow-hidden bg-white relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.preview} alt={`Upload preview ${idx + 1}`} className="h-28 w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setImages((prev) => prev.filter((_, i) => i !== idx));
                    }}
                    className="absolute top-2 right-2 rounded-full bg-black/70 text-white p-1 text-xs font-extrabold"
                    aria-label="Remove image"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 text-sm text-black/60">No images added yet.</div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="flex-1 bg-red-700 text-white py-3 rounded-2xl font-extrabold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Creating…" : "Publish listing"}
          </button>
          <Link href="/sell" className="rounded-2xl border border-black/10 bg-white px-4 py-3 font-extrabold text-sm">
            Back
          </Link>
        </div>
      </form>
    </main>
    </AuthGate>
  );
}
