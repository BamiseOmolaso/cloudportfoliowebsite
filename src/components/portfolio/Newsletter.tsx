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
export default function Newsletter() {
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
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.requiresCaptcha) {
        setStatus("captcha");
        return;
      }
      if (!res.ok) throw new Error(data?.error || "Failed to subscribe");
      setStatus("done");
      setMessage(newsletter.success);
      setEmail("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to subscribe");
    }
  };

  return (
    <form className="news" onSubmit={submit}>
      <h3>{newsletter.title}</h3>
      <p>{newsletter.body}</p>
      <div className="news-row">
        <label className="sr-only" htmlFor="pf-news-email">
          Email address
        </label>
        <input
          id="pf-news-email"
          type="email"
          required
          autoComplete="email"
          placeholder={newsletter.placeholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button
          className="btn primary"
          type="submit"
          disabled={status === "sending"}
        >
          {status === "sending" ? "Subscribing…" : newsletter.button}
        </button>
      </div>
      <p className="news-msg" role="status" aria-live="polite">
        {status === "captcha" ? (
          <>
            {newsletter.captcha}{" "}
            <Link href="/newsletter">{newsletter.captchaLink}</Link>
          </>
        ) : (
          message
        )}
      </p>
    </form>
  );
}
