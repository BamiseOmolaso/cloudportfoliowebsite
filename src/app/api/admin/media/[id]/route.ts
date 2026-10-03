import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { secureAdminRoute, handleError } from '@/lib/api-security';
import { deleteObject } from '@/lib/storage';

export const dynamic = 'force-dynamic';

/** Remove an image from storage and from the list. Posts that still use it will show a broken image. */
async function deleteHandler(id: string) {
  try {
    const asset = await db.mediaAsset.findUnique({ where: { id } });
    if (!asset) return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    await deleteObject(asset.key);
    await db.mediaAsset.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error, 'Failed to delete the image');
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return secureAdminRoute(() => deleteHandler(id))(request);
}
