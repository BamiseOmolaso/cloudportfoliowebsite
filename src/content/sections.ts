/**
 * Which sections each public page is made of, in their default order, and how the admin
 * panel's choices (show / hide, move up / down) are applied to them.
 *
 * The choice for a page is stored as one row in `site_content`: key "layout.<page>", value
 * a JSON list such as [{"id":"work","visible":false},{"id":"tools","visible":true}]. The
 * list's order is the page's order. No row means "the default order, everything shown".
 * Sections that are pinned (the page's opening) always come first and are always shown.
 */

export type PageKey = "home" | "about" | "learning";

export interface SectionDef {
  id: string;
  label: string;
  description: string;
  /** Stays at the top of the page, shown, and cannot be moved or hidden. */
  pinned?: boolean;
}

export const SECTIONS: Record<PageKey, SectionDef[]> = {
  home: [
    {
      id: "hero",
      label: "Hero",
      description: "The headline, intro and the two buttons.",
      pinned: true,
    },
    {
      id: "tools",
      label: "Technical tools",
      description: "The moving row of tool logos.",
    },
    { id: "results", label: "Numbers", description: "The headline figures." },
    {
      id: "work",
      label: "Projects",
      description: "The three featured projects.",
    },
    {
      id: "platform",
      label: "The platform",
      description: "This site's platform, with its diagram and three steps.",
    },
    {
      id: "pipeline",
      label: "Commit to production",
      description: "The deployment pipeline you can run.",
    },
    {
      id: "patterns",
      label: "Infrastructure patterns",
      description: "Two patterns, with a link to the rest.",
    },
    {
      id: "posts",
      label: "Latest posts",
      description: "The newest blog posts.",
    },
    { id: "youtube", label: "YouTube", description: "The teaching channel." },
    {
      id: "contact",
      label: "Contact",
      description: "The closing call to action and copy-email button.",
    },
  ],
  about: [
    {
      id: "record",
      label: "Experience and certifications",
      description: "Where I have worked and what I hold.",
    },
    {
      id: "clinical",
      label: "Why a doctor",
      description: "The clinical habits that carry into operations.",
    },
    {
      id: "contact",
      label: "Contact",
      description: "The closing call to action.",
    },
  ],
  learning: [
    {
      id: "journey",
      label: "Terraform journey",
      description: "From one server to a production stack.",
    },
    {
      id: "patterns",
      label: "Infrastructure patterns",
      description: "Every pattern, drawn.",
    },
  ],
};

export const PAGE_KEYS = Object.keys(SECTIONS) as PageKey[];
export const isPageKey = (v: string): v is PageKey =>
  (PAGE_KEYS as string[]).includes(v);

export const layoutKey = (page: PageKey) => `layout.${page}`;

export interface SectionState {
  id: string;
  visible: boolean;
}

/** Turn a stored value (JSON text, or already parsed) into a list of entries, ignoring anything malformed. */
function entriesOf(stored: unknown): SectionState[] {
  let value = stored;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value.flatMap((e) =>
    e && typeof e === "object" && typeof (e as SectionState).id === "string"
      ? [
          {
            id: (e as SectionState).id,
            visible: (e as SectionState).visible !== false,
          },
        ]
      : [],
  );
}

/**
 * The page's sections in the order to show them, each with whether to show it. Pinned
 * sections come first and are always visible. Unknown or repeated ids in the stored value
 * are dropped, and a section the stored value does not mention (one added to the site
 * since) goes at the end, shown.
 */
export function resolveSections(
  page: PageKey,
  stored?: unknown,
): SectionState[] {
  const defs = SECTIONS[page];
  const known = new Map(defs.map((d) => [d.id, d]));
  const pinned = defs
    .filter((d) => d.pinned)
    .map((d) => ({ id: d.id, visible: true }));

  const seen = new Set(pinned.map((p) => p.id));
  const ordered: SectionState[] = [];
  for (const e of entriesOf(stored)) {
    if (!known.has(e.id) || seen.has(e.id)) continue;
    seen.add(e.id);
    ordered.push(e);
  }
  for (const d of defs) {
    if (!seen.has(d.id)) ordered.push({ id: d.id, visible: true });
  }
  return [...pinned, ...ordered];
}

export const isDefaultLayout = (
  page: PageKey,
  layout: SectionState[],
): boolean => {
  const base = resolveSections(page);
  return (
    base.length === layout.length &&
    base.every(
      (b, i) => b.id === layout[i].id && b.visible === layout[i].visible,
    )
  );
};

/** Is a section currently shown on a page? */
export const isShown = (layout: SectionState[], id: string): boolean =>
  layout.find((s) => s.id === id)?.visible ?? false;
