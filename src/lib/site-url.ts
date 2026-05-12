/**
 * Resolve the publicly-reachable base URL for outbound emails (unsubscribe,
 * preferences, and other absolute links).
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_SITE_URL
 *   2. NEXT_PUBLIC_BASE_URL
 *   3. http://localhost:3000  (only when NODE_ENV !== 'production')
 *
 * In production we refuse to fall back to localhost — silently shipping
 * unsubscribe links pointing at localhost:3000 has happened before and is
 * always a bug. Forcing a startup-time error means the operator notices
 * before subscribers do.
 */
export function getSiteUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL;

  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL (or NEXT_PUBLIC_BASE_URL) must be set in production — without it, outbound emails would contain http://localhost:3000 links.",
    );
  }

  return "http://localhost:3000";
}
