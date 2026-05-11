import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { withRateLimit, apiLimiter } from "@/lib/rate-limit";
import { lcpMetricSchema } from "@/lib/validation-schemas";

export const dynamic = "force-dynamic";

export const POST = withRateLimit(
  apiLimiter,
  "performance-lcp",
  async (request: NextRequest) => {
    try {
      const body = await request.json();
      const { value, url } = lcpMetricSchema.parse(body);

      const referer =
        request.headers.get("referer") || request.headers.get("referrer");
      const resolvedUrl = url || referer || "unknown";

      await db.lcpMetric.create({
        data: {
          url: resolvedUrl.slice(0, 2048),
          value,
          timestamp: new Date(),
        },
      });

      return NextResponse.json({ success: true });
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Validation failed", details: err.errors },
          { status: 400 },
        );
      }
      console.error("Error processing LCP metric:", err);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
);
