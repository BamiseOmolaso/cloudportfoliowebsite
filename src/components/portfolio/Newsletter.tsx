"use client";

import Link from "next/link";
import { useState } from "react";
import { newsletter } from "@/content/portfolio";

type Status = "idle" | "sending" | "done" | "error" | "captcha";

/**
 * The newsletter sign-up. It posts to the site's existing endpoint; if that
 * asks for a CAPTCHA (it does after repeated attempts) the visitor is sent
 * to the newsletter page, where the CAPTCHA lives.
 */
export default function Newsletter({
  content = newsletter,
}: {
  content?: typeof newsletter;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setMessage("");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.requiresCaptcha) {
        setStatus("captcha");
        return;
      }
      if (!res.ok) throw new Error(data?.error || "Failed to subscribe");
      setStatus("done");
      setMessage(content.success);
      setEmail("");
      setName("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to subscribe");
    }
  };

  return (
    <form className="news" onSubmit={submit}>
      <h3>{content.title}</h3>
      <p>{content.body}</p>
      <div className="news-row">
        <label className="sr-only" htmlFor="pf-news-name">
          First name
        </label>
        <input
          id="pf-news-name"
          type="text"
          autoComplete="given-name"
          maxLength={60}
          placeholder="First name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label className="sr-only" htmlFor="pf-news-email">
          Email address
        </label>
        <input
          id="pf-news-email"
          type="email"
          required
          autoComplete="email"
          placeholder={content.placeholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button
          className="btn primary"
          type="submit"
          disabled={status === "sending"}
        >
          {status === "sending" ? "Subscribing…" : content.button}
        </button>
      </div>
      <p className="news-msg" role="status" aria-live="polite">
        {status === "captcha" ? (
          <>
            {content.captcha}{" "}
            <Link href="/newsletter">{content.captchaLink}</Link>
          </>
        ) : (
          message
        )}
      </p>
    </form>
  );
}
