"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Card,
  EmptyState,
  ErrorBanner,
  PageHeader,
  StatusBadge,
  button,
} from "@/components/admin/ui";

interface Newsletter {
  id: string;
  subject: string;
  status: "draft" | "sent" | "scheduled";
  recipients_count: number;
  sent_count?: number;
  failed_count?: number;
  created_at: string;
  sent_at?: string | null;
  scheduled_for?: string | null;
}

const badge = (s: Newsletter["status"]) =>
  s === "sent" ? "published" : s === "scheduled" ? "scheduled" : "draft";

export default function NewslettersPage() {
  const [items, setItems] = useState<Newsletter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
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
        subtitle="Write an issue, save it as a draft, or schedule it."
        actions={
          <Link href="/admin/newsletters/new" className={button("primary")}>
            New newsletter
          </Link>
        }
      />
      {error && <ErrorBanner message={error} onRetry={load} />}
      <Card>
        {loading ? (
          <div className="h-40 animate-pulse" aria-busy="true" />
        ) : items.length === 0 ? (
          <EmptyState
            title="No newsletters yet"
            body="Write your first issue. Saving it does not send it."
            action={
              <Link href="/admin/newsletters/new" className={button("primary")}>
                New newsletter
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-gray-800">
            {items.map((n) => (
              <li
                key={n.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
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
                    {n.status === "scheduled" &&
                      n.scheduled_for &&
                      ` · goes out ${format(new Date(n.scheduled_for), "d MMM yyyy, HH:mm")}`}
                    {n.status === "sent" &&
                      ` · ${n.sent_count ?? 0} of ${n.recipients_count} delivered`}
                    {!!n.failed_count && ` · ${n.failed_count} failed`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Link
                    href={`/admin/newsletters/edit/${n.id}`}
                    className={button("secondary")}
                  >
                    {n.status === "sent" ? "View" : "Edit"}
                  </Link>
                  {n.status !== "sent" && (
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
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
