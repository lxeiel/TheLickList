import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono, Homemade_Apple } from "next/font/google";
import InlineScript from "@/app/_components/InlineScript";
import SiteNav, { SiteNavFallback } from "@/app/_components/SiteNav";
import { themeScript } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// The handwritten "by lex" signature in the logo.
const signature = Homemade_Apple({
  variable: "--font-signature",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "The Lick List", template: "%s · The Lick List" },
  description: "Lex's Nomz Adventure",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The inline theme script sets data-theme before React hydrates, so the
    // attribute legitimately differs from the server render.
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${signature.variable}`} suppressHydrationWarning>
      <head>
        <InlineScript html={themeScript} />
      </head>
      <body>
        <a href="#content" className="skip-link">
          Skip to content
        </a>
        {/* useSearchParams in SiteNav needs a Suspense boundary. */}
        <Suspense fallback={<SiteNavFallback />}>
          <SiteNav />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
