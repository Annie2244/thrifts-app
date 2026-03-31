"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { fileToDataUrl } from "../../../lib/image";
import { CATEGORY_OPTIONS } from "../../../lib/config";

const CATEGORY_STORAGE_KEY = "thrift-category-previews-v1";

const slugify = (label: string) =>
  label
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export default function CategoryEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const categoryId = params?.id ?? "";
  const categoryLabel = useMemo(() => {
    const found = CATEGORY_OPTIONS.find((label) => slugify(label) === categoryId);
    return found ?? "";
  }, [categoryId]);

  const [photo, setPhoto] = useState<string>("");
  const [price, setPrice] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!categoryLabel) return;
    try {
      const raw = window.localStorage.getItem(CATEGORY_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        photos?: Record<string, string>;
        prices?: Record<string, string>;
      };
      setPhoto(parsed.photos?.[categoryId] ?? "");
      setPrice(parsed.prices?.[categoryId] ?? "");
    } catch {
      // Ignore invalid storage data.
    }
  }, [categoryId, categoryLabel]);

  const handlePhotoPick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setPhoto(dataUrl);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const persist = (nextPhoto: string, nextPrice: string) => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(CATEGORY_STORAGE_KEY);
      const parsed = raw
        ? (JSON.parse(raw) as { photos?: Record<string, string>; prices?: Record<string, string> })
        : {};
      const photos = { ...(parsed.photos ?? {}) };
      const prices = { ...(parsed.prices ?? {}) };

      if (nextPhoto) {
        photos[categoryId] = nextPhoto;
      } else {
        delete photos[categoryId];
      }

      if (nextPrice) {
        prices[categoryId] = nextPrice;
      } else {
        delete prices[categoryId];
      }

      window.localStorage.setItem(
        CATEGORY_STORAGE_KEY,
        JSON.stringify({ photos, prices })
      );
    } catch {
      // Ignore storage write failures.
    }
  };

  const handleSave = () => {
    persist(photo, price);
    router.push("/");
  };

  if (!categoryLabel) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="rounded-3xl border border-black/10 bg-white p-6 text-center">
          <h1 className="text-xl font-extrabold">Category not found</h1>
          <p className="mt-2 text-black/60">That category does not exist.</p>
          <Link href="/" className="mt-4 inline-block text-sm font-semibold text-red-700">
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-black/60">Edit category</div>
          <h1 className="text-2xl font-extrabold">{categoryLabel}</h1>
        </div>
        <Link href="/" className="text-sm font-semibold text-red-700">
          Back
        </Link>
      </div>

      <div className="mt-6 rounded-3xl border border-black/10 bg-white p-5 md:p-6 space-y-4">
        <div>
          <div className="text-sm font-semibold text-black/60">Category photo</div>
          <div className="mt-2 aspect-[4/3] rounded-2xl border border-black/10 bg-black/5 overflow-hidden">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt={`${categoryLabel} preview`} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-sm text-black/50">
                No photo yet
              </div>
            )}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center justify-center px-4 py-2 rounded-full border border-black/10 bg-white text-sm font-semibold text-black/80 hover:border-black/20"
            >
              Add photo
            </button>
            {photo ? (
              <button
                type="button"
                onClick={() => setPhoto("")}
                className="text-sm font-semibold text-red-700"
              >
                Remove photo
              </button>
            ) : null}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoPick}
              className="hidden"
            />
          </div>
        </div>

        <label className="block">
          <div className="text-sm font-semibold text-black/60">Price (KSh)</div>
          <input
            type="text"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="e.g., 2400"
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-2 text-base font-semibold text-black/80 placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-black/10"
          />
        </label>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 bg-red-700 text-white py-3 rounded-2xl font-extrabold"
          >
            Save
          </button>
          <Link href="/" className="rounded-2xl border border-black/10 bg-white px-4 py-3 font-extrabold text-sm">
            Cancel
          </Link>
        </div>
      </div>
    </main>
  );
}
