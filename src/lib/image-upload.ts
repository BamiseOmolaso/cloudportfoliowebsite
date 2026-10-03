/**
 * Checks for an uploaded image. The file's own first bytes decide what it is, not the
 * name or the type the browser claims, and SVG is refused (it can carry scripts).
 */

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export interface DetectedImage {
  ext: 'jpg' | 'png' | 'gif' | 'webp' | 'avif';
  contentType: string;
}

const ascii = (b: Uint8Array, from: number, to: number) =>
  String.fromCharCode(...Array.from(b.slice(from, to)));

export function detectImage(bytes: Uint8Array): DetectedImage | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ext: 'jpg', contentType: 'image/jpeg' };
  }
  if (bytes.length >= 8 && ascii(bytes, 1, 4) === 'PNG' && bytes[0] === 0x89) {
    return { ext: 'png', contentType: 'image/png' };
  }
  if (bytes.length >= 6 && /^GIF8[79]a$/.test(ascii(bytes, 0, 6))) {
    return { ext: 'gif', contentType: 'image/gif' };
  }
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP') {
    return { ext: 'webp', contentType: 'image/webp' };
  }
  if (bytes.length >= 12 && ascii(bytes, 4, 8) === 'ftyp' && /^avi[fs]$/.test(ascii(bytes, 8, 12))) {
    return { ext: 'avif', contentType: 'image/avif' };
  }
  return null;
}

/** A readable name for the media list: the original name without its folder or odd characters. */
export function cleanFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? '';
  // eslint-disable-next-line no-control-regex
  const safe = base.replace(/[\u0000-\u001F<>:"|?*]/g, '').trim();
  return (safe || 'image').slice(0, 120);
}
