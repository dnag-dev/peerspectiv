import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

// Practitioner type stack — Fraunces (display, editorial italic), Geist (sans),
// Geist Mono (numerics, IDs). Geist ships its own next/font integration via
// the `geist` package; Fraunces comes from Google Fonts.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  axes: ["SOFT", "opsz"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Peerspectiv — AI-Powered Medical Peer Review",
  description:
    "Peerspectiv streamlines medical peer review with AI-driven analysis, batch processing, and comprehensive reporting.",
};

const isDemoMode = !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === 'pk_test_placeholder' ||
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === '';

const fontVars = `${fraunces.variable} ${GeistSans.variable} ${GeistMono.variable}`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (!isDemoMode) {
    const { ClerkProvider } = await import('@clerk/nextjs');
    return (
      <html lang="en" className={fontVars}>
        <body className="font-sans antialiased bg-paper text-ink-900">
          <ClerkProvider>
            {children}
            <Toaster />
          </ClerkProvider>
        </body>
      </html>
    );
  }

  return (
    <html lang="en" className={fontVars}>
      <body className="font-sans antialiased bg-paper text-ink-900">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
