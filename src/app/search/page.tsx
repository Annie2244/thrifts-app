import { Suspense } from "react";
import SearchClient from "./SearchClient";

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <main className="max-w-6xl mx-auto px-4 py-6 text-black/60">
          Loading search…
        </main>
      }
    >
      <SearchClient />
    </Suspense>
  );
}

