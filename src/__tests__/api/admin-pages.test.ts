import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const findMany = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const deleteMany = jest.fn<(...a: unknown[]) => unknown>(() => "delete");
const upsert = jest.fn<(...a: unknown[]) => unknown>(() => "upsert");
const transaction = jest.fn<(...a: unknown[]) => Promise<unknown>>(
  async () => [],
);

jest.mock("@/lib/db", () => ({
  db: {
    siteContent: { findMany, deleteMany, upsert },
    $transaction: transaction,
  },
}));
// The sign-in and request-origin checks are tested elsewhere; here the handler runs as is.
jest.mock("@/lib/api-security", () => ({
  secureAdminRoute: (handler: (...a: unknown[]) => unknown) => (req: unknown) =>
    handler(req, { id: "1", email: "a@b.c", role: "admin" }),
  handleError: (_e: unknown, message: string) =>
    new Response(JSON.stringify({ error: message }), { status: 500 }),
}));

type Mod = typeof import("@/app/api/admin/pages/[page]/route");
let GET: Mod["GET"];
let PUT: Mod["PUT"];
let LIST: (typeof import("@/app/api/admin/pages/route"))["GET"];

beforeAll(async () => {
  ({ GET, PUT } = await import("@/app/api/admin/pages/[page]/route"));
  ({ GET: LIST } = await import("@/app/api/admin/pages/route"));
});
beforeEach(() => {
  jest.clearAllMocks();
});

const ctx = (page: string) => ({ params: Promise.resolve({ page }) });
const put = (page: string, values: Record<string, string>) =>
  PUT(
    new Request("http://x/api", {
      method: "PUT",
      body: JSON.stringify({ values }),
    }) as never,
    ctx(page),
  );

describe("GET /api/admin/pages", () => {
  it("counts the edited fields of each page", async () => {
    findMany.mockResolvedValue([{ key: "homeHero.intro" }]);
    const res = await LIST(new Request("http://x") as never);
    const body = await res.json();
    expect(body.map((p: { id: string }) => p.id)).toEqual([
      "home",
      "about",
      "learning",
      "contact",
    ]);
    expect(body[0].edited).toBe(1);
    expect(body[1].edited).toBe(0);
  });
});

describe("GET /api/admin/pages/[page]", () => {
  it("returns the default and the current text of each field", async () => {
    findMany.mockResolvedValue([{ key: "homeHero.intro", value: "Edited" }]);
    const res = await GET(new Request("http://x") as never, ctx("home"));
    const body = await res.json();
    const field = body.groups
      .flatMap((g: { fields: unknown[] }) => g.fields)
      .find((f: { path: string }) => f.path === "homeHero.intro");
    expect(field.value).toBe("Edited");
    expect(field.edited).toBe(true);
    expect(field.default).toMatch(/doctor turned cloud engineer/);
  });

  it("answers 404 for a page that does not exist", async () => {
    const res = await GET(new Request("http://x") as never, ctx("nope"));
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/admin/pages/[page]", () => {
  it("saves changed text", async () => {
    const res = await put("home", { "homeHero.intro": "  A new intro  " });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ saved: 1, reset: 0 });
    expect(upsert).toHaveBeenCalledWith({
      where: { key: "homeHero.intro" },
      update: { value: "A new intro" },
      create: { key: "homeHero.intro", value: "A new intro" },
    });
  });

  it("removes the edit when the text is empty or the same as the original", async () => {
    const res = await put("home", {
      "homeHero.intro": "",
      "homeHero.primaryCta": "See my work",
    });
    expect(await res.json()).toEqual({ saved: 0, reset: 2 });
    expect(deleteMany).toHaveBeenCalledWith({
      where: { key: { in: ["homeHero.intro", "homeHero.primaryCta"] } },
    });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("rejects a field that is not on the page", async () => {
    const res = await put("home", { "contact.title": "x" });
    expect(res.status).toBe(400);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("rejects text that is too long", async () => {
    const res = await put("home", { "homeHero.intro": "x".repeat(2001) });
    expect(res.status).toBe(400);
  });

  it("answers 404 for a page that does not exist", async () => {
    expect((await put("nope", {})).status).toBe(404);
  });
});
