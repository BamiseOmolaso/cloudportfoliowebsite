import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

/**
 * Where uploaded images are kept.
 *
 *  - Cloudflare R2 (an S3-compatible bucket) when the R2_* settings are present. This is
 *    what production uses; the files are served from the bucket's public address.
 *  - A folder on disk (public/uploads) when running locally without those settings,
 *    so the editor can be tried without a bucket. Never used in production.
 */

export type StorageMode = 'r2' | 'local' | 'none';

const env = () => ({
  account: process.env.R2_ACCOUNT_ID,
  accessKey: process.env.R2_ACCESS_KEY_ID,
  secretKey: process.env.R2_SECRET_ACCESS_KEY,
  bucket: process.env.R2_MEDIA_BUCKET,
  publicUrl: process.env.R2_MEDIA_PUBLIC_URL?.replace(/\/+$/, ''),
});

export function storageMode(): StorageMode {
  const e = env();
  if (e.account && e.accessKey && e.secretKey && e.bucket && e.publicUrl) return 'r2';
  return process.env.NODE_ENV === 'production' ? 'none' : 'local';
}

let client: S3Client | undefined;
function r2() {
  const e = env();
  client ??= new S3Client({
    region: 'auto',
    endpoint: `https://${e.account}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: e.accessKey as string, secretAccessKey: e.secretKey as string },
  });
  return client;
}

/** A new, unguessable object name: uploads/2026/10/<uuid>.png */
export function newKey(ext: string, now = new Date()): string {
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `uploads/${now.getUTCFullYear()}/${month}/${randomUUID()}.${ext}`;
}

const localPath = (key: string) => path.join(process.cwd(), 'public', key);

export async function putObject(key: string, body: Buffer, contentType: string): Promise<string> {
  const mode = storageMode();
  if (mode === 'r2') {
    await r2().send(
      new PutObjectCommand({
        Bucket: env().bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );
    return `${env().publicUrl}/${key}`;
  }
  if (mode === 'local') {
    const file = localPath(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body);
    return `/${key}`;
  }
  throw new Error('Image storage is not configured');
}

export async function deleteObject(key: string): Promise<void> {
  const mode = storageMode();
  if (mode === 'r2') {
    await r2().send(new DeleteObjectCommand({ Bucket: env().bucket, Key: key }));
  } else if (mode === 'local') {
    await unlink(localPath(key)).catch((e: NodeJS.ErrnoException) => {
      if (e.code !== 'ENOENT') throw e;
    });
  }
}
