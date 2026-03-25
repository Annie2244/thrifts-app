"use client";

import { useState } from "react";
import { apiCreateProduct } from "../../lib/api/marketplace";
import ImageUpload from "../../components/ImageUpload";

export default function AddProductPage() {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalImage =
      image ||
      "https://images.unsplash.com/photo-1521335629791-ce4aec67dd53";

    await apiCreateProduct({
      sellerName: "Ann",
      title: name,
      description: "Thrift clothing item",
      price: Number(price),
      category: "Clothing",
      size: "M",
      condition: "Good",
      images: [finalImage],
    });

    alert("Product saved!");

    // 🔥 THIS FIXES YOUR PROBLEM
    window.location.href = "/";
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-6 rounded-xl shadow w-full max-w-md">
        <h1 className="text-xl font-bold mb-4">Add Product</h1>

        <form onSubmit={handleSubmit} className="space-y-4">

          <input
            type="text"
            placeholder="Product Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border p-2 rounded text-black"
          />

          <input
            type="number"
            placeholder="Price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full border p-2 rounded text-black"
          />

          {/* IMAGE UPLOAD */}
          <ImageUpload value={image} onChange={setImage} />

          <button className="w-full bg-black text-white py-2 rounded">
            Save Product
          </button>

        </form>
      </div>
    </main>
  );
}
