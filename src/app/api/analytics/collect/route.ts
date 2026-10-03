import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getClientIp } from "@/lib/client-ip";
import { apiLimiter, withRateLimit } from "@/lib/rate-limit";
import {
  countryOf,
  deviceOf,
  isBot,
  isCountedPath,
  normalizePath,
  referrerHost,
  timing,
  visitorHash,
} from "@/lib/analytics";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  path: z.string().max(400),
  referrer: z.string().max(500).optional(),
  load: z.number().optional(),
  lcp: z.number().optional(),
  ttfb: z.number().optional(),
});

/**
 * Counts one page view. Public (browsers call it), so it quietly ignores anything that
 * should not be counted and always answers 204: the page must never wait on, or break
 * because of, analytics.
 */
export const POST = withRateLimit(
  apiLimiter,
  "analytics",
  async (request: NextRequest) => {
    try {
      const userAgent = request.headers.get("user-agent");
      // Not people: crawlers, link previews, uptime checks. Not me: the signed-in admin.
      if (isBot(userAgent) || request.cookies.has("auth-token")) {
        return new NextResponse(null, { status: 204 });
      }

      const parsed = bodySchema.safeParse(
        await request.json().catch(() => null),
      );
      if (!parsed.success) return new NextResponse(null, { status: 204 });
      const { path: rawPath, referrer, load, lcp, ttfb } = parsed.data;

      const path = normalizePath(rawPath);
      if (!path || !isCountedPath(path))
        return new NextResponse(null, { status: 204 });

      const ua = userAgent as string;
      const secret = process.env.JWT_SECRET || "analytics-dev-secret";
      await db.pageView.create({
        data: {
          path,
          referrer: referrerHost(referrer, request.headers.get("host") ?? ""),
          country: countryOf(request.headers.get("cf-ipcountry")),
          device: deviceOf(ua),
          visitor: visitorHash(
            getClientIp(request.headers),
            ua,
            secret,
            new Date().toISOString().slice(0, 10),
          ),
          loadMs: timing(load),
          lcpMs: timing(lcp),
          ttfbMs: timing(ttfb),
        },
      });
    } catch (error) {
      console.error("Analytics: could not record a view:", error);
    }
    return new NextResponse(null, { status: 204 });
  },
);
