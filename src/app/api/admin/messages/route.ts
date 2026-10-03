import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { secureAdminRoute, handleError } from "@/lib/api-security";

export const dynamic = "force-dynamic";

/** Messages sent through the contact form, newest first. */
export const GET = secureAdminRoute(async () => {
  try {
    const messages = await db.contactMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    return NextResponse.json(
      messages.map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        subject: m.subject || "",
        message: m.message,
        read: m.read,
        replied: m.replied,
        created_at: m.createdAt.toISOString(),
      })),
    );
  } catch (error) {
    return handleError(error, "Failed to load messages");
  }
});
