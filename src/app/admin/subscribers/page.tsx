"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Check, Download, Pencil, X } from "lucide-react";
import {
  Card,
  EmptyState,
  ErrorBanner,
  PageHeader,
  StatusBadge,
  button,
  inputClass,
} from "@/components/admin/ui";

interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  is_subscribed: boolean;
  unsubscribe_reason: string | null;
  unsubscribe_feedback: string | null;
  created_at: string;
  subscribed_at: string;
  unsubscribed_at: string | null;
  status: "subscribed" | "pending" | "unsubscribed";
  confirmed_at: string | null;
  subscription_count: number;
  confirmation_sent_at: string | null;
  location?: string | null;
}

type Filter = "all" | "subscribed" | "pending" | "unsubscribed";

const REASONS: Record<string, string> = {
  too_many_emails: "Too many emails",
  not_relevant: "Content not relevant",
  not_interesting: "Content not interesting",
  bounced: "Address does not exist",
  complained: "Reported as spam",
  other: "Other reason",
};

/** A spreadsheet treats a cell starting with = + - or @ as a formula, so defuse it. */
const csvCell = (value: string) => {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

const day = (iso: string) => format(new Date(iso), "d MMM yyyy");
const dayTime = (iso: string) => format(new Date(iso), "d MMM yyyy, HH:mm");
/** Joined again later (they had unsubscribed and signed up once more). */
const rejoined = (s: Subscriber) => s.subscription_count > 1;

/** A name that can be corrected in place: most people signed up before names were asked for. */
function NameCell({
  subscriber,
  onSaved,
  onError,
}: {
  subscriber: Subscriber;
  onSaved: (name: string | null) => void;
  onError: (message: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(subscriber.name ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/subscribers/${subscriber.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save the name");
      onSaved(data.name);
      setEditing(false);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Could not save the name");
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <form
        className="flex items-center gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <input
          autoFocus
          value={value}
          maxLength={100}
          aria-label={`First name for ${subscriber.email}`}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
          className={`${inputClass} !py-1.5`}
        />
        <button
          type="submit"
          disabled={saving}
          aria-label="Save name"
          className="rounded p-1.5 text-emerald-300 hover:bg-gray-800"
        >
          <Check className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          aria-label="Cancel"
          className="rounded p-1.5 text-gray-400 hover:bg-gray-800"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setValue(subscriber.name ?? "");
        setEditing(true);
      }}
      className="group flex items-center gap-1.5 text-left"
      aria-label={`Edit the name of ${subscriber.email}`}
    >
      {subscriber.name ? (
        <span className="text-gray-200">{subscriber.name}</span>
      ) : (
        <span className="text-gray-500">Add name</span>
      )}
      <Pencil
        className="h-3.5 w-3.5 text-gray-500 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        aria-hidden="true"
      />
    </button>
  );
}

export default function SubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/subscribers");
      if (!res.ok) throw new Error("Could not load the subscribers");
      setSubscribers((await res.json()) ?? []);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load the subscribers",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const n = (status: Subscriber["status"]) =>
      subscribers.filter((s) => s.status === status).length;
    return {
      all: subscribers.length,
      subscribed: n("subscribed"),
      pending: n("pending"),
      unsubscribed: n("unsubscribed"),
    };
  }, [subscribers]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return subscribers.filter(
      (s) =>
        (filter === "all" || filter === s.status) &&
        (!q ||
          s.email.toLowerCase().includes(q) ||
          (s.name ?? "").toLowerCase().includes(q)),
    );
  }, [subscribers, filter, query]);

  const withoutName = subscribers.filter(
    (s) => s.status === "subscribed" && !s.name,
  ).length;

  const exportCsv = () => {
    const rows = [
      [
        "Email",
        "First name",
        "Status",
        "Location",
        "Joined",
        "Last subscribed",
        "Unsubscribed on",
        "Unsubscribe reason",
        "Feedback",
      ],
      ...shown.map((s) => [
        s.email,
        s.name ?? "",
        s.status === "subscribed"
          ? "Subscribed"
          : s.status === "pending"
            ? "Waiting to confirm"
            : "Unsubscribed",
        s.location ?? "",
        format(new Date(s.created_at), "yyyy-MM-dd HH:mm"),
        format(new Date(s.subscribed_at), "yyyy-MM-dd HH:mm"),
        s.unsubscribed_at
          ? format(new Date(s.unsubscribed_at), "yyyy-MM-dd HH:mm")
          : "",
        s.unsubscribe_reason
          ? (REASONS[s.unsubscribe_reason] ?? s.unsubscribe_reason)
          : "",
        s.unsubscribe_feedback ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscribers-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const tabs: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "subscribed", label: "Subscribed" },
    { id: "pending", label: "Waiting to confirm" },
    { id: "unsubscribed", label: "Unsubscribed" },
  ];

  return (
    <>
      <PageHeader
        title="Subscribers"
        subtitle="People who signed up for the newsletter. Their first name is used to greet them in each email."
        actions={
          <button
            type="button"
            className={button("primary")}
            onClick={exportCsv}
            disabled={shown.length === 0}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Export CSV
          </button>
        }
      />
      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total", value: counts.all },
          { label: "Subscribed", value: counts.subscribed },
          { label: "Waiting to confirm", value: counts.pending },
          { label: "Unsubscribed", value: counts.unsubscribed },
        ].map((t) => (
          <Card key={t.label} className="p-5">
            <p className="text-sm text-gray-400">{t.label}</p>
            <p className="mt-2 text-3xl font-bold text-white">
              {loading ? "–" : t.value}
            </p>
          </Card>
        ))}
      </div>

      {!loading && withoutName > 0 && (
        <p className="mb-4 text-sm text-gray-400">
          {withoutName}{" "}
          {withoutName === 1 ? "subscriber has" : "subscribers have"} no first
          name yet, so they are greeted as &ldquo;there&rdquo;. Click a name to
          add one.
        </p>
      )}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 p-3">
          <div
            role="tablist"
            aria-label="Filter by status"
            className="flex flex-wrap gap-1"
          >
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={filter === t.id}
                onClick={() => setFilter(t.id)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === t.id
                    ? "bg-purple-500/15 text-white"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
              >
                {t.label}
                <span className="ml-1.5 text-xs text-gray-500">
                  {counts[t.id]}
                </span>
              </button>
            ))}
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by email or name"
            aria-label="Search subscribers"
            className={`${inputClass} sm:max-w-xs`}
          />
        </div>

        {loading ? (
          <div className="h-48 animate-pulse" aria-busy="true" />
        ) : shown.length === 0 ? (
          <EmptyState
            title={
              subscribers.length === 0 ? "No subscribers yet" : "No one matches"
            }
            body={
              subscribers.length === 0
                ? "When someone signs up with the newsletter form, they appear here."
                : "Try another tab or clear the search."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    First name
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Email
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Joined
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Unsubscribed
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {shown.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3">
                      <NameCell
                        subscriber={s}
                        onError={setError}
                        onSaved={(name) =>
                          setSubscribers((prev) =>
                            prev.map((x) =>
                              x.id === s.id ? { ...x, name } : x,
                            ),
                          )
                        }
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{s.email}</p>
                      {s.location && (
                        <p className="text-xs text-gray-500">{s.location}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={
                          s.status === "subscribed"
                            ? "published"
                            : s.status === "pending"
                              ? "scheduled"
                              : "draft"
                        }
                        label={
                          s.status === "pending" ? "waiting" : s.status
                        }
                      />
                      {s.status === "pending" && s.confirmation_sent_at && (
                        <p className="mt-1 text-xs text-gray-500">
                          email sent {day(s.confirmation_sent_at)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      <span title={dayTime(s.created_at)}>
                        {day(s.created_at)}
                      </span>
                      {rejoined(s) && (
                        <p
                          className="text-xs text-gray-500"
                          title={dayTime(s.subscribed_at)}
                        >
                          rejoined {day(s.subscribed_at)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {s.unsubscribed_at ? (
                        <>
                          <span title={dayTime(s.unsubscribed_at)}>
                            {day(s.unsubscribed_at)}
                          </span>
                          {s.unsubscribe_reason && (
                            <p
                              className="text-xs text-gray-500"
                              title={s.unsubscribe_feedback ?? undefined}
                            >
                              {REASONS[s.unsubscribe_reason] ??
                                s.unsubscribe_reason}
                            </p>
                          )}
                        </>
                      ) : (
                        "–"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
