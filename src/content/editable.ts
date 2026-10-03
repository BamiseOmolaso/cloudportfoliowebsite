/**
 * Which pieces of site text can be edited in the admin panel, and how they are found.
 *
 * The text itself lives in `portfolio.ts` (the default). An edit is stored in the
 * database as one row per field, keyed by its dotted path ("homeHero.intro",
 * "terraformJourney.steps.0.title"). `withOverrides` lays the edits over the defaults.
 * Links, addresses, logos and layout choices are not listed here, so they cannot be
 * changed from the admin panel.
 */
import {
  certifications,
  clinical,
  contact,
  experience,
  hero,
  homeHero,
  newsletter,
  patterns,
  patternsSection,
  platformFeature,
  profile,
  record,
  terraformJourney,
  work,
} from "./portfolio";

export type PageId = "home" | "about" | "learning" | "contact";

export interface EditableField {
  path: string;
  label: string;
  kind: "text" | "textarea";
  default: string;
}

export interface EditableGroup {
  title: string;
  fields: EditableField[];
}

export interface EditablePage {
  id: PageId;
  title: string;
  /** Where the page is on the live site. */
  href: string;
  description: string;
  groups: EditableGroup[];
}

/** Keys that hold links, layout choices or flags, never wording. */
const SKIP = new Set(["href", "formHref", "visual", "ok", "links"]);

/** The rows of a pattern's access-policy drawing are part of the picture, not wording. */
const SKIP_PATH = /^patterns\.\d+\.rows/;

const singular = (s: string) => (s.endsWith("s") ? s.slice(0, -1) : "Item");

const words = (s: string) =>
  s.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());

/** Collect every editable string under `value`, with a readable label. */
function walk(
  value: unknown,
  path: string,
  trail: string[],
  out: EditableField[],
  noun = "Item",
): void {
  if (SKIP_PATH.test(path)) return;
  if (typeof value === "string") {
    out.push({
      path,
      label: trail.join(" · "),
      kind: value.length > 90 ? "textarea" : "text",
      default: value,
    });
  } else if (Array.isArray(value)) {
    const name = trail.length ? singular(trail[trail.length - 1]) : noun;
    const base = trail.length ? trail.slice(0, -1) : trail;
    value.forEach((v, i) =>
      walk(v, `${path}.${i}`, [...base, `${name} ${i + 1}`], out),
    );
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (SKIP.has(k)) continue;
      walk(v, `${path}.${k}`, [...trail, words(k)], out);
    }
  }
}

/** The editable text under one root of the content file. */
function group(
  title: string,
  root: string,
  value: unknown,
  noun = "Item",
): EditableGroup {
  const fields: EditableField[] = [];
  const top =
    value && typeof value === "object" && !Array.isArray(value)
      ? Object.entries(value)
      : [["", value] as [string, unknown]];
  if (Array.isArray(value)) walk(value, root, [], fields, noun);
  else
    for (const [k, v] of top) {
      if (SKIP.has(k)) continue;
      walk(v, `${root}.${k}`, [words(k)], fields);
    }
  return { title, fields };
}

const one = (title: string, path: string, text: string): EditableGroup => ({
  title,
  fields: [{ path, label: "Text", kind: "text", default: text }],
});

export const EDITABLE_PAGES: EditablePage[] = [
  {
    id: "home",
    title: "Home",
    href: "/",
    description:
      "The landing page: headline, intro, button labels, and the heading of each section.",
    groups: [
      group("Headline", "hero", {
        headlineStart: hero.headlineStart,
        headlineEmphasis: hero.headlineEmphasis,
        headlineEnd: hero.headlineEnd,
      }),
      one("Job title above the headline", "profile.role", profile.role),
      group("Intro and buttons", "homeHero", homeHero),
      group("Projects section", "work", {
        title: work.title,
        intro: work.intro,
      }),
      group("Platform section", "platformFeature", platformFeature),
      group("Newsletter", "newsletter", newsletter),
    ],
  },
  {
    id: "about",
    title: "About",
    href: "/about",
    description:
      "Where I have worked, what I hold, and why a doctor. Headings, jobs and certifications.",
    groups: [
      group("Record heading", "record", record),
      group("Experience", "experience", experience, "Job"),
      group(
        "Certifications",
        "certifications",
        certifications,
        "Certification",
      ),
      group("Why a doctor", "clinical", clinical),
    ],
  },
  {
    id: "learning",
    title: "Learning",
    href: "/learning",
    description:
      "The Terraform journey from one server to a production stack, and the infrastructure patterns.",
    groups: [
      group("Terraform journey", "terraformJourney", terraformJourney),
      group("Patterns heading", "patternsSection", patternsSection),
      group("Patterns", "patterns", patterns, "Pattern"),
    ],
  },
  {
    id: "contact",
    title: "Contact",
    href: "/#contact",
    description:
      "The closing section shown on the home page and the About page.",
    groups: [group("Contact section", "contact", contact)],
  },
];

export const pageById = (id: string): EditablePage | undefined =>
  EDITABLE_PAGES.find((p) => p.id === id);

/** Every editable path on a page. */
export const pagePaths = (page: EditablePage): Set<string> =>
  new Set(page.groups.flatMap((g) => g.fields.map((f) => f.path)));

export const MAX_TEXT_LENGTH = 2000;

/** Every editable path on the site: the only paths an edit may ever change. */
const ALL_PATHS = new Set(
  EDITABLE_PAGES.flatMap((p) =>
    p.groups.flatMap((g) => g.fields.map((f) => f.path)),
  ),
);

/**
 * A copy of `defaults` (the object at `root` in the content file) with the edited
 * strings from `overrides` laid over it. Only paths that already hold a string are
 * replaced, so an edit can never change the shape of the content.
 */
export function withOverrides<T>(
  root: string,
  defaults: T,
  overrides: Record<string, string>,
): T {
  const copy = JSON.parse(JSON.stringify(defaults)) as T;
  const prefix = `${root}.`;
  for (const [path, text] of Object.entries(overrides)) {
    if (!path.startsWith(prefix) || !ALL_PATHS.has(path)) continue;
    const parts = path.slice(prefix.length).split(".");
    let node: unknown = copy;
    for (const part of parts.slice(0, -1)) {
      node = (node as Record<string, unknown> | undefined)?.[part];
      if (node === undefined || node === null) break;
    }
    const last = parts[parts.length - 1];
    if (
      node &&
      typeof node === "object" &&
      typeof (node as Record<string, unknown>)[last] === "string"
    ) {
      (node as Record<string, unknown>)[last] = text;
    }
  }
  return copy;
}
