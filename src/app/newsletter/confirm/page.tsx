"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { button } from "@/components/admin/ui";

type Status = "ready" | "working" | "done" | "error";

function ConfirmContent() {
  const token = useSearchParams().get("token");
  const [status, setStatus] = useState<Status>(token ? "ready" : "error");
  const [message, setMessage] = useState(
    token
      ? ""
      : "This confirmation link is not valid. Please use the link from your email.",
  );

  const confirm = async () => {
    setStatus("working");
    try {
      const res = await fetch("/api/newsletter/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error || "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }
      setStatus("done");
    } catch {
      setMessage("Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen py-20">
      <div className="mx-auto max-w-lg px-4">
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-8 text-center">
          {status === "done" ? (
            <>
              <h1 className="mb-3 text-3xl font-bold text-white">
                You&apos;re subscribed
              </h1>
              <p className="mb-8 text-gray-400">
                Thank you for confirming. A welcome email is on its way, and you
                can unsubscribe from any email I send.
              </p>
              <Link href="/" className={button("primary")}>
                Back to the site
              </Link>
            </>
          ) : status === "error" ? (
            <>
              <h1 className="mb-3 text-3xl font-bold text-white">
                Link not valid
              </h1>
              <p role="alert" className="mb-8 text-gray-400">
                {message}
              </p>
              <Link href="/newsletter" className={button("primary")}>
                Sign up again
              </Link>
            </>
          ) : (
            <>
              <h1 className="mb-3 text-3xl font-bold text-white">
                Confirm your subscription
              </h1>
              <p className="mb-8 text-gray-400">
                One click to finish. You will get my newsletter, and you can
                leave at any time.
              </p>
              <button
                type="button"
                onClick={confirm}
                disabled={status === "working"}
                className={button("primary")}
              >
                {status === "working"
                  ? "Confirming…"
                  : "Confirm my subscription"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmContent />
    </Suspense>
  );
}
