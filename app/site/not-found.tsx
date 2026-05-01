import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-cobalt-700">404</p>
      <h1 className="mt-3 text-4xl font-bold text-ink-900">Page not found</h1>
      <p className="mt-3 text-sm text-ink-600">
        That page didn&apos;t make it through peer review.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center rounded-md bg-cobalt-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-cobalt-700"
      >
        Back to home
      </Link>
    </div>
  );
}
