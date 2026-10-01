"use client";

import { useRef, useState } from "react";
import { contact, profile } from "@/content/portfolio";

/** The closing call to action, with a copy-email button, and the footer. */
export default function Contact() {
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
        <span className="label">{contact.label}</span>
        <h2>{contact.title}</h2>
        <p>{contact.body}</p>
        <div className="mail">
          <code ref={emailRef}>{profile.email}</code>
          <button className="btn primary" type="button" onClick={copy}>
            {state === "copied"
              ? contact.copiedLabel
              : state === "manual"
                ? "Press Ctrl+C"
                : contact.copyLabel}
          </button>
        </div>
        <div className="links">
          {contact.links.map((l) => (
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
      <footer>
        <span>{profile.fullName}</span>
        <span>{profile.location}</span>
      </footer>
    </section>
  );
}
