import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  secureAdminRoute,
  handleError,
  mapPrismaError,
} from "@/lib/api-security";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  // Empty clears the name. Angle brackets are refused: a name is shown in emails.
  name: z
    .string()
    .trim()
    .max(100)
    .regex(/^[^<>]*$/, "Names cannot contain < or >"),
});

/** Set or correct a subscriber's name (most people on the list signed up before names were asked for). */
async function patchHandler(request: NextRequest, id: string) {
  try {
    const { name } = patchSchema.parse(await request.json());
    await db.newsletterSubscriber.update({
      where: { id },
      data: { name: name || null },
    });
    return NextResponse.json({ ok: true, name: name || null });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? "Invalid name" },
        { status: 400 },
      );
    }
    const mapped = mapPrismaError(error);
    if (mapped.status !== 500)
      return NextResponse.json(
        { error: mapped.message },
        { status: mapped.status },
      );
    return handleError(error, "Failed to update the subscriber");
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return secureAdminRoute((req) => patchHandler(req, id))(request);
}
