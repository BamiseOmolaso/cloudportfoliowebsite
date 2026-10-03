import {
  SECTIONS,
  isDefaultLayout,
  isPageKey,
  isShown,
  layoutKey,
  resolveSections,
} from "@/content/sections";

const ids = (l: { id: string }[]) => l.map((s) => s.id);

describe("sections", () => {
  it("lists each section once per page, with the hero pinned first on Home", () => {
    for (const defs of Object.values(SECTIONS)) {
      expect(new Set(defs.map((d) => d.id)).size).toBe(defs.length);
    }
    expect(SECTIONS.home[0]).toMatchObject({ id: "hero", pinned: true });
    expect(SECTIONS.home.filter((d) => d.pinned)).toHaveLength(1);
  });

  it("knows which pages have sections and the storage key", () => {
    expect(isPageKey("home")).toBe(true);
    expect(isPageKey("contact")).toBe(false);
    expect(layoutKey("home")).toBe("layout.home");
  });
});

describe("resolveSections", () => {
  it("is the default order with everything shown when nothing is stored", () => {
    const l = resolveSections("home");
    expect(ids(l)).toEqual(SECTIONS.home.map((d) => d.id));
    expect(l.every((s) => s.visible)).toBe(true);
    expect(isDefaultLayout("home", l)).toBe(true);
  });

  it("applies a stored order and hidden sections", () => {
    const l = resolveSections("home", [
      { id: "work", visible: true },
      { id: "tools", visible: false },
    ]);
    expect(ids(l).slice(0, 3)).toEqual(["hero", "work", "tools"]);
    expect(l.find((s) => s.id === "tools")?.visible).toBe(false);
    expect(isDefaultLayout("home", l)).toBe(false);
  });

  it("accepts the stored value as JSON text", () => {
    const l = resolveSections(
      "learning",
      JSON.stringify([{ id: "patterns", visible: true }]),
    );
    expect(ids(l)).toEqual(["patterns", "journey"]);
  });

  it("keeps the pinned opening first and shown, whatever is stored", () => {
    const l = resolveSections("home", [
      { id: "work", visible: true },
      { id: "hero", visible: false },
    ]);
    expect(l[0]).toEqual({ id: "hero", visible: true });
    expect(ids(l).filter((i) => i === "hero")).toHaveLength(1);
  });

  it("drops unknown and repeated ids", () => {
    const l = resolveSections("about", [
      { id: "clinical", visible: true },
      { id: "nope", visible: true },
      { id: "clinical", visible: false },
    ]);
    expect(ids(l)).toEqual(["clinical", "record", "contact"]);
    expect(l[0].visible).toBe(true);
  });

  it("adds a section the stored value does not know about, at the end and shown", () => {
    const l = resolveSections("home", [{ id: "contact", visible: true }]);
    expect(ids(l)[1]).toBe("contact");
    expect(ids(l)).toHaveLength(SECTIONS.home.length);
    expect(l.at(-1)?.visible).toBe(true);
  });

  it("falls back to the default for broken stored values", () => {
    for (const bad of [
      "not json",
      "{}",
      42,
      null,
      [1, "x"],
      [{ visible: true }],
    ]) {
      expect(isDefaultLayout("home", resolveSections("home", bad))).toBe(true);
    }
  });

  it("treats a missing 'visible' as shown", () => {
    expect(resolveSections("about", [{ id: "record" }])[0].visible).toBe(true);
  });
});

describe("isShown", () => {
  it("says whether a section is on the page", () => {
    const l = resolveSections("home", [{ id: "contact", visible: false }]);
    expect(isShown(l, "contact")).toBe(false);
    expect(isShown(l, "work")).toBe(true);
    expect(isShown(l, "unknown")).toBe(false);
  });
});
