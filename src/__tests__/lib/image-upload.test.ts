import {
  MAX_IMAGE_BYTES,
  cleanFilename,
  detectImage,
} from "@/lib/image-upload";

const bytes = (...b: number[]) => new Uint8Array(b);
const text = (s: string) =>
  new Uint8Array(Array.from(s, (c) => c.charCodeAt(0)));

describe("detectImage", () => {
  it("recognises each allowed type from its first bytes", () => {
    expect(detectImage(bytes(0xff, 0xd8, 0xff, 0xe0))?.ext).toBe("jpg");
    expect(
      detectImage(bytes(0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10))?.ext,
    ).toBe("png");
    expect(detectImage(text("GIF89a"))?.contentType).toBe("image/gif");
    expect(detectImage(text("GIF87a"))?.ext).toBe("gif");
    expect(detectImage(text("RIFF....WEBPVP8 "))?.ext).toBe("webp");
    expect(detectImage(text("....ftypavif"))?.ext).toBe("avif");
  });

  it("refuses SVG, HTML, text and other formats", () => {
    expect(
      detectImage(text('<svg xmlns="http://www.w3.org/2000/svg"></svg>')),
    ).toBeNull();
    expect(detectImage(text("<html><script>alert(1)</script>"))).toBeNull();
    expect(detectImage(text("not an image"))).toBeNull();
    expect(detectImage(text("RIFF....WAVEfmt "))).toBeNull();
    expect(detectImage(new Uint8Array())).toBeNull();
  });

  it("is not fooled by a file name: only the bytes count", () => {
    // A PNG header is a PNG whatever it is called; a script is not an image whatever it is called.
    expect(
      detectImage(bytes(0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10)),
    ).not.toBeNull();
    expect(detectImage(text("alert('hi')"))).toBeNull();
  });

  it("limits uploads to 5 MB", () => {
    expect(MAX_IMAGE_BYTES).toBe(5 * 1024 * 1024);
  });
});

describe("cleanFilename", () => {
  it("drops folders and unsafe characters", () => {
    expect(cleanFilename("C:\\Users\\me\\photo.png")).toBe("photo.png");
    expect(cleanFilename("../../etc/passwd")).toBe("passwd");
    expect(cleanFilename('a<b>:"c|?.png')).toBe("abc.png");
  });

  it("falls back to a name and caps the length", () => {
    expect(cleanFilename("")).toBe("image");
    expect(cleanFilename("x".repeat(300)).length).toBe(120);
  });
});
