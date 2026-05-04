'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * AU-013 — Belt-and-braces protection against bfcache leaks after logout.
 *
 * Browsers cache rendered HTML in the back-forward cache (bfcache) to make
 * back-button navigation instant. After logout, pressing Back can briefly
 * render the previously authenticated page (server-side auth gates the next
 * fetch, but the cached HTML snapshot is what the user sees).
 *
 * The middleware sets `Cache-Control: no-store` headers on protected routes,
 * which is the primary fix. This component is the secondary layer: when the
 * page is restored from bfcache (`event.persisted === true`), force a fresh
 * server roundtrip via `router.refresh()`. The server-side auth check then
 * either renders the page (still authenticated) or redirects to /login.
 *
 * Mounted into each protected layout (admin / client / peer / credentialing).
 */
export function BfcacheGuard() {
  const router = useRouter();

  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        router.refresh();
      }
    }
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [router]);

  return null;
}
