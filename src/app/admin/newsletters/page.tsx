"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { BarChart3, Send } from "lucide-react";
import { RecipientDialog } from "@/components/admin/NewsletterSend";
import { StatChips, type Stats } from "@/components/admin/DeliveryStats";
import {
  Card,
  EmptyState,
  ErrorBanner,
  PageHeader,
  StatusBadge,
  button,
  inputClass,
} from "@/components/admin/ui";

interface Newsletter {
  id: string;
  subject: string;
  status: "draft" | "sending" | "sent" | "scheduled";
  recipients_count: number;
  sent_count?: number;
  created_at: string;
  sent_at?: string | null;
  stats: Stats;
}

const TABS = [
  { id: "all", label: "All" },
  { id: "draft", label: "Drafts" },
  { id: "sending", label: "Sending" },
  { id: "sent", label: "Sent" },
] as const;

const badge = (s: Newsletter["status"]) =>
  s === "sent" ? "published" : s === "sending" ? "scheduled" : "draft";

export default function NewslettersPage() {
  const [items, setItems] = useState<Newsletter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("all");
  const [query, setQuery] = useState("");
  const [picking, setPicking] = useState<Newsletter | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/newsletters");
      if (!res.ok) throw new Error("Could not load the newsletters");
      setItems((await res.json()) ?? []);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load the newsletters",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  // While anything is being sent, refresh the list every few seconds.
  const anySending = items.some((n) => n.status === "sending");
  useEffect(() => {
    if (!anySending) return;
    const t = window.setInterval(() => load(true), 3000);
    return () => window.clearInterval(t);
  }, [anySending, load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    for (const n of items) c[n.status] = (c[n.status] ?? 0) + 1;
    return c;
  }, [items]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (n) =>
        (tab === "all" || n.status === tab) &&
        (!q || n.subject.toLowerCase().includes(q)),
    );
  }, [items, tab, query]);

  const remove = async (n: Newsletter) => {
    if (!confirm(`Delete "${n.subject}"? This cannot be undone.`)) return;
    setBusy(n.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/newsletters/${n.id}`, {
        method: "DELETE",
      });
      if (!res.ok)
        throw new Error(
          (await res.json().catch(() => ({}))).error ||
            "Could not delete the newsletter",
        );
      setItems((prev) => prev.filter((x) => x.id !== n.id));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not delete the newsletter",
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Newsletters"
        subtitle="Write an issue, choose who gets it, and see what happened to each email."
        actions={
          <Link href="/admin/newsletters/new" className={button("primary")}>
            New newsletter
          </Link>
        }
      />
      {error && <ErrorBanner message={error} onRetry={() => load()} />}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 p-3">
          <div
            role="tablist"
            aria-label="Filter by status"
            className="flex flex-wrap gap-1"
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  tab === t.id
                    ? "bg-purple-500/15 text-white"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
              >
                {t.label}
                <span className="ml-1.5 text-xs text-gray-500">
                  {counts[t.id] ?? 0}
                </span>
              </button>
            ))}
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search newsletters"
            aria-label="Search newsletters"
            className={`${inputClass} sm:max-w-xs`}
          />
        </div>

        {loading ? (
          <div className="h-40 animate-pulse" aria-busy="true" />
        ) : shown.length === 0 ? (
          <EmptyState
            title={
              items.length === 0 ? "No newsletters yet" : "No newsletters match"
            }
            body={
              items.length === 0
                ? "Write your first issue. Saving it does not send it."
                : "Try another tab or clear the search."
            }
            action={
              items.length === 0 ? (
                <Link
                  href="/admin/newsletters/new"
                  className={button("primary")}
                >
                  New newsletter
                </Link>
              ) : undefined
            }
          />
        ) : (
          <ul className="divide-y divide-gray-800">
            {shown.map((n) => {
              const hasSends = n.stats.total > 0;
              return (
                <li
                  key={n.id}
                  className="flex flex-wrap items-start justify-between gap-3 px-4 py-3.5"
                >
                  <div className="min-w-0 flex-1 basis-64">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/newsletters/edit/${n.id}`}
                        className="truncate font-medium text-white hover:text-purple-300"
                      >
                        {n.subject}
                      </Link>
                      <StatusBadge status={badge(n.status)} label={n.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Created {format(new Date(n.created_at), "d MMM yyyy")}
                      {n.status === "sent" &&
                        n.sent_at &&
                        ` · sent ${format(new Date(n.sent_at), "d MMM yyyy, HH:mm")}`}
                      {n.status === "sending" &&
                        ` · sending… ${n.stats.total} done`}
                    </p>
                    {hasSends && <StatChips stats={n.stats} />}
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    <Link
                      href={`/admin/newsletters/edit/${n.id}`}
                      className={button("secondary")}
                    >
                      Edit
                    </Link>
                    {n.status !== "sending" && (
                      <button
                        type="button"
                        className={button("primary")}
                        onClick={() => setPicking(n)}
                      >
                        <Send className="h-4 w-4" aria-hidden="true" />
                        {n.status === "sent" ? "Send to more" : "Send"}
                      </button>
                    )}
                    {hasSends && (
                      <Link
                        href={`/admin/newsletters/report/${n.id}`}
                        className={button("ghost")}
                      >
                        <BarChart3 className="h-4 w-4" aria-hidden="true" />
                        Report
                      </Link>
                    )}
                    {n.status !== "sent" && n.status !== "sending" && (
                      <button
                        type="button"
                        disabled={busy === n.id}
                        onClick={() => remove(n)}
                        className={button("danger")}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {picking && (
        <RecipientDialog
          newsletterId={picking.id}
          subject={picking.subject}
          onClose={() => setPicking(null)}
          onStarted={() => {
            setPicking(null);
            load(true);
          }}
        />
      )}
    </>
  );
}
