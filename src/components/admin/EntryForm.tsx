"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { slugify } from "@/lib/utils";
import RichEditor from "./RichEditor";
import { Field, ImageField, Panel, TagInput } from "./forms";
import { ErrorBanner, PageHeader, button, inputClass } from "./ui";

/**
 * One form for writing a blog post or a project. They share the same shape: a title, an
 * address, a summary, rich text, a cover picture, labels and search-engine text. The only
 * differences are the label name (tags / technologies) and a project's two links.
 */

type Kind = "post" | "project";

interface Entry {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string;
  meta_title: string;
  meta_description: string;
  labels: string[];
  github_url: string;
  live_url: string;
  author: string;
  status: "draft" | "published";
}

const BLANK: Entry = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  cover_image: "",
  meta_title: "",
  meta_description: "",
  labels: [],
  github_url: "",
  live_url: "",
  author: "Bamise",
  status: "draft",
};

const CONFIG = {
  post: {
    noun: "post",
    api: "/api/admin/blog",
    createApi: "/api/admin/blog",
    list: "/admin/blog",
    edit: (id: string) => `/admin/blog/edit/${id}`,
    live: (slug: string) => `/blog/${slug}`,
    labelsKey: "tags",
    labelsName: "Tags",
    labelsHint: "Press Enter after each tag.",
  },
  project: {
    noun: "project",
    api: "/api/admin/projects",
    // Projects have always been created through this route.
    createApi: "/api/projects",
    list: "/admin/projects",
    edit: (id: string) => `/admin/projects/edit/${id}`,
    live: (slug: string) => `/projects/${slug}`,
    labelsKey: "technologies",
    labelsName: "Technologies",
    labelsHint:
      "Press Enter after each one. A logo shows when the name is a known tool.",
  },
} as const;

type Errors = Partial<Record<keyof Entry, string>>;

function validate(e: Entry): Errors {
  const errors: Errors = {};
  if (!e.title.trim()) errors.title = "Give it a title.";
  else if (e.title.length > 200)
    errors.title = "Keep the title under 200 characters.";
  if (!e.slug.trim()) errors.slug = "The address is required.";
  else if (!/^[a-z0-9-]+$/.test(e.slug))
    errors.slug = "Use lowercase letters, numbers and hyphens only.";
  if (!e.content.replace(/<[^>]*>/g, "").trim() && !/<img /.test(e.content))
    errors.content = "Write something first.";
  if (e.excerpt.length > 500)
    errors.excerpt = "Keep the summary under 500 characters.";
  if (e.meta_title.length > 60)
    errors.meta_title = "Keep it under 60 characters.";
  if (e.meta_description.length > 160)
    errors.meta_description = "Keep it under 160 characters.";
  for (const key of ["github_url", "live_url"] as const) {
    if (e[key] && !/^https?:\/\/.+/.test(e[key]))
      errors[key] = "Use a full address starting with https://";
  }
  return errors;
}

export default function EntryForm({ kind, id }: { kind: Kind; id?: string }) {
  const cfg = CONFIG[kind];
  const router = useRouter();
  const [entry, setEntry] = useState<Entry>(BLANK);
  const [loaded, setLoaded] = useState(!id);
  const [slugTouched, setSlugTouched] = useState(Boolean(id));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    if (!id) return;
    fetch(`${cfg.api}/${id}`)
      .then((r) =>
        r.ok
          ? r.json()
          : Promise.reject(new Error(`Could not load the ${cfg.noun}`)),
      )
      .then((d) => {
        setEntry({
          title: d.title ?? "",
          slug: d.slug ?? "",
          excerpt: d.excerpt ?? "",
          content: d.content ?? "",
          cover_image: d.cover_image ?? "",
          meta_title: d.meta_title ?? "",
          meta_description: d.meta_description ?? "",
          labels: d[cfg.labelsKey] ?? [],
          github_url: d.github_url ?? "",
          live_url: d.live_url ?? "",
          author: d.author ?? "Bamise",
          status: d.status === "published" ? "published" : "draft",
        });
        setLoaded(true);
      })
      .catch((e: Error) => setError(e.message));
  }, [id, cfg]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = useCallback(<K extends keyof Entry>(key: K, value: Entry[K]) => {
    setEntry((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setSaved(false);
  }, []);

  const onTitle = (title: string) => {
    setEntry((prev) => ({
      ...prev,
      title,
      slug: slugTouched ? prev.slug : slugify(title),
    }));
    setDirty(true);
    setSaved(false);
  };

  const save = async () => {
    const found = validate(entry);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setError("Fix the highlighted fields, then save again.");
      return;
    }
    setSaving(true);
    setError(null);
    const body: Record<string, unknown> = {
      title: entry.title.trim(),
      slug: entry.slug,
      excerpt: entry.excerpt || null,
      content: entry.content,
      cover_image: entry.cover_image || null,
      meta_title: entry.meta_title || null,
      meta_description: entry.meta_description || null,
      [cfg.labelsKey]: entry.labels,
      author: entry.author || "Bamise",
      status: entry.status,
    };
    if (kind === "project") {
      body.github_url = entry.github_url || null;
      body.live_url = entry.live_url || null;
    }
    try {
      const res = await fetch(id ? `${cfg.api}/${id}` : cfg.createApi, {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data.error || `Could not save the ${cfg.noun}`);
      setDirty(false);
      setSaved(true);
      if (!id && data.id) router.replace(cfg.edit(data.id));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : `Could not save the ${cfg.noun}`,
      );
    } finally {
      setSaving(false);
    }
  };

  const title = id ? `Edit ${cfg.noun}` : `New ${cfg.noun}`;
  const liveHref = useMemo(
    () => (entry.slug ? cfg.live(entry.slug) : null),
    [entry.slug, cfg],
  );

  if (!loaded) {
    return error ? (
      <>
        <PageHeader title={title} />
        <ErrorBanner message={error} />
        <Link href={cfg.list} className={button("secondary")}>
          ← Back to the list
        </Link>
      </>
    ) : (
      <div
        className="h-96 animate-pulse rounded-xl bg-gray-900"
        aria-busy="true"
      />
    );
  }

  return (
    <>
      <PageHeader
        title={title}
        subtitle={
          id
            ? "Changes go live as soon as you save a published item."
            : "Start as a draft. Publish when it is ready."
        }
        actions={
          <>
            <Link href={cfg.list} className={button("ghost")}>
              ← All {cfg.noun}s
            </Link>
            {liveHref && entry.status === "published" && id && (
              <Link
                href={liveHref}
                target="_blank"
                className={button("secondary")}
              >
                View live ↗
              </Link>
            )}
          </>
        }
      />
      {error && <ErrorBanner message={error} />}
      {saved && (
        <p
          role="status"
          className="mb-6 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
        >
          Saved.
        </p>
      )}

      <div className="grid gap-6 pb-24 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-5">
          <Field label="Title" htmlFor="title" error={errors.title}>
            <input
              id="title"
              value={entry.title}
              onChange={(e) => onTitle(e.target.value)}
              className={`${inputClass} text-lg font-semibold`}
              placeholder={`Name of the ${cfg.noun}`}
            />
          </Field>
          <Field
            label="Address"
            htmlFor="slug"
            error={errors.slug}
            hint={`Shown as /${kind === "post" ? "blog" : "projects"}/${entry.slug || "address"}`}
          >
            <input
              id="slug"
              value={entry.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", e.target.value);
              }}
              className={inputClass}
            />
          </Field>
          <Field
            label="Summary"
            htmlFor="excerpt"
            error={errors.excerpt}
            counter={{ value: entry.excerpt.length, max: 500 }}
            hint="One or two sentences shown on the list page."
          >
            <textarea
              id="excerpt"
              rows={3}
              value={entry.excerpt}
              onChange={(e) => set("excerpt", e.target.value)}
              className={inputClass}
            />
          </Field>
          <div>
            <p className="mb-1.5 text-sm font-medium text-gray-200">Content</p>
            <RichEditor
              content={entry.content}
              onChange={(html) => set("content", html)}
              placeholder={
                kind === "post"
                  ? "Write your post…"
                  : "Describe the project: what it is, how it works, what you learnt…"
              }
            />
            {errors.content && (
              <p className="mt-1.5 text-xs text-red-400" role="alert">
                {errors.content}
              </p>
            )}
          </div>
        </div>

        <aside className="space-y-5">
          <Panel title="Publishing">
            <fieldset>
              <legend className="sr-only">Status</legend>
              <div className="grid grid-cols-2 gap-2">
                {(["draft", "published"] as const).map((s) => (
                  <label
                    key={s}
                    className={`cursor-pointer rounded-md border px-3 py-2 text-center text-sm capitalize transition-colors ${
                      entry.status === s
                        ? "border-purple-500 bg-purple-500/15 text-white"
                        : "border-gray-700 text-gray-400 hover:border-gray-500"
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={s}
                      checked={entry.status === s}
                      onChange={() => set("status", s)}
                      className="sr-only"
                    />
                    {s}
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                {entry.status === "published"
                  ? "Visible to everyone once saved."
                  : "Only you can see a draft."}
              </p>
            </fieldset>
            <Field label="Author" htmlFor="author">
              <input
                id="author"
                value={entry.author}
                onChange={(e) => set("author", e.target.value)}
                className={inputClass}
              />
            </Field>
          </Panel>

          <Panel title="Cover image">
            <ImageField
              value={entry.cover_image}
              onChange={(url) => set("cover_image", url)}
            />
          </Panel>

          <Panel title={cfg.labelsName}>
            <TagInput
              id="labels"
              values={entry.labels}
              onChange={(v) => set("labels", v)}
              placeholder={cfg.labelsHint}
            />
          </Panel>

          {kind === "project" && (
            <Panel title="Links">
              <Field
                label="Repository"
                htmlFor="github_url"
                error={errors.github_url}
              >
                <input
                  id="github_url"
                  value={entry.github_url}
                  onChange={(e) => set("github_url", e.target.value)}
                  placeholder="https://github.com/…"
                  className={inputClass}
                />
              </Field>
              <Field
                label="Live site"
                htmlFor="live_url"
                error={errors.live_url}
              >
                <input
                  id="live_url"
                  value={entry.live_url}
                  onChange={(e) => set("live_url", e.target.value)}
                  placeholder="https://…"
                  className={inputClass}
                />
              </Field>
            </Panel>
          )}

          <Panel title="Search engines">
            <Field
              label="Title"
              htmlFor="meta_title"
              error={errors.meta_title}
              counter={{ value: entry.meta_title.length, max: 60 }}
            >
              <input
                id="meta_title"
                value={entry.meta_title}
                onChange={(e) => set("meta_title", e.target.value)}
                placeholder={entry.title}
                className={inputClass}
              />
            </Field>
            <Field
              label="Description"
              htmlFor="meta_description"
              error={errors.meta_description}
              counter={{ value: entry.meta_description.length, max: 160 }}
            >
              <textarea
                id="meta_description"
                rows={3}
                value={entry.meta_description}
                onChange={(e) => set("meta_description", e.target.value)}
                className={inputClass}
              />
            </Field>
          </Panel>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-800 bg-gray-900/95 px-4 py-3 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 sm:px-4">
          <p className="text-sm text-gray-400" aria-live="polite">
            {dirty ? "Unsaved changes" : saved ? "All changes saved" : " "}
          </p>
          <button
            type="button"
            className={button("primary")}
            disabled={saving || (!dirty && Boolean(id))}
            onClick={save}
          >
            {saving
              ? "Saving…"
              : id
                ? "Save changes"
                : entry.status === "published"
                  ? `Publish ${cfg.noun}`
                  : "Save draft"}
          </button>
        </div>
      </div>
    </>
  );
}
