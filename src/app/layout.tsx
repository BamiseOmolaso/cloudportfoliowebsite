// Prevent build-time execution issues
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import CookieConsent from "@/components/CookieConsent";

// Optimized font loading with fallbacks
const inter = Inter({
  subsets: ["latin"],
  display: "swap", // Prevents invisible text during font load
  fallback: [
    "system-ui",
    "-apple-system",
    "BlinkMacSystemFont",
    "Segoe UI",
    "Roboto",
    "Arial",
    "sans-serif",
  ],
  adjustFontFallback: true,
  preload: true,
  variable: "--font-inter", // CSS variable for better performance
});

export const metadata: Metadata = {
  title: "Bamise Omolaso - Full Stack Developer & Cloud Engineer",
  description:
    "Personal portfolio website of Bamise Omolaso, showcasing projects, blog posts, and professional experience.",
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
        className={`${inter.variable} ${inter.className} bg-gray-950 text-white`}
      >
        <ErrorBoundary>
          <Navbar />
          <main className="min-h-screen pt-16">{children}</main>
          <Footer />
          <CookieConsent />
        </ErrorBoundary>
      </body>
    </html>
  );
}
