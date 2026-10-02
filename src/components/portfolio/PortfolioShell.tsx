"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Theme = "dark" | "light";

const STORAGE_KEY = "pf-theme";

/** One list drives both the desktop bar and the phone menu. */
const NAV = [
  { label: "Work", href: "#work" },
  { label: "Stack", href: "#stack" },
  { label: "Pipeline", href: "#pipeline" },
  { label: "YouTube", href: "#youtube" },
  { label: "Blog", href: "/blog" },
  { label: "Projects", href: "/projects" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "#contact" },
] as const;

function NavLink({
  href,
  className,
  onClick,
  children,
}: {
  href: string;
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  // "/page" links go through the router; "#section" links stay on this page.
  return href.startsWith("/") ? (
    <Link className={className} href={href} onClick={onClick}>
      {children}
    </Link>
  ) : (
    <a className={className} href={href} onClick={onClick}>
      {children}
    </a>
  );
}

/**
 * Wrapper for the redesigned home page: scopes the `.pf` styles, owns the
 * theme (dark by default; the choice is remembered), and renders the fixed
 * header with its phone menu.
 *
 * `variant="bar"` renders ONLY the header, for the older pages (blog,
 * projects, ...). Those are styled for dark, so the bar stays dark and hides
 * the theme switch; its "#section" links point back at the home page.
 */
export default function PortfolioShell({
  className,
  variant = "page",
  children,
}: {
  /** Font CSS-variable classes from next/font (see app/fonts.ts). */
  className: string;
  variant?: "page" | "bar";
  children?: React.ReactNode;
}) {
  const bar = variant === "bar";
  const hrefFor = (href: string) =>
    bar && href.startsWith("#") ? `/${href}` : href;
  const [theme, setTheme] = useState<Theme>("dark");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLElement>(null);

  useEffect(() => {
    if (bar) return; // the older pages are dark only
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "dark" || saved === "light") setTheme(saved);
    } catch {
      // Storage can be blocked (private mode); the theme just isn't remembered.
    }
  }, [bar]);

  // While the phone menu is open: Escape closes it (and returns focus to its
  // button), widening the screen closes it, and focus starts on the first link.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        menuBtn.current?.focus();
      }
    };
    const wide = window.matchMedia("(min-width: 56rem)");
    const onWide = () => wide.matches && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    menu.current?.querySelector<HTMLElement>("a")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
    };
  }, [menuOpen]);

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // See above.
    }
  };

  return (
    <div
      id={bar ? undefined : "top"}
      className={`pf ${bar ? "pf-bar " : ""}${className}`}
      data-theme={theme}
    >
      <a className="skip" href={bar ? "#main" : "#proof"}>
        {bar ? "Skip to content" : "Skip the intro"}
      </a>
      <div
        className={`menu-backdrop${menuOpen ? " open" : ""}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />
      <header className="bar">
        <div className="bar-in">
          <a className="brand" href={bar ? "/" : "#top"}>
            <span className="mark">OO</span>
            Bamise Omolaso
          </a>
          <nav aria-label="Primary">
            {NAV.map((l) => (
              <NavLink className="link" href={hrefFor(l.href)} key={l.label}>
                {l.label}
              </NavLink>
            ))}
            {!bar && (
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
            )}
            <button
              ref={menuBtn}
              className="icon-btn menu-btn"
              type="button"
              aria-expanded={menuOpen}
              aria-controls="pf-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                {menuOpen ? (
                  <path d="M6 6l12 12M18 6L6 18" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" />
                )}
              </svg>
            </button>
          </nav>
        </div>
        <nav
          id="pf-menu"
          ref={menu}
          className="menu"
          aria-label="Menu"
          hidden={!menuOpen}
        >
          {NAV.map((l) => (
            <NavLink
              href={hrefFor(l.href)}
              key={l.label}
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </header>
      {children}
    </div>
  );
}
