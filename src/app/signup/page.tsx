"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../components/providers/AuthProvider";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { signUp } = useAuth();

  const handleSignup = async () => {
    setError(null);
    const result = await signUp(email, password);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.push("/");
  };

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-6 rounded shadow w-80">
        <h1 className="text-xl font-bold mb-4">Sign Up</h1>

        <input
          type="email"
          placeholder="Email"
          className="w-full border p-2 mb-3"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full border p-2 mb-3"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleSignup}
          className="w-full bg-black text-white py-2"
        >
          Sign Up
        </button>

        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}

        <div className="mt-4 text-sm text-black/60">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-black">
            Login
          </Link>
        </div>
      </div>
    </main>
  );
}
