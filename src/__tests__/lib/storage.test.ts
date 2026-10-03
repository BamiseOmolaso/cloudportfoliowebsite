/** @jest-environment node */
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { deleteObject, newKey, putObject, storageMode } from "@/lib/storage";

const R2_VARS = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_MEDIA_BUCKET",
  "R2_MEDIA_PUBLIC_URL",
] as const;

const saved = { ...process.env };
const setEnv = (name: string, value: string | undefined) => {
  if (value === undefined)
    delete (process.env as Record<string, string | undefined>)[name];
  else (process.env as Record<string, string | undefined>)[name] = value;
};
afterEach(() => {
  for (const k of [...R2_VARS, "NODE_ENV"]) setEnv(k, saved[k]);
  jest.restoreAllMocks();
});

describe("storageMode", () => {
  it("uses R2 when every R2 setting is present", () => {
    for (const k of R2_VARS) setEnv(k, "x");
    expect(storageMode()).toBe("r2");
  });

  it("uses a local folder in development without R2 settings", () => {
    for (const k of R2_VARS) setEnv(k, undefined);
    setEnv("NODE_ENV", "development");
    expect(storageMode()).toBe("local");
  });

  it("turns uploads off in production without R2 settings", async () => {
    for (const k of R2_VARS) setEnv(k, undefined);
    setEnv("NODE_ENV", "production");
    expect(storageMode()).toBe("none");
    await expect(
      putObject("a/b.png", Buffer.from("x"), "image/png"),
    ).rejects.toThrow(/not configured/);
  });

  it("needs all R2 settings, not just some", () => {
    for (const k of R2_VARS) setEnv(k, undefined);
    setEnv("R2_ACCOUNT_ID", "x");
    setEnv("NODE_ENV", "production");
    expect(storageMode()).toBe("none");
  });
});

describe("newKey", () => {
  it("makes a dated, unguessable name", () => {
    const k = newKey("png", new Date("2026-10-03T12:00:00Z"));
    expect(k).toMatch(/^uploads\/2026\/10\/[0-9a-f-]{36}\.png$/);
    expect(newKey("png")).not.toBe(newKey("png"));
  });
});

describe("local storage", () => {
  it("writes under public/ and deletes again, ignoring a missing file", async () => {
    for (const k of R2_VARS) setEnv(k, undefined);
    setEnv("NODE_ENV", "development");
    const dir = await mkdtemp(path.join(os.tmpdir(), "media-"));
    jest.spyOn(process, "cwd").mockReturnValue(dir);
    try {
      const key = "uploads/2026/10/test.png";
      const url = await putObject(key, Buffer.from("hello"), "image/png");
      expect(url).toBe(`/${key}`);
      expect(await readFile(path.join(dir, "public", key), "utf8")).toBe(
        "hello",
      );
      await deleteObject(key);
      await expect(stat(path.join(dir, "public", key))).rejects.toThrow();
      await expect(deleteObject(key)).resolves.toBeUndefined();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
