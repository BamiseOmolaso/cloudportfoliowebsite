/** @jest-environment node */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const create = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const findMany = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const findUnique = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const remove = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const count = jest.fn<(...a: unknown[]) => Promise<number>>();
const putObject = jest.fn<(...a: unknown[]) => Promise<string>>();
const deleteObject = jest.fn<(...a: unknown[]) => Promise<void>>();
let mode = "r2";

jest.mock("@/lib/db", () => ({
  db: {
    mediaAsset: { create, findMany, findUnique, delete: remove },
    blogPost: { count },
    project: { count },
  },
}));
jest.mock("@/lib/storage", () => ({
  putObject: (...a: unknown[]) => putObject(...a),
  deleteObject: (...a: unknown[]) => deleteObject(...a),
  newKey: () => "uploads/2026/10/fixed.png",
  storageMode: () => mode,
}));
jest.mock("@/lib/api-security", () => ({
  secureAdminRoute: (handler: (...a: unknown[]) => unknown) => (req: unknown) =>
    handler(req, { id: "1", email: "a@b.c", role: "admin" }),
  handleError: (_e: unknown, message: string) =>
    new Response(JSON.stringify({ error: message }), { status: 500 }),
}));

let POST: (typeof import("@/app/api/admin/media/route"))["POST"];
let GET: (typeof import("@/app/api/admin/media/route"))["GET"];
let DELETE: (typeof import("@/app/api/admin/media/[id]/route"))["DELETE"];

beforeAll(async () => {
  ({ POST, GET } = await import("@/app/api/admin/media/route"));
  ({ DELETE } = await import("@/app/api/admin/media/[id]/route"));
});
beforeEach(() => {
  jest.clearAllMocks();
  deleteObject.mockResolvedValue(undefined);
  mode = "r2";
});

const PNG = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10, 0, 0, 0, 0,
]);
const upload = (data: Uint8Array | string, name = "pic.png") => {
  const form = new FormData();
  form.append("file", new File([data as BlobPart], name));
  return POST(
    new Request("http://x/api/admin/media", {
      method: "POST",
      body: form,
    }) as never,
  );
};

describe("POST /api/admin/media", () => {
  it("stores a real image and records it", async () => {
    putObject.mockResolvedValue(
      "https://media.example.com/uploads/2026/10/fixed.png",
    );
    create.mockResolvedValue({
      id: "abc",
      url: "https://media.example.com/uploads/2026/10/fixed.png",
      filename: "pic.png",
      contentType: "image/png",
      size: PNG.length,
      createdAt: new Date("2026-10-03T00:00:00Z"),
    });
    const res = await upload(PNG);
    expect(res.status).toBe(201);
    expect((await res.json()).url).toMatch(/fixed\.png$/);
    expect(putObject).toHaveBeenCalledWith(
      "uploads/2026/10/fixed.png",
      expect.any(Buffer),
      "image/png",
    );
    expect(create).toHaveBeenCalled();
  });

  it("refuses a file that is not an image, whatever its name", async () => {
    const res = await upload(
      "<svg><script>alert(1)</script></svg>",
      "evil.png",
    );
    expect(res.status).toBe(415);
    expect(putObject).not.toHaveBeenCalled();
  });

  it("refuses a request with no file", async () => {
    const res = await POST(
      new Request("http://x", {
        method: "POST",
        body: new FormData(),
      }) as never,
    );
    expect(res.status).toBe(400);
  });

  it("refuses an image over 5 MB", async () => {
    const big = new Uint8Array(5 * 1024 * 1024 + 1);
    big.set(PNG);
    expect((await upload(big)).status).toBe(413);
    expect(putObject).not.toHaveBeenCalled();
  });

  it("says so when storage is not set up", async () => {
    mode = "none";
    const res = await upload(PNG);
    expect(res.status).toBe(503);
  });

  it("removes the stored file if recording it fails", async () => {
    putObject.mockResolvedValue("u");
    create.mockRejectedValue(new Error("db down"));
    const res = await upload(PNG);
    expect(res.status).toBe(500);
    expect(deleteObject).toHaveBeenCalledWith("uploads/2026/10/fixed.png");
  });
});

describe("GET /api/admin/media", () => {
  it("lists images with how many posts and projects use each", async () => {
    findMany.mockResolvedValue([
      {
        id: "1",
        url: "u1",
        filename: "a.png",
        contentType: "image/png",
        size: 5,
        createdAt: new Date("2026-10-03"),
      },
    ]);
    count.mockResolvedValueOnce(2).mockResolvedValueOnce(1);
    const body = await (await GET(new Request("http://x") as never)).json();
    expect(body.storage).toBe("r2");
    expect(body.assets[0].used_in).toBe(3);
  });
});

describe("DELETE /api/admin/media/[id]", () => {
  const call = (id: string) =>
    DELETE(new Request("http://x", { method: "DELETE" }) as never, {
      params: Promise.resolve({ id }),
    });

  it("deletes the file from storage and the row", async () => {
    findUnique.mockResolvedValue({ id: "1", key: "uploads/k.png" });
    remove.mockResolvedValue({});
    expect((await call("1")).status).toBe(200);
    expect(deleteObject).toHaveBeenCalledWith("uploads/k.png");
    expect(remove).toHaveBeenCalledWith({ where: { id: "1" } });
  });

  it("answers 404 for an image that is not there", async () => {
    findUnique.mockResolvedValue(null);
    expect((await call("nope")).status).toBe(404);
    expect(deleteObject).not.toHaveBeenCalled();
  });
});
