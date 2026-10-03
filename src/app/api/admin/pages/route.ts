import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { secureAdminRoute, handleError } from "@/lib/api-security";
import { EDITABLE_PAGES, pagePaths } from "@/content/editable";
import { isPageKey, layoutKey, resolveSections } from "@/content/sections";

export const dynamic = "force-dynamic";

/** The editable pages: how many fields were edited, and how many sections are hidden or moved. */
export const GET = secureAdminRoute(async () => {
  try {
    const rows = await db.siteContent.findMany({
      select: { key: true, value: true },
    });
    const edited = new Set(rows.map((r) => r.key));
    const stored = new Map(rows.map((r) => [r.key, r.value]));
    return NextResponse.json(
      EDITABLE_PAGES.map((page) => {
        const paths = pagePaths(page);
        const sections = isPageKey(page.id)
          ? resolveSections(page.id, stored.get(layoutKey(page.id)))
          : [];
        return {
          id: page.id,
          title: page.title,
          href: page.href,
          description: page.description,
          fields: paths.size,
          edited: Array.from(paths).filter((p) => edited.has(p)).length,
          sections: sections.length,
          hidden: sections.filter((s) => !s.visible).length,
          arranged: isPageKey(page.id) && edited.has(layoutKey(page.id)),
        };
      }),
    );
  } catch (error) {
    return handleError(error, "Failed to load pages");
  }
});
