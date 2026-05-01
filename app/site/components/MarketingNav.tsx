"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { WordmarkPerspectiv } from "./WordmarkPerspectiv";
import { nav } from "../lib/copy";

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-ink-100 bg-paper-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2" aria-label="Perspectiv home">
          <WordmarkPerspectiv className="text-lg" />
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {nav.primary.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-ink-700 hover:text-cobalt-700"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href={nav.signIn.href}
            className="text-sm text-ink-600 hover:text-ink-900"
          >
            {nav.signIn.label}
          </Link>
          <Link
            href={nav.cta.href}
            className="rounded-md bg-cobalt-600 px-4 py-2 text-sm font-medium text-white hover:bg-cobalt-700"
          >
            {nav.cta.label}
          </Link>
        </div>
        <button
          type="button"
          className="md:hidden"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-ink-100 bg-paper-surface px-6 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {nav.primary.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm text-ink-700"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href={nav.signIn.href}
              className="text-sm text-ink-600"
              onClick={() => setOpen(false)}
            >
              {nav.signIn.label}
            </Link>
            <Link
              href={nav.cta.href}
              className="rounded-md bg-cobalt-600 px-4 py-2 text-center text-sm font-medium text-white"
              onClick={() => setOpen(false)}
            >
              {nav.cta.label}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
