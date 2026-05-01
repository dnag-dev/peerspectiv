import { NextResponse, type NextRequest } from 'next/server';

/**
 * Host-based routing for peerspectiv.ai.
 *
 *   peerspectiv.ai          → 308 to https://www.peerspectiv.ai (apex → www)
 *   www.peerspectiv.ai      → /site/* (marketing)
 *   app.peerspectiv.ai      → existing app pass-through (gate, demo, Clerk)
 *
 * Local dev (lvh.me resolves any subdomain to 127.0.0.1):
 *   peerspectiv.lvh.me      → 307 to http://www.peerspectiv.lvh.me
 *   www.peerspectiv.lvh.me  → /site/*
 *   app.peerspectiv.lvh.me  → app
 *   localhost               → app (legacy fallback)
 *
 * Safety net: apex/www requests whose first path segment is a known app
 * segment are 308'd to app.peerspectiv.ai with the same path. Protects
 * old bookmarks during the cutover.
 */

// Discovered from `ls app/(dashboard) app/(client) app/(auth) app/gate`.
// Anything under one of these segments is the running app; everything else
// is treated as marketing on www/apex.
const APP_PATHS = new Set<string>([
  // app/(auth)
  'login',
  // app/gate
  'gate',
  // app/(client)
  'portal',
  // app/(dashboard)
  'assign',
  'batches',
  'cases',
  'command',
  'companies',
  'dashboard',
  'forms',
  'invoices',
  'payouts',
  'prospects',
  'reports',
  'reviewer',
  'reviewers',
  'settings',
  'tags',
  // Public reviewer onboarding form (no auth required)
  'onboard',
  'credentialing',
]);

const APEX_HOSTS = new Set([
  'peerspectiv.ai',
  'peerspectiv.lvh.me',
]);

const MARKETING_HOSTS = new Set([
  'www.peerspectiv.ai',
  'www.peerspectiv.lvh.me',
]);

const APP_HOSTS = new Set([
  'app.peerspectiv.ai',
  'app.peerspectiv.lvh.me',
  'localhost',
]);

// API endpoints that work on every host (marketing + app).
const PASS_THROUGH_API_PATHS = [
  '/api/leads',
  '/api/cron',
  '/api/health',
  '/api/webhooks',
  '/api/onboard',
];

// ────────────────────────────────────────────────────────────────────────
// Existing app gate / Clerk env flags (preserved verbatim).
const isDemoMode =
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === 'pk_test_placeholder' ||
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === '';

const E2E_TEST_BYPASS = process.env.NEXT_PUBLIC_DEMO_MODE === '1';

const PUBLIC_PATHS = [
  /^\/login/,
  /^\/gate/,
  /^\/onboard/,
  /^\/api\/health/,
  /^\/api\/cron/,
  /^\/api\/demo/,
  /^\/api\/auth/,
  /^\/api\/onboard/,
];

const ROLE_LANDING: Record<string, string> = {
  admin: '/dashboard',
  client: '/portal',
  reviewer: '/reviewer/portal',
};

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((re) => re.test(pathname));
}

function readDemoUser(request: NextRequest): { role: string } | null {
  const raw = request.cookies.get('demo_user')?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ────────────────────────────────────────────────────────────────────────
// Helpers

function firstSegment(path: string): string {
  const cleaned = path.replace(/^\/+/, '');
  return cleaned.split('/')[0] ?? '';
}

function isPassThroughApi(path: string): boolean {
  return PASS_THROUGH_API_PATHS.some(
    (p) => path === p || path.startsWith(p + '/')
  );
}

function isStaticOrInternal(path: string): boolean {
  return (
    path.startsWith('/_next') ||
    path === '/favicon.ico' ||
    path === '/peerspectiv-logo.png'
  );
}

function appHostFor(hostname: string): { host: string; protocol: 'http:' | 'https:' } {
  const isLocal = hostname.includes('lvh.me') || hostname === 'localhost';
  return {
    host: isLocal ? 'app.peerspectiv.lvh.me:3000' : 'app.peerspectiv.ai',
    protocol: isLocal ? 'http:' : 'https:',
  };
}

function wwwHostFor(hostname: string): { host: string; protocol: 'http:' | 'https:' } {
  const isLocal = hostname.includes('lvh.me') || hostname === 'localhost';
  return {
    host: isLocal ? 'www.peerspectiv.lvh.me:3000' : 'www.peerspectiv.ai',
    protocol: isLocal ? 'http:' : 'https:',
  };
}

function redirectToHost(req: NextRequest, host: string, protocol: 'http:' | 'https:', status = 308) {
  const target = req.nextUrl.clone();
  target.host = host;
  target.protocol = protocol;
  // Preserve port behavior (host already includes :3000 if local)
  return NextResponse.redirect(target, status);
}

// ────────────────────────────────────────────────────────────────────────

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const rawHost = request.headers.get('host') ?? '';
  const hostname = rawHost.split(':')[0].toLowerCase();

  // Always let internals & static through (host-agnostic).
  if (isStaticOrInternal(pathname)) return NextResponse.next();

  // Marketing-host direct hits to /site/* are not allowed (would leak the
  // rewrite path). 404 the request.
  if (pathname.startsWith('/site') && !APP_HOSTS.has(hostname)) {
    // On apex/www: redirect to the equivalent path-without-/site.
    const stripped = pathname.replace(/^\/site/, '') || '/';
    const url = request.nextUrl.clone();
    url.pathname = stripped;
    return NextResponse.redirect(url);
  }

  // ─── Apex: redirect to www (or to app.* if path looks app-bound) ──────
  if (APEX_HOSTS.has(hostname)) {
    const seg = firstSegment(pathname);
    if (APP_PATHS.has(seg)) {
      const { host, protocol } = appHostFor(hostname);
      return redirectToHost(request, host, protocol, 308);
    }
    const { host, protocol } = wwwHostFor(hostname);
    return redirectToHost(request, host, protocol, 308);
  }

  // ─── www: rewrite to /site/* unless path is app-bound ────────────────
  if (MARKETING_HOSTS.has(hostname)) {
    // Pass-through API (leads, cron, health, webhooks) work everywhere.
    if (isPassThroughApi(pathname)) return NextResponse.next();

    // Other /api/* on www: redirect to app host
    if (pathname.startsWith('/api/')) {
      const { host, protocol } = appHostFor(hostname);
      return redirectToHost(request, host, protocol, 308);
    }

    const seg = firstSegment(pathname);
    if (APP_PATHS.has(seg)) {
      const { host, protocol } = appHostFor(hostname);
      return redirectToHost(request, host, protocol, 308);
    }

    const url = request.nextUrl.clone();
    url.pathname = `/site${pathname === '/' ? '' : pathname}`;
    return NextResponse.rewrite(url);
  }

  // ─── App host (or unknown / preview / localhost): existing app logic ──
  // Block /site on app host — never serve marketing under app.
  if (pathname.startsWith('/site')) {
    return new NextResponse(null, { status: 404 });
  }

  // Vercel preview hosts (*.vercel.app): pass through to app behavior.
  // Existing site_gate (pre-login password wall).
  const isGateExempt =
    pathname === '/gate' ||
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/api/webhooks') ||
    pathname.startsWith('/api/cron') ||
    pathname.startsWith('/api/leads') ||
    pathname.startsWith('/api/onboard') ||
    pathname.startsWith('/onboard') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname === '/peerspectiv-logo.png';
  if (!isGateExempt && !request.cookies.get('site_gate')) {
    return NextResponse.redirect(new URL('/gate', request.url));
  }

  // Demo / E2E bypass mode: gate by demo_user cookie
  if (isDemoMode || E2E_TEST_BYPASS) {
    if (isPublic(pathname)) return NextResponse.next();

    const demo = readDemoUser(request);
    if (!demo) {
      const url = new URL('/login', request.url);
      return NextResponse.redirect(url);
    }

    if (demo.role === 'client' && !pathname.startsWith('/portal') && !pathname.startsWith('/api/')) {
      return NextResponse.redirect(new URL('/portal', request.url));
    }
    if (demo.role === 'reviewer' && !pathname.startsWith('/reviewer') && !pathname.startsWith('/api/')) {
      return NextResponse.redirect(new URL('/reviewer/portal', request.url));
    }

    return NextResponse.next();
  }

  // Production mode: use Clerk
  try {
    const { clerkMiddleware, createRouteMatcher } = await import('@clerk/nextjs/server');
    const isPublicRoute = createRouteMatcher([
      '/login(.*)',
      '/api/health',
      '/api/cron(.*)',
      '/api/demo(.*)',
    ]);

    const isProtectedRoute = createRouteMatcher([
      '/dashboard(.*)',
      '/companies(.*)',
      '/batches(.*)',
      '/assign(.*)',
      '/reviewer(.*)',
      '/reports(.*)',
      '/command(.*)',
      '/portal(.*)',
    ]);

    return clerkMiddleware((auth, req) => {
      if (!isPublicRoute(req) && isProtectedRoute(req)) {
        auth().protect();
      }
    })(request, {} as any);
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)', '/(api|trpc)(.*)'],
};

export { ROLE_LANDING };
