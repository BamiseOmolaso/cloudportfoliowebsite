/**
 * The visitor's IP address, for rate limiting and audit logs.
 *
 * In production every request arrives through Cloudflare, which sets
 * `CF-Connecting-IP` to the real visitor address and overwrites any value the
 * visitor sent. That header is therefore the one to trust. It is only safe
 * because the server's firewall accepts web traffic from Cloudflare alone
 * (infra/terraform), so nobody can reach the app directly and forge it.
 *
 * `X-Forwarded-For` is NOT used first: Cloudflare appends to it, so a visitor
 * can put a fake address at the front. It is only a fallback for running the
 * app without Cloudflare (local development).
 */
export function getClientIp(headers: Pick<Headers, "get">): string | null {
  const cf = headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;

  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;

  return null;
}
