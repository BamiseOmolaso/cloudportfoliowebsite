"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Tells the site's own analytics that a page was viewed. No cookie, no stored address.
 * The first view also carries how fast the page loaded; later in-app navigations are
 * just counted. `sendBeacon` never delays or breaks the page.
 */
export default function PageViewTracker() {
  const pathname = usePathname();
  // The last page counted, so the same page is never counted twice (React runs effects twice in development).
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (
      !pathname ||
      pathname.startsWith("/admin") ||
      lastPath.current === pathname
    )
      return;
    // A "do not track" browser is respected.
    if (navigator.doNotTrack === "1") return;

    const send = (extra: Record<string, number | undefined> = {}) => {
      const body = JSON.stringify({
        path: pathname,
        referrer: document.referrer || undefined,
        ...extra,
      });
      navigator.sendBeacon?.(
        "/api/analytics/collect",
        new Blob([body], { type: "application/json" }),
      );
    };

    const isFirstPage = lastPath.current === null;
    lastPath.current = pathname;
    if (!isFirstPage) {
      send();
      return;
    }

    let lcp: number | undefined;
    let observer: PerformanceObserver | undefined;
    try {
      observer = new PerformanceObserver((list) => {
        const last = list.getEntries().at(-1);
        if (last) lcp = last.startTime;
      });
      observer.observe({ type: "largest-contentful-paint", buffered: true });
    } catch {
      /* older browsers: the view is still counted, without the LCP */
    }

    // Wait until the page has finished loading, then a moment more for the final LCP.
    const report = () => {
      window.setTimeout(() => {
        const nav = performance.getEntriesByType("navigation")[0] as
          | PerformanceNavigationTiming
          | undefined;
        observer?.disconnect();
        send({ load: nav?.loadEventEnd, ttfb: nav?.responseStart, lcp });
      }, 1500);
    };
    if (document.readyState === "complete") report();
    else window.addEventListener("load", report, { once: true });
    return () => window.removeEventListener("load", report);
  }, [pathname]);

  return null;
}
