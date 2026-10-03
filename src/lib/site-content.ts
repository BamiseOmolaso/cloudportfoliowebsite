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
