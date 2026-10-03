import { cache } from "react";
import { db } from "@/lib/db";

/**
 * The text edited in the admin panel, as { path: text }. If the database cannot be
 * reached the site shows the text in the code, so a database problem never takes a
 * page down. Cached for the length of one request.
 */
export const getOverrides = cache(async (): Promise<Record<string, string>> => {
  try {
    const rows = await db.siteContent.findMany();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  } catch (error) {
    console.error("Could not read edited site text:", error);
    return {};
  }
});

import {
  layoutKey,
  resolveSections,
  type PageKey,
  type SectionState,
} from "@/content/sections";

/** A page's sections in the order the admin chose, from the edits already read for this request. */
export const layoutFor = (
  page: PageKey,
  overrides: Record<string, string>,
): SectionState[] => resolveSections(page, overrides[layoutKey(page)]);
