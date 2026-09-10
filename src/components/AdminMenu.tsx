"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export type AdminLink = { href: string; label: string };

/**
 * Admin-only sections collapsed behind a single nav item. Inlining them cost
 * ~250px of header width, which pushed the account controls off screen once a
 * workspace name grew past a few characters.
 */
export function AdminMenu({ items }: { items: AdminLink[] }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  // Close after a navigation so the panel never outlives the click.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const active = items.some(
    (i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
  );

  return (
    <div className="relative shrink-0" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex items-center gap-1 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium hover:bg-gray-100 hover:text-gray-900 ${
          active || open ? "bg-gray-100 text-gray-900" : "text-gray-600"
        }`}
      >
        Admin
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={open ? "rotate-180" : ""}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open ? (
        <div
          role="menu"
          aria-label="Admin"
          className="absolute right-0 z-20 mt-1 min-w-[10rem] rounded-md bg-white p-1 shadow-lg ring-1 ring-gray-200"
        >
          {items.map((i) => (
            <Link
              key={i.href}
              role="menuitem"
              href={i.href}
              className="block whitespace-nowrap rounded px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            >
              {i.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
