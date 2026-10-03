"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";
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
  /** The page's sections in their current order; null for a page that is not made of sections. */
  sections: Section[] | null;
  groups: { title: string; fields: Field[] }[];
}
interface Section {
  id: string;
  label: string;
  description: string;
  pinned: boolean;
  visible: boolean;
}

/** A switch: on means the section is shown on the live page. */
function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 disabled:opacity-50 ${
        checked ? "bg-purple-600" : "bg-gray-700"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
          checked ? "left-[1.375rem]" : "left-0.5"
        }`}
      />
    </button>
  );
}

export default function AdminPageEditor() {
  const { page } = useParams<{ page: string }>();
  const [data, setData] = useState<PageData | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  // The sections as arranged on this screen (saved with the same Save button as the text).
  const [layout, setLayout] = useState<Section[]>([]);
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
      setLayout(d.sections ?? []);
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

  const layoutChanged = useMemo(() => {
    const before = data?.sections ?? [];
    return (
      before.length === layout.length &&
      before.some(
        (b, i) => b.id !== layout[i].id || b.visible !== layout[i].visible,
      )
    );
  }, [data, layout]);
  const unsaved = changed.length + (layoutChanged ? 1 : 0);

  const move = (index: number, by: -1 | 1) =>
    setLayout((prev) => {
      const next = [...prev];
      const to = index + by;
      // The pinned opening stays where it is, and nothing moves above it.
      if (to < 0 || to >= next.length || next[to].pinned || next[index].pinned)
        return prev;
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });
  const setVisible = (id: string, visible: boolean) =>
    setLayout((prev) => prev.map((s) => (s.id === id ? { ...s, visible } : s)));

  const save = async (values: Record<string, string>, withLayout = false) => {
    setSaving(true);
    setSaved(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/pages/${page}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          values,
          ...(withLayout && data?.sections
            ? { layout: layout.map((s) => ({ id: s.id, visible: s.visible })) }
            : {}),
        }),
      });
      if (!res.ok) throw new Error("Could not save. Nothing was changed.");
      setSaved("Saved. The live page shows the changes now.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const saveChanged = () =>
    save(Object.fromEntries(changed.map((p) => [p, draft[p]])), layoutChanged);
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
        {data.sections && (
          <Card className="p-5">
            <h2 className="text-base font-semibold text-white">
              Sections on this page
            </h2>
            <p className="mb-4 mt-1 text-sm text-gray-400">
              Turn a section off to hide it from the live page, or use the
              arrows to move it up or down. The opening stays at the top. Save
              to apply.
            </p>
            <ol className="divide-y divide-gray-800 rounded-lg border border-gray-800">
              {layout.map((s, i) => (
                <li key={s.id} className="flex items-center gap-3 px-3 py-3">
                  <div className="flex shrink-0 flex-col">
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={s.pinned || i === 0 || layout[i - 1].pinned}
                      aria-label={`Move ${s.label} up`}
                      className="rounded p-0.5 text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-25"
                    >
                      <ArrowUp className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={s.pinned || i === layout.length - 1}
                      aria-label={`Move ${s.label} down`}
                      className="rounded p-0.5 text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-25"
                    >
                      <ArrowDown className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium ${s.visible ? "text-white" : "text-gray-500 line-through"}`}
                    >
                      {s.label}
                      {s.pinned && (
                        <span className="ml-2 text-xs font-normal text-gray-500 no-underline">
                          always first
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {s.description}
                    </p>
                  </div>
                  <span className="hidden text-xs text-gray-500 sm:block">
                    {s.visible ? "Shown" : "Hidden"}
                  </span>
                  <Switch
                    checked={s.visible}
                    disabled={s.pinned}
                    onChange={(v) => setVisible(s.id, v)}
                    label={`Show ${s.label}`}
                  />
                </li>
              ))}
            </ol>
          </Card>
        )}
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
            {unsaved === 0
              ? "No unsaved changes"
              : `${unsaved} unsaved change${unsaved === 1 ? "" : "s"}`}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className={button("ghost")}
              disabled={unsaved === 0 || saving}
              onClick={load}
            >
              Discard
            </button>
            <button
              type="button"
              className={button("primary")}
              disabled={unsaved === 0 || saving}
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
