"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PortfolioShell from "@/components/portfolio/PortfolioShell";
import SiteFooter from "@/components/portfolio/SiteFooter";

// These pages bring their own header, footer and full-bleed layout, so nothing
// may wrap them. "/" matches the home page only: the startsWith check below
// adds a trailing slash, so "//" matches nothing.
const BARE_ROUTES = ["/", "/architecture", "/about"];

// The admin tool keeps the plain header and footer: it is a working screen,
// not part of the public look.
const LEGACY_ROUTES = ["/admin", "/login"];

const matches = (routes: string[], pathname: string) =>
  routes.some((r) => pathname === r || pathname.startsWith(`${r}/`));

export default function SiteChrome({
  children,
  fontClass,
}: {
  children: React.ReactNode;
  /** Font CSS-variable classes for the new header and footer (app/fonts.ts). */
  fontClass: string;
}) {
  const pathname = usePathname() ?? "";

  if (matches(BARE_ROUTES, pathname)) return <main>{children}</main>;

  if (matches(LEGACY_ROUTES, pathname)) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-16">{children}</main>
        <Footer />
      </>
    );
  }

  // Public pages (blog, projects, about, contact, ...): the new header and
  // footer around the page's existing content, which keeps its own styling.
  return (
    <>
      <PortfolioShell className={fontClass} variant="bar" />
      <main id="main" className="min-h-screen pt-16">
        {children}
      </main>
      <div className={`pf pf-end ${fontClass}`}>
        <div className="wrap">
          <SiteFooter />
        </div>
      </div>
    </>
  );
}
