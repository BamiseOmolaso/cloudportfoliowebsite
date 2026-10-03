import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { secureAdminRoute, handleError } from "@/lib/api-security";
import { EDITABLE_PAGES, pagePaths } from "@/content/editable";

export const dynamic = "force-dynamic";

/** The editable pages, each with how many of its fields have been edited. */
export const GET = secureAdminRoute(async () => {
  try {
    const rows = await db.siteContent.findMany({ select: { key: true } });
    const edited = new Set(rows.map((r) => r.key));
    return NextResponse.json(
      EDITABLE_PAGES.map((page) => {
        const paths = pagePaths(page);
        return {
          id: page.id,
          title: page.title,
          href: page.href,
          description: page.description,
          fields: paths.size,
          edited: Array.from(paths).filter((p) => edited.has(p)).length,
        };
      }),
    );
  } catch (error) {
    return handleError(error, "Failed to load pages");
  }
});
