"use client";

import { useState } from "react";
import { fileToDataUrl } from "../lib/image";

type ImageUploadProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  maxSizeMB?: number;
  className?: string;
  previewClassName?: string;
};

export default function ImageUpload({
  value,
  onChange,
  maxSizeMB = 5,
  className = "w-full border p-2 rounded text-black",
  previewClassName = "w-full h-40 object-cover rounded",
}: ImageUploadProps) {
  const [error, setError] = useState<string | null>(null);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      setError(`Image must be under ${maxSizeMB}MB.`);
      return;
    }

    const dataUrl = await fileToDataUrl(file);
    onChange(dataUrl);
  };

  return (
    <div className="space-y-2">
      <input
        type="file"
        accept="image/*"
        onChange={onFileChange}
        className={className}
      />

      {error && <div className="text-sm text-red-600">{error}</div>}

      {value && (
        <img src={value} alt="Preview" className={previewClassName} />
      )}
    </div>
  );
}
