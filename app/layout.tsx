import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "Peerspectiv — AI-Powered Medical Peer Review",
  description:
    "Peerspectiv streamlines medical peer review with AI-driven analysis, batch processing, and comprehensive reporting.",
};

const isDemoMode = !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === 'pk_test_placeholder' ||
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === '';

const fontVars = `${GeistSans.variable} ${GeistMono.variable}`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (!isDemoMode) {
    const { ClerkProvider } = await import('@clerk/nextjs');
    return (
      <html lang="en" className={fontVars}>
        <body className="font-sans antialiased bg-paper-canvas text-ink-900">
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
      <body className="font-sans antialiased bg-paper-canvas text-ink-900">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
