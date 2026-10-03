"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Card,
  EmptyState,
  ErrorBanner,
  PageHeader,
  StatusBadge,
  button,
  inputClass,
} from "./ui";

export interface ContentItem {
  id: string;
  title: string;
  slug: string;
  status: string;
  updated_at: string;
  /** Tags (posts) or technologies (projects). */
  labels: string[];
}

interface Props {
  /** "post" or "project": used in the screen's wording. */
  noun: "post" | "project";
  title: string;
  subtitle: string;
  /** Admin API for the list, and for changing one item (`${api}/${id}`). */
  listUrl: string;
  itemUrl: (id: string) => string;
  /** Turns the list API's rows into display rows. */
  toItem: (row: Record<string, unknown>) => ContentItem;
  newHref: string;
  editHref: (item: ContentItem) => string;
  /** Where the item lives on the public site. */
  liveHref: (item: ContentItem) => string;
}

const TABS = [
  { id: "all", label: "All" },
  { id: "published", label: "Published" },
  { id: "draft", label: "Drafts" },
  { id: "scheduled", label: "Scheduled" },
] as const;

/**
 * One list for blog posts and projects: every status in one place, filtered by tab,
 * with edit, view, publish and delete on each row.
 */
export default function ContentList(props: Props) {
  const { noun, listUrl, itemUrl, toItem } = props;
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("all");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(listUrl);
      if (!res.ok) throw new Error(`Could not load ${noun}s`);
      const rows = (await res.json()) as Record<string, unknown>[];
      setItems(rows.map(toItem));
    } catch (e) {
      setError(e instanceof Error ? e.message : `Could not load ${noun}s`);
    } finally {
      setLoading(false);
    }
  }, [listUrl, noun, toItem]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    for (const i of items) c[i.status] = (c[i.status] ?? 0) + 1;
    return c;
  }, [items]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (i) =>
        (tab === "all" || i.status === tab) &&
        (!q ||
          i.title.toLowerCase().includes(q) ||
          i.slug.toLowerCase().includes(q) ||
          i.labels.some((l) => l.toLowerCase().includes(q))),
    );
  }, [items, tab, query]);

  const setStatus = async (
    item: ContentItem,
    status: "published" | "draft",
  ) => {
    setBusy(item.id);
    setError(null);
    try {
      const res = await fetch(itemUrl(item.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          publishedAt: status === "published" ? new Date().toISOString() : null,
        }),
      });
      if (!res.ok)
        throw new Error(
          `Could not ${status === "published" ? "publish" : "unpublish"} the ${noun}`,
        );
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status } : i)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (item: ContentItem) => {
    if (!confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    setBusy(item.id);
    setError(null);
    try {
      const res = await fetch(itemUrl(item.id), { method: "DELETE" });
      if (!res.ok) throw new Error(`Could not delete the ${noun}`);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader
        title={props.title}
        subtitle={props.subtitle}
        actions={
          <Link href={props.newHref} className={button("primary")}>
            New {noun}
          </Link>
        }
      />
      {error && <ErrorBanner message={error} onRetry={load} />}

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
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
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
            placeholder={`Search ${noun}s`}
            aria-label={`Search ${noun}s`}
            className={`${inputClass} sm:max-w-xs`}
          />
        </div>

        {loading ? (
          <div className="space-y-px" aria-busy="true">
            {[0, 1, 2].map((n) => (
              <div key={n} className="h-16 animate-pulse bg-gray-900" />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <EmptyState
            title={items.length === 0 ? `No ${noun}s yet` : `No ${noun}s match`}
            body={
              items.length === 0
                ? `Write your first ${noun} and it will appear here, drafts and published together.`
                : "Try another tab or clear the search."
            }
            action={
              items.length === 0 ? (
                <Link href={props.newHref} className={button("primary")}>
                  New {noun}
                </Link>
              ) : undefined
            }
          />
        ) : (
          <ul className="divide-y divide-gray-800">
            {shown.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
              >
                <div className="min-w-0 flex-1 basis-64">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={props.editHref(item)}
                      className="truncate font-medium text-white hover:text-purple-300"
                    >
                      {item.title}
                    </Link>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-0.5 truncate text-xs text-gray-500">
                    /{item.slug} · updated{" "}
                    {format(new Date(item.updated_at), "d MMM yyyy")}
                    {item.labels.length > 0 &&
                      ` · ${item.labels.slice(0, 4).join(", ")}`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <Link
                    href={props.editHref(item)}
                    className={button("secondary")}
                  >
                    Edit
                  </Link>
                  {item.status === "published" && (
                    <Link
                      href={props.liveHref(item)}
                      target="_blank"
                      className={button("ghost")}
                    >
                      View ↗
                    </Link>
                  )}
                  <button
                    type="button"
                    disabled={busy === item.id}
                    onClick={() =>
                      setStatus(
                        item,
                        item.status === "published" ? "draft" : "published",
                      )
                    }
                    className={button("ghost")}
                  >
                    {item.status === "published" ? "Unpublish" : "Publish"}
                  </button>
                  <button
                    type="button"
                    disabled={busy === item.id}
                    onClick={() => remove(item)}
                    className={button("danger")}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
