import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { withRateLimit, apiLimiter } from "@/lib/rate-limit";
import { performanceMetricSchema } from "@/lib/validation-schemas";

export const dynamic = "force-dynamic";

export const POST = withRateLimit(
  apiLimiter,
  "performance",
  async (request: NextRequest) => {
    try {
      const body = await request.json();
      const validated = performanceMetricSchema.parse(body);

      const referer =
        request.headers.get("referer") ||
        request.headers.get("referrer") ||
        "unknown";
      const url = validated.url || referer.slice(0, 2048);

      await db.performanceMetric.create({
        data: {
          url,
          metrics: validated.metrics,
          timestamp: validated.timestamp
            ? new Date(validated.timestamp)
            : new Date(),
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
      console.error("Error processing performance metrics:", err);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
);
