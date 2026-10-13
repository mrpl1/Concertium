"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchBox() {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const v = q.trim();
        if (v) router.push(`/search?q=${encodeURIComponent(v)}`);
      }}
    >
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search…"
        aria-label="Search"
        className="w-32 rounded-[6px] border-0 bg-[#141414] px-3 py-1.5 text-sm text-[#ffffff] placeholder:text-[#ffffff] focus:w-48 focus:bg-white focus:ring-2 focus:ring-brand-500 sm:w-40"
      />
    </form>
  );
}
