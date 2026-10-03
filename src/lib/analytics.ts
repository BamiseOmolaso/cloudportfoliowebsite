import { createHmac } from "node:crypto";

/**
 * Helpers for the site's own page-view counting. It stores no IP address and sets no
 * cookie: that is why it needs no consent banner. A "visitor" is a daily hash, so the
 * same person is one visitor within a day and a stranger again the next day.
 */

const BOT =
  /bot|crawl|spider|slurp|preview|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python-requests|httpclient|go-http|axios|node-fetch|facebookexternalhit|embedly|whatsapp|telegram/i;

export const isBot = (userAgent: string | null | undefined): boolean =>
  !userAgent || BOT.test(userAgent);

export type Device = "mobile" | "tablet" | "desktop";

export function deviceOf(userAgent: string): Device {
  if (/iPad|Tablet|PlayBook|Silk/i.test(userAgent)) return "tablet";
  if (/Mobi|iPhone|iPod|Android/i.test(userAgent)) return "mobile";
  return "desktop";
}

/** The address of a page without its query string, fragment or trailing slash. */
export function normalizePath(raw: string): string | null {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//"))
    return null;
  const path = raw.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return path.length <= 200 ? path : null;
}

/** Pages that are not the public site: the admin panel and the API are never counted. */
export const isCountedPath = (path: string): boolean =>
  !/^\/(admin|api|login|_next)(\/|$)/.test(path);

/** Where a visitor came from: just the site's name, and nothing for our own pages. */
export function referrerHost(
  referrer: string | null | undefined,
  ownHost: string,
): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    const own = ownHost.replace(/:\d+$/, "").replace(/^www\./, "");
    return host && host !== own ? host.slice(0, 100) : null;
  } catch {
    return null;
  }
}

/** Cloudflare adds the visitor's country as a two-letter code ("XX" and "T1" mean unknown / Tor). */
export function countryOf(header: string | null | undefined): string | null {
  const c = header?.trim().toUpperCase();
  return c && /^[A-Z]{2}$/.test(c) && c !== "XX" && c !== "T1" ? c : null;
}

/** A timing in milliseconds, or null if it is missing or nonsense. */
export function timing(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 120_000
    ? Math.round(value)
    : null;
}

/** A hash that is the same for one browser on one day, and cannot be turned back into the address. */
export function visitorHash(
  ip: string | null,
  userAgent: string,
  secret: string,
  day: string,
): string {
  return createHmac("sha256", secret)
    .update(`${day}|${ip ?? ""}|${userAgent}`)
    .digest("hex")
    .slice(0, 32);
}
