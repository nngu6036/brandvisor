"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../lib/authStore";
import { RiLoginBoxLine } from "@remixicon/react";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function submit(e) {
    e.preventDefault();
    // MVP demo: accept ANY credentials
    login({ email: email || "demo@brandvisor.local" });
    router.push("/brands");
  }


  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <RiLoginBoxLine className="h-5 w-5" />
          <h1 className="text-xl font-semibold">Login (Demo)</h1>
        </div>
        <p className="mt-1 text-sm text-zinc-600">
          This MVP accepts <span className="font-medium">any</span> credentials for demonstration.
        </p>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700">Email</label>
            <input
              className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              type="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">Password</label>
            <input
              className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              type="password"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
