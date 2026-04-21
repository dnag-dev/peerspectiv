import { NextResponse, type NextRequest } from 'next/server';

const isDemoMode = !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === 'pk_test_placeholder' ||
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === '';

const E2E_TEST_BYPASS = process.env.E2E_AUTH_BYPASS === '1';

const PUBLIC_PATHS = [
  /^\/login/,
  /^\/api\/health/,
  /^\/api\/cron/,
  /^\/api\/demo/,
  /^\/api\/auth/,
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

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Demo / E2E bypass mode: gate by demo_user cookie
  if (isDemoMode || E2E_TEST_BYPASS) {
    if (isPublic(pathname)) return NextResponse.next();

    const demo = readDemoUser(request);
    if (!demo) {
      // Not logged in (no demo cookie) — bounce to login
      const url = new URL('/login', request.url);
      return NextResponse.redirect(url);
    }

    // Role-based access guard (still permissive: admin can see everything)
    // — admin: anywhere
    // — client: only /portal
    // — reviewer: only /reviewer
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
