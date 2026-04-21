"use client";

import { useEffect, useState } from "react";

interface Options {
  fallbackName?: string;
  fallbackEmail?: string;
}

interface Session {
  name: string;
  email: string;
  signOut: () => Promise<void>;
}

function readDemoCookie(): { role: string; name?: string; email?: string } | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)demo_user=([^;]+)/);
  if (!m) return null;
  try {
    return JSON.parse(decodeURIComponent(m[1]));
  } catch {
    return null;
  }
}

/**
 * Reads the active session — either Clerk (production) or the demo_user
 * cookie (demo / E2E_AUTH_BYPASS mode). Falls back to opts.fallbackName/Email.
 */
export function useClerkSession(opts: Options = {}): Session {
  const fallbackName = opts.fallbackName ?? "Demo User";
  const fallbackEmail = opts.fallbackEmail ?? "demo@peerspectiv.com";

  const [info, setInfo] = useState<{ name: string; email: string }>({
    name: fallbackName,
    email: fallbackEmail,
  });
  const [signOutFn, setSignOutFn] = useState<() => Promise<void>>(
    () => async () => {
      // demo / no-clerk: clear cookie via API
      try {
        await fetch("/api/demo/login", { method: "DELETE" });
      } catch {}
    }
  );

  useEffect(() => {
    let cancelled = false;

    // 1. Try demo cookie first (covers bypass mode)
    const demo = readDemoCookie();
    if (demo && !cancelled) {
      setInfo({
        name: demo.name ?? fallbackName,
        email: demo.email ?? fallbackEmail,
      });
    }

    // 2. Try real Clerk (production)
    (async () => {
      try {
        const w = window as unknown as { Clerk?: any };
        const inst = w.Clerk;
        if (!inst) return;
        await inst.load?.();
        const user = inst.user;
        if (cancelled || !user) return;
        const email =
          user.primaryEmailAddress?.emailAddress ??
          user.emailAddresses?.[0]?.emailAddress;
        const name =
          user.fullName ??
          [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ??
          email;
        setInfo({ name: name || fallbackName, email: email || fallbackEmail });
        setSignOutFn(() => async () => {
          try {
            await inst.signOut?.();
          } catch (e) {
            console.warn("Clerk signOut failed", e);
          }
          // Always also clear the demo cookie for safety
          try {
            await fetch("/api/demo/login", { method: "DELETE" });
          } catch {}
        });
      } catch {
        // Clerk not available — keep demo/fallback values
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { name: info.name, email: info.email, signOut: signOutFn };
}
