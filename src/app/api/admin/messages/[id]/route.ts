import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  secureAdminRoute,
  handleError,
  mapPrismaError,
} from "@/lib/api-security";

export const dynamic = "force-dynamic";

const patchSchema = z
  .object({ read: z.boolean().optional(), replied: z.boolean().optional() })
  .refine(
    (v) => v.read !== undefined || v.replied !== undefined,
    "Nothing to change",
  );

async function patchHandler(request: NextRequest, id: string) {
  try {
    const data = patchSchema.parse(await request.json());
    await db.contactMessage.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 },
      );
    }
    const mapped = mapPrismaError(error);
    if (mapped.status !== 500)
      return NextResponse.json(
        { error: mapped.message },
        { status: mapped.status },
      );
    return handleError(error, "Failed to update message");
  }
}

async function deleteHandler(id: string) {
  try {
    await db.contactMessage.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const mapped = mapPrismaError(error);
    if (mapped.status !== 500)
      return NextResponse.json(
        { error: mapped.message },
        { status: mapped.status },
      );
    return handleError(error, "Failed to delete message");
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return secureAdminRoute((req) => patchHandler(req, id))(request);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return secureAdminRoute(() => deleteHandler(id))(request);
}
