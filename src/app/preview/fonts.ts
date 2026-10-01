import {
  Bricolage_Grotesque,
  Hanken_Grotesk,
  JetBrains_Mono,
} from "next/font/google";

// next/font downloads these at build time and serves them from this site,
// so the strict Content-Security-Policy (font-src 'self') keeps working —
// no request goes to Google when a visitor loads the page.

export const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "800"],
  display: "swap",
  variable: "--pf-font-display",
});

export const body = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--pf-font-body",
});

export const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--pf-font-mono",
});

/** Class names that define the three font CSS variables on an element. */
export const fontVars = `${display.variable} ${body.variable} ${mono.variable}`;
