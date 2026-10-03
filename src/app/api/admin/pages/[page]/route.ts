import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { secureAdminRoute, handleError } from "@/lib/api-security";
import { MAX_TEXT_LENGTH, pageById, pagePaths } from "@/content/editable";
import {
  SECTIONS,
  isDefaultLayout,
  isPageKey,
  layoutKey,
  resolveSections,
} from "@/content/sections";

export const dynamic = "force-dynamic";

const putSchema = z.object({
  // path -> new text. An empty string, or the default text, removes the edit.
  values: z.record(z.string().max(MAX_TEXT_LENGTH)).default({}),
  // The page's sections in the order to show them, each shown or hidden.
  layout: z
    .array(z.object({ id: z.string().max(40), visible: z.boolean() }))
    .max(40)
    .optional(),
});

/** One page's editable text (the default from the code, and the current edit if any) and its sections. */
async function getHandler(pageId: string) {
  const page = pageById(pageId);
  if (!page)
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  try {
    const paths = Array.from(pagePaths(page));
    const sectionPage = isPageKey(page.id) ? page.id : null;
    const rows = await db.siteContent.findMany({
      where: {
        key: { in: sectionPage ? [...paths, layoutKey(sectionPage)] : paths },
      },
    });
    const edits = new Map(rows.map((r) => [r.key, r.value]));
    return NextResponse.json({
      id: page.id,
      title: page.title,
      href: page.href,
      description: page.description,
      sections: sectionPage
        ? resolveSections(sectionPage, edits.get(layoutKey(sectionPage))).map(
            (s) => {
              const def = SECTIONS[sectionPage].find((d) => d.id === s.id);
              return {
                id: s.id,
                label: def?.label ?? s.id,
                description: def?.description ?? "",
                pinned: Boolean(def?.pinned),
                visible: s.visible,
              };
            },
          )
        : null,
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
    const { values, layout } = putSchema.parse(await request.json());
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

    // The order and visibility of sections: only for pages made of sections, only known ids.
    const layoutWrites = [];
    if (layout) {
      if (!isPageKey(page.id)) {
        return NextResponse.json(
          { error: "This page has no sections to arrange" },
          { status: 400 },
        );
      }
      const known = new Set(SECTIONS[page.id].map((d) => d.id));
      const bad = layout.filter((s) => !known.has(s.id)).map((s) => s.id);
      if (
        bad.length > 0 ||
        new Set(layout.map((s) => s.id)).size !== layout.length
      ) {
        return NextResponse.json(
          { error: "Unknown or repeated section", fields: bad },
          { status: 400 },
        );
      }
      // Pinned sections stay on top and shown, whatever was sent.
      const resolved = resolveSections(page.id, layout);
      const key = layoutKey(page.id);
      layoutWrites.push(
        isDefaultLayout(page.id, resolved)
          ? db.siteContent.deleteMany({ where: { key } })
          : db.siteContent.upsert({
              where: { key },
              update: { value: JSON.stringify(resolved) },
              create: { key, value: JSON.stringify(resolved) },
            }),
      );
    }

    await db.$transaction([
      ...layoutWrites,
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
    return NextResponse.json({
      saved: keep.length,
      reset: drop.length,
      layout: Boolean(layout),
    });
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
