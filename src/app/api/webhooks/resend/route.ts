export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  applyEvent,
  verifySignature,
  type ResendEvent,
} from "@/lib/resend-webhook";

/**
 * Where Resend reports delivered / opened / bounced / complained. Public on purpose
 * (Resend cannot sign in), so the signature is the only gate: without the right secret
 * nothing is read or recorded.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Webhook is not configured" },
      { status: 503 },
    );
  }

  const body = await request.text();
  const ok = verifySignature(
    secret,
    {
      id: request.headers.get("svix-id"),
      timestamp: request.headers.get("svix-timestamp"),
      signature: request.headers.get("svix-signature"),
    },
    body,
  );
  if (!ok)
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  let event: ResendEvent;
  try {
    event = JSON.parse(body) as ResendEvent;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const result = await applyEvent(event);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    // A 500 makes Resend retry later, which is what we want for a database hiccup.
    console.error("Resend webhook failed:", error);
    return NextResponse.json(
      { error: "Failed to record the event" },
      { status: 500 },
    );
  }
}
