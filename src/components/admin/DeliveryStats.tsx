import type { ReactNode } from "react";

export interface Stats {
  total: number;
  accepted: number;
  failed: number;
  delivered: number;
  opened: number;
  notOpened: number;
  bounced: number;
  complained: number;
  waiting: number;
}

const pct = (n: number, of: number) =>
  of > 0 ? `${Math.round((n / of) * 100)}%` : "–";

/**
 * The counts for one newsletter. `compact` is the one-line version for the list; the
 * full version is the row of boxes on the report.
 */
export function StatChips({ stats }: { stats: Stats }) {
  const items: { label: string; value: number; tone: string }[] = [
    { label: "delivered", value: stats.delivered, tone: "text-emerald-300" },
    { label: "opened", value: stats.opened, tone: "text-purple-300" },
    { label: "not opened", value: stats.notOpened, tone: "text-gray-300" },
    { label: "bounced", value: stats.bounced, tone: "text-red-300" },
    { label: "failed", value: stats.failed, tone: "text-red-300" },
  ];
  if (stats.waiting > 0)
    items.push({
      label: "waiting",
      value: stats.waiting,
      tone: "text-amber-300",
    });
  return (
    <ul
      className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs"
      aria-label="Delivery summary"
    >
      {items.map((i) => (
        <li key={i.label} className="text-gray-500">
          <span
            className={`font-semibold ${i.value ? i.tone : "text-gray-500"}`}
          >
            {i.value}
          </span>{" "}
          {i.label}
        </li>
      ))}
    </ul>
  );
}

function Box({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: ReactNode;
  note?: string;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <p className="text-sm text-gray-400">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${tone}`}>{value}</p>
      {note && <p className="mt-1 text-xs text-gray-500">{note}</p>}
    </div>
  );
}

export function StatBoxes({ stats }: { stats: Stats }) {
  const sent = stats.total;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      <Box
        label="Sent"
        value={sent}
        note="people it was sent to"
        tone="text-white"
      />
      <Box
        label="Delivered"
        value={stats.delivered}
        note={`${pct(stats.delivered, sent)} of sent`}
        tone="text-emerald-300"
      />
      <Box
        label="Opened"
        value={stats.opened}
        note={`${pct(stats.opened, stats.delivered)} of delivered`}
        tone="text-purple-300"
      />
      <Box
        label="Not opened"
        value={stats.notOpened}
        note="delivered, not read yet"
        tone="text-gray-200"
      />
      <Box
        label="Bounced"
        value={stats.bounced}
        note="wrong or dead address"
        tone="text-red-300"
      />
      <Box
        label="Failed"
        value={stats.failed}
        note="refused when sending"
        tone="text-red-300"
      />
    </div>
  );
}
