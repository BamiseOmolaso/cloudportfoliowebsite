"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RichEditor from "./RichEditor";
import { Field, Panel } from "./forms";
import NewsletterSend from "./NewsletterSend";
import { ErrorBanner, PageHeader, button, inputClass } from "./ui";

/**
 * Write a newsletter: a subject and the message. Once it is saved, the side column has
 * the Send box (choose recipients, send a test copy).
 */
export default function NewsletterForm({ id }: { id?: string }) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [loaded, setLoaded] = useState(!id);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("draft");

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/newsletters/${id}`)
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error("Could not load the newsletter")),
      )
      .then((d) => {
        setSubject(d.subject ?? "");
        setContent(d.content ?? "");
        setStatus(d.status ?? "draft");
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
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        id ? `/api/admin/newsletters/${id}` : "/api/admin/newsletters",
        {
          method: id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          // The status is not sent: saving never changes whether it has been sent.
          body: JSON.stringify(
            id
              ? { subject: subject.trim(), content }
              : { subject: subject.trim(), content, status: "draft" },
          ),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save the newsletter");
      setDirty(false);
      setSaved(true);
      if (!id && data.id) router.replace(`/admin/newsletters/edit/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the newsletter");
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
      <div className="h-96 animate-pulse rounded-xl bg-gray-900" aria-busy="true" />
    );
  }

  const locked = status === "sending";

  return (
    <>
      <PageHeader
        title={id ? "Edit newsletter" : "New newsletter"}
        subtitle={
          id
            ? "Saving does not send it. Use the Send box when you are ready."
            : "Save it first, then choose who to send it to."
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
              disabled={locked}
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
              placeholder="Write the newsletter… Use {name} to greet each person by name."
            />
          </div>
        </div>
        <aside className="space-y-5">
          {id ? (
            <Panel title="Send">
              <NewsletterSend
                newsletterId={id}
                subject={subject}
                hasUnsavedChanges={dirty}
              />
            </Panel>
          ) : (
            <Panel title="Send">
              <p className="text-sm text-gray-400">
                Save the newsletter first. Then you can send yourself a test copy and
                choose who receives it.
              </p>
            </Panel>
          )}
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
            disabled={saving || locked || (!dirty && Boolean(id))}
            onClick={save}
          >
            {saving ? "Saving…" : id ? "Save changes" : "Save newsletter"}
          </button>
        </div>
      </div>
    </>
  );
}
