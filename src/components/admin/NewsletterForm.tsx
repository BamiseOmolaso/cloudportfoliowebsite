"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RichEditor from "./RichEditor";
import { Field, Panel } from "./forms";
import { ErrorBanner, PageHeader, button, inputClass } from "./ui";

/** Write a newsletter: a subject, the body, and whether it is a draft or scheduled for later. */
export default function NewsletterForm({ id }: { id?: string }) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"draft" | "scheduled">("draft");
  const [scheduledFor, setScheduledFor] = useState("");
  const [loaded, setLoaded] = useState(!id);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/newsletters/${id}`)
      .then((r) =>
        r.ok
          ? r.json()
          : Promise.reject(new Error("Could not load the newsletter")),
      )
      .then((d) => {
        setSubject(d.subject ?? "");
        setContent(d.content ?? "");
        setStatus(d.status === "scheduled" ? "scheduled" : "draft");
        setSent(d.status === "sent");
        setScheduledFor(d.scheduled_for ? d.scheduled_for.slice(0, 16) : "");
        setLoaded(true);
      })
      .catch((e: Error) => setError(e.message));
  }, [id]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const touch = () => {
    setDirty(true);
    setSaved(false);
  };

  const save = async () => {
    if (!subject.trim()) return setError("Give the newsletter a subject.");
    if (!content.replace(/<[^>]*>/g, "").trim() && !/<img /.test(content))
      return setError("Write something first.");
    if (status === "scheduled" && !scheduledFor)
      return setError("Choose when it should go out.");
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        id ? `/api/admin/newsletters/${id}` : "/api/admin/newsletters",
        {
          method: id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: subject.trim(),
            content,
            status,
            scheduled_for:
              status === "scheduled"
                ? new Date(scheduledFor).toISOString()
                : null,
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data.error || "Could not save the newsletter");
      setDirty(false);
      setSaved(true);
      if (!id && data.id) router.replace(`/admin/newsletters/edit/${data.id}`);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save the newsletter",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return error ? (
      <>
        <PageHeader title="Newsletter" />
        <ErrorBanner message={error} />
        <Link href="/admin/newsletters" className={button("secondary")}>
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
        title={id ? "Edit newsletter" : "New newsletter"}
        subtitle={
          sent
            ? "This one has already been sent."
            : "Saving does not send it. Subscribers only receive it when it is sent."
        }
        actions={
          <Link href="/admin/newsletters" className={button("ghost")}>
            ← All newsletters
          </Link>
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
          <Field
            label="Subject"
            htmlFor="subject"
            counter={{ value: subject.length, max: 200 }}
            hint="The line subscribers see in their inbox."
          >
            <input
              id="subject"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                touch();
              }}
              className={`${inputClass} text-lg font-semibold`}
            />
          </Field>
          <div>
            <p className="mb-1.5 text-sm font-medium text-gray-200">Message</p>
            <RichEditor
              content={content}
              onChange={(html) => {
                setContent(html);
                touch();
              }}
              placeholder="Write the newsletter…"
            />
          </div>
        </div>
        <aside className="space-y-5">
          <Panel title="Delivery">
            <div className="grid grid-cols-2 gap-2">
              {(["draft", "scheduled"] as const).map((s) => (
                <label
                  key={s}
                  className={`cursor-pointer rounded-md border px-3 py-2 text-center text-sm capitalize transition-colors ${status === s ? "border-purple-500 bg-purple-500/15 text-white" : "border-gray-700 text-gray-400 hover:border-gray-500"}`}
                >
                  <input
                    type="radio"
                    name="status"
                    value={s}
                    checked={status === s}
                    onChange={() => {
                      setStatus(s);
                      touch();
                    }}
                    className="sr-only"
                  />
                  {s}
                </label>
              ))}
            </div>
            {status === "scheduled" && (
              <Field label="Send on" htmlFor="scheduled_for">
                <input
                  id="scheduled_for"
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => {
                    setScheduledFor(e.target.value);
                    touch();
                  }}
                  className={inputClass}
                />
              </Field>
            )}
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
            {saving ? "Saving…" : id ? "Save changes" : "Save newsletter"}
          </button>
        </div>
      </div>
    </>
  );
}
