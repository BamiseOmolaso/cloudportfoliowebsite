"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Download } from "lucide-react";
import {
  Card,
  EmptyState,
  ErrorBanner,
  PageHeader,
  StatusBadge,
  button,
  inputClass,
} from "@/components/admin/ui";

interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  is_subscribed: boolean;
  unsubscribe_reason: string | null;
  unsubscribe_feedback: string | null;
  created_at: string;
  location?: string | null;
}

type Filter = "all" | "subscribed" | "unsubscribed";

const REASONS: Record<string, string> = {
  too_many_emails: "Too many emails",
  not_relevant: "Content not relevant",
  not_interesting: "Content not interesting",
  other: "Other reason",
};

/** A spreadsheet treats a cell starting with = + - or @ as a formula, so defuse it. */
const csvCell = (value: string) => {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export default function SubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/subscribers");
      if (!res.ok) throw new Error("Could not load the subscribers");
      setSubscribers((await res.json()) ?? []);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load the subscribers",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const active = subscribers.filter((s) => s.is_subscribed).length;
    return {
      all: subscribers.length,
      subscribed: active,
      unsubscribed: subscribers.length - active,
    };
  }, [subscribers]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return subscribers.filter(
      (s) =>
        (filter === "all" || (filter === "subscribed") === s.is_subscribed) &&
        (!q ||
          s.email.toLowerCase().includes(q) ||
          (s.name ?? "").toLowerCase().includes(q)),
    );
  }, [subscribers, filter, query]);

  const exportCsv = () => {
    const rows = [
      [
        "Email",
        "Name",
        "Status",
        "Location",
        "Unsubscribe reason",
        "Feedback",
        "Subscribed on",
      ],
      ...shown.map((s) => [
        s.email,
        s.name ?? "",
        s.is_subscribed ? "Subscribed" : "Unsubscribed",
        s.location ?? "",
        s.unsubscribe_reason
          ? (REASONS[s.unsubscribe_reason] ?? s.unsubscribe_reason)
          : "",
        s.unsubscribe_feedback ?? "",
        format(new Date(s.created_at), "yyyy-MM-dd"),
      ]),
    ];
    const csv = rows.map((r) => r.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscribers-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const tabs: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "subscribed", label: "Subscribed" },
    { id: "unsubscribed", label: "Unsubscribed" },
  ];

  return (
    <>
      <PageHeader
        title="Subscribers"
        subtitle="People who signed up for the newsletter."
        actions={
          <button
            type="button"
            className={button("primary")}
            onClick={exportCsv}
            disabled={shown.length === 0}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Export CSV
          </button>
        }
      />
      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total", value: counts.all },
          { label: "Subscribed", value: counts.subscribed },
          { label: "Unsubscribed", value: counts.unsubscribed },
        ].map((t) => (
          <Card key={t.label} className="p-5">
            <p className="text-sm text-gray-400">{t.label}</p>
            <p className="mt-2 text-3xl font-bold text-white">
              {loading ? "–" : t.value}
            </p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 p-3">
          <div
            role="tablist"
            aria-label="Filter by status"
            className="flex flex-wrap gap-1"
          >
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={filter === t.id}
                onClick={() => setFilter(t.id)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === t.id
                    ? "bg-purple-500/15 text-white"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
              >
                {t.label}
                <span className="ml-1.5 text-xs text-gray-500">
                  {counts[t.id]}
                </span>
              </button>
            ))}
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by email or name"
            aria-label="Search subscribers"
            className={`${inputClass} sm:max-w-xs`}
          />
        </div>

        {loading ? (
          <div className="h-48 animate-pulse" aria-busy="true" />
        ) : shown.length === 0 ? (
          <EmptyState
            title={
              subscribers.length === 0 ? "No subscribers yet" : "No one matches"
            }
            body={
              subscribers.length === 0
                ? "When someone signs up with the newsletter form, they appear here."
                : "Try another tab or clear the search."
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
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Location
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {shown.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{s.email}</p>
                      {s.name && (
                        <p className="text-xs text-gray-500">{s.name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={s.is_subscribed ? "published" : "draft"}
                        label={s.is_subscribed ? "subscribed" : "unsubscribed"}
                      />
                      {!s.is_subscribed && s.unsubscribe_reason && (
                        <p
                          className="mt-1 text-xs text-gray-500"
                          title={s.unsubscribe_feedback ?? undefined}
                        >
                          {REASONS[s.unsubscribe_reason] ??
                            s.unsubscribe_reason}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {s.location || "–"}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {format(new Date(s.created_at), "d MMM yyyy")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
