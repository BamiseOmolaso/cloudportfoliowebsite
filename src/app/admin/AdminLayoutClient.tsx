"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Briefcase,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  Mail,
  Menu,
  MessageSquare,
  PenLine,
  Users,
  type LucideIcon,
} from "lucide-react";

const GROUPS: {
  label: string;
  items: { name: string; href: string; exact?: boolean; icon: LucideIcon }[];
}[] = [
  {
    label: "Content",
    items: [
      { name: "Overview", href: "/admin", exact: true, icon: LayoutDashboard },
      { name: "Pages", href: "/admin/pages", icon: FileText },
      { name: "Blog", href: "/admin/blog", icon: PenLine },
      { name: "Projects", href: "/admin/projects", icon: Briefcase },
      { name: "Media", href: "/admin/media", icon: ImageIcon },
    ],
  },
  {
    label: "Audience",
    items: [
      { name: "Messages", href: "/admin/messages", icon: MessageSquare },
      { name: "Subscribers", href: "/admin/subscribers", icon: Users },
      { name: "Newsletters", href: "/admin/newsletters", icon: Mail },
    ],
  },
  {
    label: "Site",
    items: [
      { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    ],
  },
];

export default function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? "";

  const isActive = (href: string, exact?: boolean) =>
    exact
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  const nav = (
    <nav
      aria-label="Admin"
      className="flex-1 space-y-6 overflow-y-auto px-3 py-5"
    >
      {GROUPS.map((g) => (
        <div key={g.label}>
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            {g.label}
          </p>
          <ul className="space-y-1">
            {g.items.map((item) => {
              const active = isActive(
                item.href,
                "exact" in item ? item.exact : false,
              );
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-purple-500/15 text-white"
                        : "text-gray-400 hover:bg-gray-800 hover:text-white"
                    }`}
                  >
                    <item.icon
                      className="h-5 w-5 shrink-0"
                      aria-hidden="true"
                    />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const brand = (
    <div className="flex h-16 items-center justify-between border-b border-gray-800 px-5">
      <Link href="/admin" className="text-base font-bold text-white">
        Site admin
      </Link>
      <Link
        href="/"
        target="_blank"
        className="text-xs font-medium text-gray-400 hover:text-white"
      >
        View site ↗
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Wide screens: a fixed sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-gray-800 bg-gray-900 lg:flex">
        {brand}
        {nav}
      </aside>

      {/* Phones: a top bar and a slide-over menu */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-800 bg-gray-900 px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 text-gray-300 hover:bg-gray-800"
          aria-label="Open the admin menu"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
        <span className="font-bold text-white">Site admin</span>
        <Link href="/" target="_blank" className="text-xs text-gray-400">
          View site ↗
        </Link>
      </div>
      {open && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Close the admin menu"
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <div className="relative flex h-full w-72 max-w-[85vw] flex-col bg-gray-900">
            {brand}
            {nav}
          </div>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
