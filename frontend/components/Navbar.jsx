"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { RiSparkling2Line, RiLogoutBoxLine } from "@remixicon/react";
import { useAuthStore } from "../lib/authStore";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  const isAuthed = useAuthStore((s) => s.isAuthed);
  const logout = useAuthStore((s) => s.logout);

  function doLogout() {
    logout();
    router.push("/login");
  }

  const brandsHref = "/brands"; // change to "/brands" if needed
  const isBrandsActive = pathname === brandsHref || pathname?.startsWith("/brand/");

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href={brandsHref} className="flex items-center gap-2 font-semibold">
            <RiSparkling2Line className="h-5 w-5" />
            BrandVisor
          </Link>

          {/* ✅ Only show after login */}
          {isAuthed && (
            <Link
              href={brandsHref}
              className={[
                "rounded-xl px-3 py-2 text-sm font-medium",
                isBrandsActive
                  ? "bg-zinc-100 text-zinc-900"
                  : "text-zinc-700 hover:bg-zinc-100",
              ].join(" ")}
            >
              Brands
            </Link>
          )}
        </div>

        <nav className="ml-auto flex items-center gap-2">
          {isAuthed ? (
            <button
              onClick={doLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm hover:bg-zinc-50"
            >
              <RiLogoutBoxLine className="h-4 w-4" />
              Logout
            </button>
          ) : pathname === "/login" ? null : (
            <Link
              href="/login"
              className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
