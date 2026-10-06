// Prevent build-time execution issues
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import "./globals.css";
import "./portfolio.css";
import { fontVars, inter } from "./fonts";
import SiteChrome from "@/components/layout/SiteChrome";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import CookieConsent from "@/components/CookieConsent";
import PageViewTracker from "@/components/PageViewTracker";

const TITLE = "Dr. Bamise Omolaso — Cloud & DevSecOps Engineer";
const DESCRIPTION =
  "Medical doctor turned cloud & DevSecOps engineer. Secure, repeatable infrastructure with Terraform and CI/CD, documented in public. Projects, write-ups and the architecture behind this portfolio.";

// Absolute URLs for Open Graph/Twitter cards are built from this base.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://portfolio.oluwabamiseomolaso.com.ng";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  // No site-wide canonical here: a layout value is inherited by EVERY page, so each
  // page would call the home page its canonical address (and search engines would
  // treat the blog, projects and so on as copies of it). Pages set their own.
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Dr. Bamise Omolaso",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  icons: {
    icon: [
      {
        url: "/favicon.svg",
        type: "image/svg+xml",
      },
      {
        url: "/favicon.ico",
        sizes: "any",
      },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#1F2937" />
      </head>
      <body
        className={`${inter.variable} ${fontVars} font-sans bg-gray-950 text-white`}
      >
        <ErrorBoundary>
          <SiteChrome fontClass={fontVars}>{children}</SiteChrome>
          <CookieConsent />
          <PageViewTracker />
        </ErrorBoundary>
      </body>
    </html>
  );
}
