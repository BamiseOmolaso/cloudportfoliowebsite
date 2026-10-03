"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Card,
  EmptyState,
  ErrorBanner,
  PageHeader,
  StatusBadge,
  button,
} from "@/components/admin/ui";

interface Message {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  read: boolean;
  replied: boolean;
  created_at: string;
}

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/messages");
      if (!res.ok) throw new Error("Could not load messages");
      setMessages(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load messages");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const patch = async (
    m: Message,
    change: Partial<Pick<Message, "read" | "replied">>,
  ) => {
    setMessages((prev) =>
      prev.map((x) => (x.id === m.id ? { ...x, ...change } : x)),
    );
    const res = await fetch(`/api/admin/messages/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(change),
    });
    if (!res.ok) {
      setError("Could not update the message");
      load();
    }
  };

  const open = (m: Message) => {
    setOpenId(openId === m.id ? null : m.id);
    if (!m.read) patch(m, { read: true });
  };

  const remove = async (m: Message) => {
    if (!confirm(`Delete the message from ${m.name}? This cannot be undone.`))
      return;
    const res = await fetch(`/api/admin/messages/${m.id}`, {
      method: "DELETE",
    });
    if (res.ok) setMessages((prev) => prev.filter((x) => x.id !== m.id));
    else setError("Could not delete the message");
  };

  const unread = messages.filter((m) => !m.read).length;

  return (
    <>
      <PageHeader
        title="Messages"
        subtitle={
          unread > 0
            ? `${unread} unread. Sent through the contact form.`
            : "Sent through the contact form."
        }
      />
      {error && <ErrorBanner message={error} onRetry={load} />}
      <Card>
        {loading ? (
          <div className="h-40 animate-pulse" aria-busy="true" />
        ) : messages.length === 0 ? (
          <EmptyState
            title="No messages yet"
            body="When someone uses the contact form, their message appears here."
          />
        ) : (
          <ul className="divide-y divide-gray-800">
            {messages.map((m) => (
              <li key={m.id} className="px-4 py-3.5">
                <button
                  type="button"
                  onClick={() => open(m)}
                  aria-expanded={openId === m.id}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span
                        className={`truncate ${m.read ? "text-gray-300" : "font-semibold text-white"}`}
                      >
                        {m.name}
                      </span>
                      {!m.read && <StatusBadge status="new" />}
                      {m.replied && (
                        <StatusBadge status="published" label="replied" />
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-gray-500">
                      {m.subject || "No subject"} · {m.email}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-gray-500">
                    {format(new Date(m.created_at), "d MMM yyyy, HH:mm")}
                  </span>
                </button>
                {openId === m.id && (
                  <div className="mt-3 rounded-lg bg-gray-950 p-4">
                    <p className="whitespace-pre-wrap break-words text-sm text-gray-200">
                      {m.message}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <a
                        href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject || "your message"}`)}`}
                        className={button("primary")}
                        onClick={() =>
                          !m.replied && patch(m, { replied: true })
                        }
                      >
                        Reply by email
                      </a>
                      <button
                        type="button"
                        className={button("secondary")}
                        onClick={() => patch(m, { read: !m.read })}
                      >
                        Mark as {m.read ? "unread" : "read"}
                      </button>
                      <button
                        type="button"
                        className={button("secondary")}
                        onClick={() => patch(m, { replied: !m.replied })}
                      >
                        Mark as {m.replied ? "not replied" : "replied"}
                      </button>
                      <button
                        type="button"
                        className={button("danger")}
                        onClick={() => remove(m)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
