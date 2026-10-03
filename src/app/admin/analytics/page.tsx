"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Card,
  EmptyState,
  ErrorBanner,
  PageHeader,
  StatusBadge,
} from "@/components/admin/ui";

interface Data {
  days: number;
  totals: {
    views: number;
    visitors: number;
    load_ms: number | null;
    lcp_ms: number | null;
    ttfb_ms: number | null;
  };
  series: { date: string; views: number; visitors: number }[];
  pages: {
    path: string;
    views: number;
    visitors: number;
    load_ms: number | null;
    lcp_ms: number | null;
  }[];
  referrers: { name: string; views: number }[];
  countries: { name: string; views: number }[];
  devices: { name: string; views: number }[];
}

const RANGES = [7, 30, 90] as const;

const secs = (ms: number | null) =>
  ms == null ? "–" : `${(ms / 1000).toFixed(ms < 10000 ? 2 : 1)} s`;

/** Google's thresholds for the largest-paint time: good up to 2.5 s, poor over 4 s. */
function lcpVerdict(ms: number | null) {
  if (ms == null) return null;
  if (ms <= 2500) return { status: "published", label: "Good" };
  if (ms <= 4000) return { status: "scheduled", label: "Needs work" };
  return { status: "draft", label: "Slow" };
}

const countryName = (code: string) => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
};

function Tile({
  label,
  value,
  note,
  badge,
}: {
  label: string;
  value: string;
  note: string;
  badge?: { status: string; label: string } | null;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-gray-400">{label}</p>
        {badge && <StatusBadge status={badge.status} label={badge.label} />}
      </div>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{note}</p>
    </Card>
  );
}

/** Daily page views as bars, with the day's visitors drawn over them. */
function Chart({ series }: { series: Data["series"] }) {
  const max = Math.max(1, ...series.map((d) => d.views));
  const width = 100 / series.length;
  return (
    <figure>
      <svg
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        className="h-48 w-full"
        role="img"
        aria-label={`Page views and visitors per day over the last ${series.length} days`}
      >
        {series.map((d, i) => (
          <g key={d.date}>
            <rect
              x={i * width + width * 0.12}
              width={width * 0.76}
              y={40 - (d.views / max) * 38}
              height={(d.views / max) * 38}
              className="fill-purple-500/40"
            >
              <title>{`${format(new Date(d.date), "d MMM")}: ${d.views} views, ${d.visitors} visitors`}</title>
            </rect>
            <rect
              x={i * width + width * 0.12}
              width={width * 0.76}
              y={40 - (d.visitors / max) * 38}
              height={(d.visitors / max) * 38}
              className="fill-purple-400"
            />
          </g>
        ))}
      </svg>
      <figcaption className="mt-2 flex justify-between text-xs text-gray-500">
        <span>{format(new Date(series[0].date), "d MMM")}</span>
        <span className="flex gap-4">
          <span>
            <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-purple-500/40" />
            Page views
          </span>
          <span>
            <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-purple-400" />
            Visitors
          </span>
        </span>
        <span>{format(new Date(series[series.length - 1].date), "d MMM")}</span>
      </figcaption>
    </figure>
  );
}

function Breakdown({
  title,
  rows,
  label = (n: string) => n,
  empty,
}: {
  title: string;
  rows: { name: string; views: number }[];
  label?: (name: string) => string;
  empty: string;
}) {
  const total = rows.reduce((n, r) => n + r.views, 0);
  return (
    <Card className="p-5">
      <h2 className="mb-3 text-sm font-semibold text-white">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">{empty}</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.name} className="text-sm">
              <div className="flex justify-between gap-3">
                <span className="truncate text-gray-200">{label(r.name)}</span>
                <span className="text-gray-400">
                  {r.views} · {Math.round((r.views / total) * 100)}%
                </span>
              </div>
              <div className="mt-1 h-1 rounded-full bg-gray-800">
                <div
                  className="h-1 rounded-full bg-purple-500"
                  style={{ width: `${(r.views / total) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function AnalyticsPage() {
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/analytics?days=${days}`);
      if (!res.ok) throw new Error("Could not load the analytics");
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the analytics");
    }
  }, [days]);
  useEffect(() => {
    load();
  }, [load]);

  const empty = data && data.totals.views === 0;

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle="Who visits the site, which pages they read, and how fast it loads. Counted by the site itself: no cookies, and no addresses stored."
        actions={
          <div
            role="tablist"
            aria-label="Time range"
            className="flex gap-1 rounded-md border border-gray-800 p-1"
          >
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                role="tab"
                aria-selected={days === r}
                onClick={() => setDays(r)}
                className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                  days === r
                    ? "bg-purple-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {r} days
              </button>
            ))}
          </div>
        }
      />
      {error && <ErrorBanner message={error} onRetry={load} />}
      {!data && !error && (
        <div
          className="h-64 animate-pulse rounded-xl bg-gray-900"
          aria-busy="true"
        />
      )}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Tile
              label="Visitors"
              value={data.totals.visitors.toLocaleString()}
              note="a person counts once per day"
            />
            <Tile
              label="Page views"
              value={data.totals.views.toLocaleString()}
              note={
                data.totals.visitors
                  ? `${(data.totals.views / data.totals.visitors).toFixed(1)} per visitor`
                  : "pages opened"
              }
            />
            <Tile
              label="Main content shows after"
              value={secs(data.totals.lcp_ms)}
              note="LCP, slowest quarter of visits"
              badge={lcpVerdict(data.totals.lcp_ms)}
            />
            <Tile
              label="Fully loaded in"
              value={secs(data.totals.load_ms)}
              note={`typical visit · server replies in ${secs(data.totals.ttfb_ms)}`}
            />
          </div>

          {empty ? (
            <Card className="mt-6">
              <EmptyState
                title="No visits recorded yet"
                body="Visits to the public pages are counted from now on. Your own visits while signed in to the admin are never counted, and neither are crawlers."
              />
            </Card>
          ) : (
            <>
              <Card className="mt-6 p-5">
                <h2 className="mb-3 text-sm font-semibold text-white">
                  Visits per day
                </h2>
                <Chart series={data.series} />
              </Card>

              <Card className="mt-6">
                <h2 className="border-b border-gray-800 p-5 pb-3 text-sm font-semibold text-white">
                  Pages
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[36rem] text-left text-sm">
                    <thead className="text-xs uppercase tracking-wider text-gray-500">
                      <tr>
                        <th scope="col" className="px-5 py-3 font-medium">
                          Page
                        </th>
                        <th scope="col" className="px-5 py-3 font-medium">
                          Views
                        </th>
                        <th scope="col" className="px-5 py-3 font-medium">
                          Visitors
                        </th>
                        <th scope="col" className="px-5 py-3 font-medium">
                          Loads in
                        </th>
                        <th scope="col" className="px-5 py-3 font-medium">
                          Speed
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {data.pages.map((p) => {
                        const v = lcpVerdict(p.lcp_ms);
                        return (
                          <tr key={p.path}>
                            <td className="max-w-[18rem] truncate px-5 py-3 font-medium text-white">
                              {p.path}
                            </td>
                            <td className="px-5 py-3 text-gray-300">
                              {p.views}
                            </td>
                            <td className="px-5 py-3 text-gray-300">
                              {p.visitors}
                            </td>
                            <td className="px-5 py-3 text-gray-300">
                              {secs(p.load_ms)}
                            </td>
                            <td className="px-5 py-3">
                              {v ? (
                                <StatusBadge
                                  status={v.status}
                                  label={v.label}
                                />
                              ) : (
                                "–"
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <Breakdown
                  title="Where visitors come from"
                  rows={data.referrers}
                  empty="Most visits arrive directly, with no referring site."
                />
                <Breakdown
                  title="Countries"
                  rows={data.countries}
                  label={countryName}
                  empty="Not available until the site is behind Cloudflare."
                />
                <Breakdown
                  title="Devices"
                  rows={data.devices}
                  label={(n) => n.charAt(0).toUpperCase() + n.slice(1)}
                  empty="No visits yet."
                />
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
