import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { secureAdminRoute, handleError } from "@/lib/api-security";
import { MAX_TEXT_LENGTH, pageById, pagePaths } from "@/content/editable";

export const dynamic = "force-dynamic";

const putSchema = z.object({
  // path -> new text. An empty string, or the default text, removes the edit.
  values: z.record(z.string().max(MAX_TEXT_LENGTH)),
});

/** One page's editable text: the default from the code, and the current edit if any. */
async function getHandler(pageId: string) {
  const page = pageById(pageId);
  if (!page)
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  try {
    const paths = Array.from(pagePaths(page));
    const rows = await db.siteContent.findMany({
      where: { key: { in: paths } },
    });
    const edits = new Map(rows.map((r) => [r.key, r.value]));
    return NextResponse.json({
      id: page.id,
      title: page.title,
      href: page.href,
      description: page.description,
      groups: page.groups.map((g) => ({
        title: g.title,
        fields: g.fields.map((f) => ({
          ...f,
          value: edits.get(f.path) ?? f.default,
          edited: edits.has(f.path),
        })),
      })),
    });
  } catch (error) {
    return handleError(error, "Failed to load page");
  }
}

async function putHandler(request: NextRequest, pageId: string) {
  const page = pageById(pageId);
  if (!page)
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  try {
    const { values } = putSchema.parse(await request.json());
    const allowed = pagePaths(page);
    const defaults = new Map(
      page.groups.flatMap((g) => g.fields.map((f) => [f.path, f.default])),
    );

    const unknown = Object.keys(values).filter((p) => !allowed.has(p));
    if (unknown.length > 0) {
      return NextResponse.json(
        { error: "Unknown field", fields: unknown },
        { status: 400 },
      );
    }

    const keep: { key: string; value: string }[] = [];
    const drop: string[] = [];
    for (const [key, raw] of Object.entries(values)) {
      // Plain text only: the pages show it as text, never as markup.
      // eslint-disable-next-line no-control-regex
      const value = raw
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
        .trim();
      if (value === "" || value === defaults.get(key)) drop.push(key);
      else keep.push({ key, value });
    }

    await db.$transaction([
      ...(drop.length
        ? [db.siteContent.deleteMany({ where: { key: { in: drop } } })]
        : []),
      ...keep.map(({ key, value }) =>
        db.siteContent.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        }),
      ),
    ]);
    return NextResponse.json({ saved: keep.length, reset: drop.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 },
      );
    }
    return handleError(error, "Failed to save page");
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ page: string }> },
) {
  const { page } = await params;
  return secureAdminRoute(() => getHandler(page))(request);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ page: string }> },
) {
  const { page } = await params;
  return secureAdminRoute((req) => putHandler(req, page))(request);
}
