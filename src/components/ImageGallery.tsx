"use client";

import React, { useMemo, useState } from "react";
import { X } from "lucide-react";

export default function ImageGallery({ images }: { images: string[] }) {
  const safeImages = useMemo(
    () => (Array.isArray(images) ? images.filter(Boolean) : []),
    [images]
  );

  const [activeIdx, setActiveIdx] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);

  const active = safeImages[activeIdx] ?? safeImages[0];

  if (!safeImages.length) {
    return (
      <div className="h-72 rounded-3xl border border-black/10 bg-gray-100 flex items-center justify-center text-black/40">
        No Images
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-3xl border border-black/10 overflow-hidden bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={active}
          alt="Product image"
          className="h-72 w-full object-cover cursor-zoom-in"
          onClick={() => setZoomOpen(true)}
        />
      </div>

      {safeImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {safeImages.map((src, idx) => (
            <button
              key={src + idx}
              type="button"
              onClick={() => setActiveIdx(idx)}
              className={`rounded-2xl overflow-hidden border ${
                idx === activeIdx ? "border-red-700" : "border-black/10"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                className="h-16 w-16 object-cover bg-gray-50"
              />
            </button>
          ))}
        </div>
      )}

      {zoomOpen && active && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 p-4 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setZoomOpen(false)}
            className="absolute top-4 right-4 rounded-full bg-white/10 text-white p-2"
            aria-label="Close zoom"
          >
            <X size={18} />
          </button>

          <div className="max-w-4xl w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={active}
              alt="Zoomed product"
              className="w-full max-h-[75vh] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}

