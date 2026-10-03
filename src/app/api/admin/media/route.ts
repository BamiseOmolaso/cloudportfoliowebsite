import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { secureAdminRoute, handleError } from '@/lib/api-security';
import { MAX_IMAGE_BYTES, cleanFilename, detectImage } from '@/lib/image-upload';
import { deleteObject, newKey, putObject, storageMode } from '@/lib/storage';

export const dynamic = 'force-dynamic';

/** Every uploaded image, newest first, with how many posts and projects use it. */
export const GET = secureAdminRoute(async () => {
  try {
    const assets = await db.mediaAsset.findMany({ orderBy: { createdAt: 'desc' }, take: 500 });
    const withUsage = await Promise.all(
      assets.map(async (a) => {
        const [posts, projects] = await Promise.all([
          db.blogPost.count({
            where: { OR: [{ content: { contains: a.url } }, { coverImage: a.url }] },
          }),
          db.project.count({
            where: { OR: [{ content: { contains: a.url } }, { coverImage: a.url }] },
          }),
        ]);
        return {
          id: a.id,
          url: a.url,
          filename: a.filename,
          content_type: a.contentType,
          size: a.size,
          created_at: a.createdAt.toISOString(),
          used_in: posts + projects,
        };
      })
    );
    return NextResponse.json({ storage: storageMode(), assets: withUsage });
  } catch (error) {
    return handleError(error, 'Failed to load images');
  }
});

/** Upload one image (multipart form field "file"). */
export const POST = secureAdminRoute(async (request: NextRequest) => {
  if (storageMode() === 'none') {
    return NextResponse.json(
      { error: 'Image storage is not set up on this server yet.' },
      { status: 503 }
    );
  }
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > MAX_IMAGE_BYTES + 64 * 1024) {
    return NextResponse.json({ error: 'The image is larger than 5 MB.' }, { status: 413 });
  }

  let key: string | null = null;
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No image was sent.' }, { status: 400 });
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'The image is larger than 5 MB.' }, { status: 413 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = detectImage(bytes);
    if (!kind) {
      return NextResponse.json(
        { error: 'Use a JPG, PNG, GIF, WebP or AVIF image.' },
        { status: 415 }
      );
    }

    key = newKey(kind.ext);
    const url = await putObject(key, Buffer.from(bytes), kind.contentType);
    const asset = await db.mediaAsset.create({
      data: {
        key,
        url,
        filename: cleanFilename(file.name),
        contentType: kind.contentType,
        size: file.size,
      },
    });
    return NextResponse.json(
      {
        id: asset.id,
        url: asset.url,
        filename: asset.filename,
        content_type: asset.contentType,
        size: asset.size,
        created_at: asset.createdAt.toISOString(),
        used_in: 0,
      },
      { status: 201 }
    );
  } catch (error) {
    // Do not leave a file behind that the Media screen cannot list.
    if (key) await deleteObject(key).catch(() => undefined);
    return handleError(error, 'Failed to upload the image');
  }
});
