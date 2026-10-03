import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { secureAdminRoute, handleError } from "@/lib/api-security";

export const dynamic = "force-dynamic";

const RANGES = [7, 30, 90] as const;

const num = (v: unknown) => Number(v ?? 0);

/** Page views, visitors and speed for the last 7, 30 or 90 days. */
export const GET = secureAdminRoute(async (request: NextRequest) => {
  try {
    const asked = Number(new URL(request.url).searchParams.get("days"));
    const days = (RANGES as readonly number[]).includes(asked) ? asked : 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [totals, daily, pages, referrers, countries, devices] =
      await Promise.all([
        db.$queryRaw<
          {
            views: bigint;
            visitors: bigint;
            load: number | null;
            lcp: number | null;
            ttfb: number | null;
          }[]
        >`
        SELECT count(*) AS views,
               count(DISTINCT visitor || created_at::date::text) AS visitors,
               percentile_cont(0.5) WITHIN GROUP (ORDER BY load_ms) AS load,
               percentile_cont(0.75) WITHIN GROUP (ORDER BY lcp_ms) AS lcp,
               percentile_cont(0.5) WITHIN GROUP (ORDER BY ttfb_ms) AS ttfb
        FROM page_views WHERE created_at >= ${since}`,
        db.$queryRaw<{ day: Date; views: bigint; visitors: bigint }[]>`
        SELECT date_trunc('day', created_at AT TIME ZONE 'UTC') AS day,
               count(*) AS views, count(DISTINCT visitor) AS visitors
        FROM page_views WHERE created_at >= ${since} GROUP BY 1 ORDER BY 1`,
        db.$queryRaw<
          {
            path: string;
            views: bigint;
            visitors: bigint;
            load: number | null;
            lcp: number | null;
          }[]
        >`
        SELECT path, count(*) AS views, count(DISTINCT visitor) AS visitors,
               percentile_cont(0.5) WITHIN GROUP (ORDER BY load_ms) AS load,
               percentile_cont(0.75) WITHIN GROUP (ORDER BY lcp_ms) AS lcp
        FROM page_views WHERE created_at >= ${since} GROUP BY path ORDER BY views DESC LIMIT 15`,
        db.$queryRaw<{ name: string; views: bigint }[]>`
        SELECT referrer AS name, count(*) AS views FROM page_views
        WHERE created_at >= ${since} AND referrer IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
        db.$queryRaw<{ name: string; views: bigint }[]>`
        SELECT country AS name, count(*) AS views FROM page_views
        WHERE created_at >= ${since} AND country IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
        db.$queryRaw<{ name: string; views: bigint }[]>`
        SELECT device AS name, count(*) AS views FROM page_views
        WHERE created_at >= ${since} GROUP BY 1 ORDER BY 2 DESC`,
      ]);

    // One entry per day, including days with no visits, so the chart has no gaps.
    const byDay = new Map(
      daily.map((d) => [d.day.toISOString().slice(0, 10), d]),
    );
    const series = Array.from({ length: days }, (_, i) => {
      const date = new Date(since.getTime() + (i + 1) * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const row = byDay.get(date);
      return { date, views: num(row?.views), visitors: num(row?.visitors) };
    });

    const t = totals[0];
    return NextResponse.json({
      days,
      totals: {
        views: num(t?.views),
        visitors: num(t?.visitors),
        load_ms: t?.load == null ? null : Math.round(t.load),
        lcp_ms: t?.lcp == null ? null : Math.round(t.lcp),
        ttfb_ms: t?.ttfb == null ? null : Math.round(t.ttfb),
      },
      series,
      pages: pages.map((p) => ({
        path: p.path,
        views: num(p.views),
        visitors: num(p.visitors),
        load_ms: p.load == null ? null : Math.round(p.load),
        lcp_ms: p.lcp == null ? null : Math.round(p.lcp),
      })),
      referrers: referrers.map((r) => ({ name: r.name, views: num(r.views) })),
      countries: countries.map((r) => ({ name: r.name, views: num(r.views) })),
      devices: devices.map((r) => ({ name: r.name, views: num(r.views) })),
    });
  } catch (error) {
    return handleError(error, "Failed to load analytics");
  }
});
