import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: { default: "The Lick List", template: "%s · The Lick List" },
  description: "Lex's Nomz Adventure",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The inline theme script sets data-theme before React hydrates, so the
    // attribute legitimately differs from the server render.
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
