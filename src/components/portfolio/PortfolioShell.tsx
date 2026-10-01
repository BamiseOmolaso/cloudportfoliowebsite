"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Theme = "dark" | "light";

const STORAGE_KEY = "pf-theme";

/**
 * Wrapper for the redesigned home page: scopes the `.pf` styles, owns the
 * theme (follows the visitor's system setting until they choose one, then
 * remembers it) and renders the fixed header.
 */
export default function PortfolioShell({
  className,
  children,
}: {
  /** Font CSS-variable classes from next/font (see app/preview/fonts.ts). */
  className: string;
  children: React.ReactNode;
}) {
  // null = follow the system setting.
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "dark" || saved === "light") setTheme(saved);
    } catch {
      // Storage can be blocked (private mode); the theme just isn't remembered.
    }
  }, []);

  const toggleTheme = () => {
    const systemIsLight = window.matchMedia(
      "(prefers-color-scheme: light)",
    ).matches;
    const current: Theme = theme ?? (systemIsLight ? "light" : "dark");
    const next: Theme = current === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // See above.
    }
  };

  return (
    <div id="top" className={`pf ${className}`} data-theme={theme ?? undefined}>
      <header className="bar">
        <div className="bar-in">
          <a className="brand" href="#top">
            <span className="mark">OO</span>
            Bamise Omolaso
          </a>
          <nav aria-label="Primary">
            <a className="link" href="#proof">
              Results
            </a>
            <a className="link" href="#pipeline">
              Pipeline
            </a>
            <a className="link" href="#patterns">
              Patterns
            </a>
            <a className="link" href="#record">
              Record
            </a>
            <Link className="link" href="/blog">
              Blog
            </Link>
            <Link className="link" href="/projects">
              Projects
            </Link>
            <a className="link" href="#contact">
              Contact
            </a>
            <button
              className="icon-btn"
              type="button"
              onClick={toggleTheme}
              aria-label="Switch colour theme"
              title="Switch colour theme"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="4.5" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
            </button>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
