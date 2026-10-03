/** @jest-environment node */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const update = jest.fn<(...a: unknown[]) => Promise<unknown>>();
jest.mock("@/lib/db", () => ({ db: { newsletterSubscriber: { update } } }));
jest.mock("@/lib/api-security", () => ({
  secureAdminRoute: (handler: (...a: unknown[]) => unknown) => (req: unknown) =>
    handler(req, { id: "1", email: "a@b.c", role: "admin" }),
  handleError: (_e: unknown, message: string) =>
    new Response(JSON.stringify({ error: message }), { status: 500 }),
  mapPrismaError: (e: { code?: string }) =>
    e?.code === "P2025"
      ? { message: "Record not found", status: 404 }
      : { message: "An error occurred", status: 500 },
}));

let PATCH: (typeof import("@/app/api/admin/subscribers/[id]/route"))["PATCH"];
beforeAll(async () => {
  ({ PATCH } = await import("@/app/api/admin/subscribers/[id]/route"));
});
beforeEach(() => {
  jest.clearAllMocks();
  update.mockResolvedValue({});
});

const patch = (body: unknown) =>
  PATCH(
    new Request("http://x", {
      method: "PATCH",
      body: JSON.stringify(body),
    }) as never,
    {
      params: Promise.resolve({ id: "s1" }),
    },
  );

describe("PATCH /api/admin/subscribers/[id]", () => {
  it("saves a trimmed name", async () => {
    const res = await patch({ name: "  Ada  " });
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { name: "Ada" },
    });
  });

  it("clears the name when it is empty", async () => {
    await patch({ name: "" });
    expect(update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { name: null },
    });
  });

  it("refuses markup and over-long names", async () => {
    expect((await patch({ name: "<b>Ada</b>" })).status).toBe(400);
    expect((await patch({ name: "x".repeat(101) })).status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("answers 404 for a subscriber that does not exist", async () => {
    update.mockRejectedValue({ code: "P2025" });
    expect((await patch({ name: "Ada" })).status).toBe(404);
  });
});
