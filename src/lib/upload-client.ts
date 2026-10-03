/** Send one image to the admin upload endpoint; returns its public address. */
export interface UploadedImage {
  id: string;
  url: string;
  filename: string;
}

export async function uploadImage(file: File): Promise<UploadedImage> {
  const body = new FormData();
  body.append('file', file);
  const res = await fetch('/api/admin/media', { method: 'POST', body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'The image could not be uploaded.');
  return data as UploadedImage;
}
