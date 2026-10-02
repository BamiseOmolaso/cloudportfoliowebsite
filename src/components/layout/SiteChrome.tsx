"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

// Routes that bring their own header, footer and full-bleed layout, so the
// shared top bar, footer and `pt-16` spacing must not wrap them. "/" matches the home page only: the
// startsWith check below adds a trailing slash, so "//" matches nothing.
const BARE_ROUTES = ["/"];

export default function SiteChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const bare = BARE_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (bare) return <main>{children}</main>;

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16">{children}</main>
      <Footer />
    </>
  );
}
