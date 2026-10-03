"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Card,
  ErrorBanner,
  PageHeader,
  StatusBadge,
  button,
  inputClass,
} from "@/components/admin/ui";

interface Field {
  path: string;
  label: string;
  kind: "text" | "textarea";
  default: string;
  value: string;
  edited: boolean;
}
interface PageData {
  id: string;
  title: string;
  href: string;
  description: string;
  groups: { title: string; fields: Field[] }[];
}

export default function AdminPageEditor() {
  const { page } = useParams<{ page: string }>();
  const [data, setData] = useState<PageData | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/pages/${page}`);
      if (!res.ok)
        throw new Error(
          res.status === 404
            ? "There is no such page"
            : "Could not load the page",
        );
      const d = (await res.json()) as PageData;
      setData(d);
      setDraft(
        Object.fromEntries(
          d.groups.flatMap((g) => g.fields.map((f) => [f.path, f.value])),
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the page");
    }
  }, [page]);
  useEffect(() => {
    load();
  }, [load]);

  const fields = useMemo(
    () => data?.groups.flatMap((g) => g.fields) ?? [],
    [data],
  );
  const changed = useMemo(
    () =>
      fields
        .filter((f) => (draft[f.path] ?? f.value) !== f.value)
        .map((f) => f.path),
    [fields, draft],
  );

  const save = async (values: Record<string, string>) => {
    setSaving(true);
    setSaved(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/pages/${page}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      });
      if (!res.ok) throw new Error("Could not save. Nothing was changed.");
      setSaved("Saved. The live page shows the new text now.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const saveChanged = () =>
    save(Object.fromEntries(changed.map((p) => [p, draft[p]])));
  const resetField = (f: Field) => save({ [f.path]: "" });

  if (error && !data) {
    return (
      <>
        <PageHeader title="Page" />
        <ErrorBanner message={error} onRetry={load} />
        <Link href="/admin/pages" className={button("secondary")}>
          ← All pages
        </Link>
      </>
    );
  }
  if (!data)
    return (
      <div
        className="h-64 animate-pulse rounded-xl bg-gray-900"
        aria-busy="true"
      />
    );

  return (
    <>
      <PageHeader
        title={data.title}
        subtitle={data.description}
        actions={
          <>
            <Link href="/admin/pages" className={button("ghost")}>
              ← All pages
            </Link>
            <Link
              href={data.href}
              target="_blank"
              className={button("secondary")}
            >
              View live ↗
            </Link>
          </>
        }
      />
      {error && <ErrorBanner message={error} />}
      {saved && (
        <p
          role="status"
          className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
        >
          {saved}
        </p>
      )}

      <div className="space-y-6 pb-24">
        {data.groups.map((g) => (
          <Card key={g.title} className="p-5">
            <h2 className="mb-4 text-base font-semibold text-white">
              {g.title}
            </h2>
            <div className="space-y-5">
              {g.fields.map((f) => {
                const id = `f-${f.path}`;
                const value = draft[f.path] ?? f.value;
                return (
                  <div key={f.path}>
                    <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                      <label
                        htmlFor={id}
                        className="text-sm font-medium text-gray-200"
                      >
                        {f.label}
                        {f.edited && (
                          <span className="ml-2 align-middle">
                            <StatusBadge status="edited" />
                          </span>
                        )}
                      </label>
                      {f.edited && (
                        <button
                          type="button"
                          onClick={() => resetField(f)}
                          disabled={saving}
                          className="text-xs text-gray-400 underline hover:text-white"
                        >
                          Reset to original
                        </button>
                      )}
                    </div>
                    {f.kind === "textarea" ? (
                      <textarea
                        id={id}
                        rows={Math.min(
                          8,
                          Math.max(3, Math.ceil(value.length / 80)),
                        )}
                        value={value}
                        maxLength={2000}
                        onChange={(e) =>
                          setDraft({ ...draft, [f.path]: e.target.value })
                        }
                        className={inputClass}
                      />
                    ) : (
                      <input
                        id={id}
                        type="text"
                        value={value}
                        maxLength={2000}
                        onChange={(e) =>
                          setDraft({ ...draft, [f.path]: e.target.value })
                        }
                        className={inputClass}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-800 bg-gray-900/95 px-4 py-3 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 sm:px-4">
          <p className="text-sm text-gray-400" aria-live="polite">
            {changed.length === 0
              ? "No unsaved changes"
              : `${changed.length} unsaved change${changed.length === 1 ? "" : "s"}`}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className={button("ghost")}
              disabled={changed.length === 0 || saving}
              onClick={load}
            >
              Discard
            </button>
            <button
              type="button"
              className={button("primary")}
              disabled={changed.length === 0 || saving}
              onClick={saveChanged}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
