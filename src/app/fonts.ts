import localFont from "next/font/local";

// The fonts are files in this repository (src/app/fonts, latin subset, SIL Open Font
// Licence, see the LICENSE-*.txt files there). They used to be downloaded from Google
// while the image was built, and that download failed now and then, which failed the
// build. Now the build needs no network, and no request goes to Google when a visitor
// loads the page, so the strict Content-Security-Policy (font-src 'self') keeps working.

// Variable font with the optical-size axis: large headings automatically get
// the tighter display cut the design was drawn with (static weights don't).
export const display = localFont({
  src: "./fonts/bricolage-grotesque-latin-opsz-normal.woff2",
  weight: "200 800",
  style: "normal",
  display: "swap",
  variable: "--pf-font-display",
});

export const body = localFont({
  src: [
    {
      path: "./fonts/hanken-grotesk-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/hanken-grotesk-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/hanken-grotesk-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--pf-font-body",
});

export const mono = localFont({
  src: [
    {
      path: "./fonts/jetbrains-mono-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/jetbrains-mono-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--pf-font-mono",
});

// Used by the admin screens and shared layout.
export const inter = localFont({
  src: "./fonts/inter-latin-wght-normal.woff2",
  weight: "100 900",
  style: "normal",
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
  adjustFontFallback: "Arial",
  preload: true,
  variable: "--font-inter",
});

/** Class names that define the three font CSS variables on an element. */
export const fontVars = `${display.variable} ${body.variable} ${mono.variable}`;
