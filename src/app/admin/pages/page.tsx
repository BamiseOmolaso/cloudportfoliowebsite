"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  ErrorBanner,
  PageHeader,
  StatusBadge,
  button,
} from "@/components/admin/ui";

interface PageSummary {
  id: string;
  title: string;
  href: string;
  description: string;
  fields: number;
  edited: number;
  sections: number;
  hidden: number;
  arranged: boolean;
}

export default function AdminPagesIndex() {
  const [pages, setPages] = useState<PageSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    fetch("/api/admin/pages")
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error("Could not load the pages")),
      )
      .then(setPages)
      .catch((e: Error) => setError(e.message));
  };
  useEffect(load, []);

  return (
    <>
      <PageHeader
        title="Pages"
        subtitle="Edit the wording of the Home, About, Learning and Contact pages. Blog posts and projects are edited under their own menus."
      />
      {error && <ErrorBanner message={error} onRetry={load} />}
      <div className="grid gap-4 sm:grid-cols-2">
        {(pages ?? []).map((p) => (
          <Card key={p.id} className="flex flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">{p.title}</h2>
              <span className="flex flex-wrap justify-end gap-1">
                {p.hidden > 0 && (
                  <StatusBadge status="draft" label={`${p.hidden} hidden`} />
                )}
                {p.arranged && (
                  <StatusBadge status="scheduled" label="reordered" />
                )}
                {p.edited > 0 && (
                  <StatusBadge status="edited" label={`${p.edited} edited`} />
                )}
              </span>
            </div>
            <p className="mt-2 flex-1 text-sm text-gray-400">{p.description}</p>
            <p className="mt-3 text-xs text-gray-500">
              {p.fields} pieces of text
              {p.sections > 0 && ` · ${p.sections} sections`}
            </p>
            <div className="mt-4 flex gap-2">
              <Link href={`/admin/pages/${p.id}`} className={button("primary")}>
                Edit
              </Link>
              <Link href={p.href} target="_blank" className={button("ghost")}>
                View ↗
              </Link>
            </div>
          </Card>
        ))}
        {!pages &&
          !error &&
          [0, 1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-40 animate-pulse rounded-xl bg-gray-900"
            />
          ))}
      </div>
    </>
  );
}
