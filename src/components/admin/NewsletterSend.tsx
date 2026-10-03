"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { Send, X } from "lucide-react";
import { ErrorBanner, button, inputClass } from "./ui";

interface Recipient {
  id: string;
  email: string;
  name: string | null;
  location: string | null;
  already_sent: boolean;
}

interface Status {
  status: string;
  sent_count: number;
  recipients_count: number;
  sent_at: string | null;
}

/**
 * Choose who gets a newsletter and send it. Nothing is ticked at first, so a send is
 * always a decision. People who already received this issue are shown but cannot be
 * picked again.
 */
function RecipientDialog({
  newsletterId,
  subject,
  onClose,
  onStarted,
}: {
  newsletterId: string;
  subject: string;
  onClose: () => void;
  onStarted: (queued: number) => void;
}) {
  const [people, setPeople] = useState<Recipient[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && !sending && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, sending]);

  useEffect(() => {
    fetch(`/api/admin/newsletters/${newsletterId}/recipients`)
      .then((r) =>
        r.ok
          ? r.json()
          : Promise.reject(new Error("Could not load the subscribers")),
      )
      .then(setPeople)
      .catch((e: Error) => setError(e.message));
  }, [newsletterId]);

  const eligible = useMemo(
    () => (people ?? []).filter((p) => !p.already_sent),
    [people],
  );
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (people ?? []).filter(
      (p) =>
        !q ||
        p.email.toLowerCase().includes(q) ||
        (p.name ?? "").toLowerCase().includes(q),
    );
  }, [people, query]);

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const pickAll = () =>
    setPicked(new Set(shown.filter((p) => !p.already_sent).map((p) => p.id)));

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/newsletters/${newsletterId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriberIds: Array.from(picked) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not start sending");
      onStarted(data.queued);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start sending");
      setSending(false);
      setConfirming(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="send-title"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/70"
        onClick={() => !sending && onClose()}
      />
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-gray-700 bg-gray-900 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-800 p-5">
          <div className="min-w-0">
            <h2 id="send-title" className="text-lg font-semibold text-white">
              Choose who gets this
            </h2>
            <p className="mt-0.5 truncate text-sm text-gray-400">
              &ldquo;{subject}&rdquo;
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            disabled={sending}
            aria-label="Close"
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {error && (
          <div className="px-5 pt-4">
            <ErrorBanner message={error} />
          </div>
        )}

        {!people && !error ? (
          <div className="h-56 animate-pulse" aria-busy="true" />
        ) : people && people.length === 0 ? (
          <p className="p-10 text-center text-sm text-gray-400">
            No one is subscribed yet. People who sign up with the newsletter
            form appear here.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 border-b border-gray-800 px-5 py-3">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by email or name"
                aria-label="Search subscribers"
                className={`${inputClass} flex-1 basis-48`}
              />
              <button
                type="button"
                className={button("secondary")}
                onClick={pickAll}
              >
                Select all{query ? " shown" : ""}
              </button>
              <button
                type="button"
                className={button("ghost")}
                onClick={() => setPicked(new Set())}
                disabled={picked.size === 0}
              >
                Clear
              </button>
            </div>
            <ul className="min-h-0 flex-1 divide-y divide-gray-800 overflow-y-auto">
              {shown.map((p) => (
                <li key={p.id}>
                  <label
                    className={`flex items-center gap-3 px-5 py-3 ${p.already_sent ? "opacity-50" : "cursor-pointer hover:bg-gray-800/50"}`}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-600 accent-purple-500"
                      checked={picked.has(p.id)}
                      disabled={p.already_sent}
                      onChange={() => toggle(p.id)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-white">
                        {p.email}
                      </span>
                      {(p.name || p.location) && (
                        <span className="block truncate text-xs text-gray-500">
                          {[p.name, p.location].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </span>
                    {p.already_sent && (
                      <span className="text-xs text-gray-400">
                        Already received
                      </span>
                    )}
                  </label>
                </li>
              ))}
              {shown.length === 0 && (
                <li className="p-8 text-center text-sm text-gray-400">
                  No one matches.
                </li>
              )}
            </ul>
          </>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-800 p-5">
          <p className="text-sm text-gray-400" aria-live="polite">
            {picked.size} of {eligible.length} selected
          </p>
          {confirming ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-amber-300">
                Send to {picked.size} {picked.size === 1 ? "person" : "people"}{" "}
                now? This cannot be undone.
              </span>
              <button
                type="button"
                className={button("ghost")}
                onClick={() => setConfirming(false)}
                disabled={sending}
              >
                Back
              </button>
              <button
                type="button"
                className={button("primary")}
                onClick={send}
                disabled={sending}
              >
                {sending ? "Starting…" : "Yes, send"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={button("primary")}
              disabled={picked.size === 0}
              onClick={() => setConfirming(true)}
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              Send to {picked.size || "…"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** The Send box in the newsletter editor's side column. */
export default function NewsletterSend({
  newsletterId,
  subject,
  hasUnsavedChanges,
}: {
  newsletterId: string;
  subject: string;
  hasUnsavedChanges: boolean;
}) {
  const [info, setInfo] = useState<Status | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [target, setTarget] = useState<{
    queued: number;
    before: number;
  } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/newsletters/${newsletterId}`);
      if (res.ok) setInfo(await res.json());
    } catch {
      /* the next poll will try again */
    }
  }, [newsletterId]);

  useEffect(() => {
    load();
  }, [load]);

  // While it is sending, check progress every two seconds.
  const sending = info?.status === "sending";
  useEffect(() => {
    if (!sending) return;
    const t = window.setInterval(load, 2000);
    return () => window.clearInterval(t);
  }, [sending, load]);

  const sendTest = async () => {
    setTesting(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/newsletters/${newsletterId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not send the test");
      setNotice(`A test copy was sent to ${data.to}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send the test");
    } finally {
      setTesting(false);
    }
  };

  const started = (queued: number) => {
    setOpen(false);
    setTarget({ queued, before: info?.sent_count ?? 0 });
    setInfo((prev) => (prev ? { ...prev, status: "sending" } : prev));
    setNotice(null);
  };

  const done = info?.status === "sent";
  const progress =
    target && info ? Math.max(0, info.sent_count - target.before) : 0;

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="text-xs text-red-400">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-xs text-emerald-300">
          {notice}
        </p>
      )}

      {sending ? (
        <div role="status" aria-live="polite">
          <p className="text-sm font-medium text-white">Sending…</p>
          {target && (
            <>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-800">
                <div
                  className="h-full bg-purple-500 transition-all"
                  style={{
                    width: `${Math.min(100, (progress / target.queued) * 100)}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                {progress} of {target.queued} sent
              </p>
            </>
          )}
          <p className="mt-2 text-xs text-gray-500">
            You can leave this page. Sending carries on.
          </p>
        </div>
      ) : (
        <>
          {done && info && (
            <p className="text-xs text-gray-400">
              Sent to {info.sent_count}{" "}
              {info.sent_count === 1 ? "person" : "people"}
              {info.sent_at &&
                ` · last on ${format(new Date(info.sent_at), "d MMM yyyy, HH:mm")}`}
              .
              {info.recipients_count > info.sent_count &&
                ` ${info.recipients_count - info.sent_count} failed.`}
            </p>
          )}
          {hasUnsavedChanges && (
            <p className="text-xs text-amber-300">
              Save your changes before sending.
            </p>
          )}
          <button
            type="button"
            className={`${button("primary")} w-full`}
            disabled={hasUnsavedChanges || !subject.trim()}
            onClick={() => setOpen(true)}
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            {done ? "Send to more people" : "Choose recipients & send"}
          </button>
          <button
            type="button"
            className={`${button("secondary")} w-full`}
            disabled={hasUnsavedChanges || testing}
            onClick={sendTest}
          >
            {testing ? "Sending test…" : "Send me a test copy"}
          </button>
        </>
      )}

      {open && (
        <RecipientDialog
          newsletterId={newsletterId}
          subject={subject}
          onClose={() => setOpen(false)}
          onStarted={started}
        />
      )}
    </div>
  );
}
