import type { ReactNode } from "react";

/** Small building blocks shared by every admin screen, so they look and behave alike. */

export const btn = {
  base: "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400",
  primary: "bg-purple-600 text-white hover:bg-purple-500",
  secondary:
    "border border-gray-700 bg-gray-800 text-gray-100 hover:bg-gray-700",
  ghost: "text-gray-300 hover:bg-gray-800 hover:text-white",
  danger: "text-red-400 hover:bg-red-500/10",
} as const;

export const button = (kind: keyof Omit<typeof btn, "base"> = "secondary") =>
  `${btn.base} ${btn[kind]}`;

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">{title}</h1>
        {subtitle && (
          <p className="mt-1 max-w-2xl text-sm text-gray-400">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-gray-800 bg-gray-900 ${className}`}
    >
      {children}
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  published: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/30",
  draft: "bg-gray-500/10 text-gray-300 ring-gray-500/30",
  scheduled: "bg-amber-500/10 text-amber-400 ring-amber-500/30",
  edited: "bg-purple-500/10 text-purple-300 ring-purple-500/30",
  new: "bg-sky-500/10 text-sky-300 ring-sky-500/30",
};

export function StatusBadge({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${
        STATUS_STYLE[status] ?? STATUS_STYLE.draft
      }`}
    >
      {label ?? status}
    </span>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="font-medium text-white">{title}</p>
      {body && (
        <p className="mx-auto mt-1 max-w-md text-sm text-gray-400">{body}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
    >
      <span>{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="font-medium underline"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500";
