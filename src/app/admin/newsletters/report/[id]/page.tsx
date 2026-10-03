"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { StatBoxes, type Stats } from "@/components/admin/DeliveryStats";
import {
  Card,
  EmptyState,
  ErrorBanner,
  PageHeader,
  StatusBadge,
  button,
  inputClass,
} from "@/components/admin/ui";

interface Row {
  id: string;
  email: string;
  name: string | null;
  state: "failed" | "bounced" | "opened" | "delivered" | "waiting";
  reason: string | null;
  complained: boolean;
  sent_at: string;
  delivered_at: string | null;
  opened_at: string | null;
}
interface Report {
  id: string;
  subject: string;
  status: string;
  sent_at: string | null;
  stats: Stats;
  recipients: Row[];
}

const FILTERS = [
  { id: "all", label: "Everyone" },
  { id: "delivered", label: "Delivered" },
  { id: "opened", label: "Opened" },
  { id: "notOpened", label: "Not opened" },
  { id: "bounced", label: "Bounced" },
  { id: "failed", label: "Failed" },
  { id: "waiting", label: "Waiting" },
] as const;
type FilterId = (typeof FILTERS)[number]["id"];

const matches = (r: Row, f: FilterId) =>
  f === "all" ||
  (f === "delivered" && (r.state === "delivered" || r.state === "opened")) ||
  (f === "opened" && r.state === "opened") ||
  (f === "notOpened" && r.state === "delivered") ||
  r.state === f;

const LABEL: Record<Row["state"], { text: string; tone: string }> = {
  opened: { text: "Opened", tone: "published" },
  delivered: { text: "Delivered", tone: "published" },
  waiting: { text: "Waiting", tone: "scheduled" },
  bounced: { text: "Bounced", tone: "draft" },
  failed: { text: "Failed", tone: "draft" },
};

export default function NewsletterReportPage() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterId>("all");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/newsletters/${id}/report`);
      if (!res.ok) throw new Error("Could not load the report");
      setReport(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the report");
    }
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (report?.recipients ?? []).filter(
      (r) =>
        matches(r, filter) &&
        (!q ||
          r.email.toLowerCase().includes(q) ||
          (r.name ?? "").toLowerCase().includes(q)),
    );
  }, [report, filter, query]);

  const count = (f: FilterId) =>
    (report?.recipients ?? []).filter((r) => matches(r, f)).length;

  return (
    <>
      <PageHeader
        title="Delivery report"
        subtitle={report ? `“${report.subject}”` : undefined}
        actions={
          <>
            <button
              type="button"
              className={button("secondary")}
              onClick={load}
            >
              Refresh
            </button>
            <Link href="/admin/newsletters" className={button("ghost")}>
              ← All newsletters
            </Link>
          </>
        }
      />
      {error && <ErrorBanner message={error} onRetry={load} />}
      {!report && !error && (
        <div
          className="h-64 animate-pulse rounded-xl bg-gray-900"
          aria-busy="true"
        />
      )}

      {report && (
        <>
          <StatBoxes stats={report.stats} />
          <p className="mt-3 text-xs text-gray-500">
            “Delivered” and “Opened” come from Resend and can arrive a few
            minutes after sending. “Opened” is an estimate: mail apps that block
            pictures hide real reads, and some load them automatically.
            {report.stats.complained > 0 &&
              ` ${report.stats.complained} marked it as spam and were unsubscribed.`}
          </p>

          <Card className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 p-3">
              <div
                role="tablist"
                aria-label="Filter by result"
                className="flex flex-wrap gap-1"
              >
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    role="tab"
                    aria-selected={filter === f.id}
                    onClick={() => setFilter(f.id)}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      filter === f.id
                        ? "bg-purple-500/15 text-white"
                        : "text-gray-400 hover:bg-gray-800 hover:text-white"
                    }`}
                  >
                    {f.label}
                    <span className="ml-1.5 text-xs text-gray-500">
                      {count(f.id)}
                    </span>
                  </button>
                ))}
              </div>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by email or name"
                aria-label="Search recipients"
                className={`${inputClass} sm:max-w-xs`}
              />
            </div>
            {shown.length === 0 ? (
              <EmptyState
                title={
                  report.recipients.length === 0
                    ? "Nothing sent yet"
                    : "No one matches"
                }
                body={
                  report.recipients.length === 0
                    ? "Send this newsletter and the results appear here."
                    : "Try another filter."
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[40rem] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wider text-gray-500">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Email
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Result
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Sent
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Opened
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {shown.map((r) => (
                      <tr key={r.id}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-white">{r.email}</p>
                          {r.name && (
                            <p className="text-xs text-gray-500">{r.name}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            status={LABEL[r.state].tone}
                            label={LABEL[r.state].text}
                          />
                          {r.complained && (
                            <span className="ml-1.5 text-xs text-red-300">
                              spam report
                            </span>
                          )}
                          {r.reason && (
                            <p className="mt-1 max-w-xs text-xs text-gray-500">
                              {r.reason}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-300">
                          {format(new Date(r.sent_at), "d MMM, HH:mm")}
                        </td>
                        <td className="px-4 py-3 text-gray-300">
                          {r.opened_at
                            ? format(new Date(r.opened_at), "d MMM, HH:mm")
                            : "–"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </>
  );
}
