"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { contact, profile } from "@/content/portfolio";

/** The closing call to action, with a copy-email button, and the footer. */
export default function Contact({
  content = contact,
}: {
  content?: typeof contact;
}) {
  const emailRef = useRef<HTMLElement>(null);
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      setState("copied");
    } catch {
      // Clipboard blocked (older browser, insecure context): select the text
      // so the visitor can copy it themselves.
      const el = emailRef.current;
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      setState("manual");
    }
    window.setTimeout(() => setState("idle"), 1800);
  };

  return (
    <section className="block" id="contact" style={{ paddingBottom: "1rem" }}>
      <div className="contact rise">
        <h2>{content.title}</h2>
        <p>{content.body}</p>
        <div className="mail">
          <code ref={emailRef}>{profile.email}</code>
          <button className="btn primary" type="button" onClick={copy}>
            {state === "copied"
              ? content.copiedLabel
              : state === "manual"
                ? "Press Ctrl+C"
                : content.copyLabel}
          </button>
          <Link className="btn" href={content.formHref}>
            {content.formLabel}
          </Link>
        </div>
        <div className="links">
          {content.links.map((l) => (
            <a
              className="btn"
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {l.label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
