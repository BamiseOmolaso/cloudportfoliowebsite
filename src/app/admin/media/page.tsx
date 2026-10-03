"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Copy, ImagePlus, Trash2 } from "lucide-react";
import { uploadImage } from "@/lib/upload-client";
import {
  Card,
  EmptyState,
  ErrorBanner,
  PageHeader,
  button,
} from "@/components/admin/ui";

interface Asset {
  id: string;
  url: string;
  filename: string;
  size: number;
  created_at: string;
  used_in: number;
}

const kb = (n: number) =>
  n >= 1024 * 1024
    ? `${(n / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(n / 1024))} KB`;

export default function AdminMediaPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [storage, setStorage] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/media");
      if (!res.ok) throw new Error("Could not load the images");
      const data = await res.json();
      setAssets(data.assets);
      setStorage(data.storage);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the images");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const upload = async (files: File[]) => {
    setUploading(true);
    setError(null);
    for (const f of files) {
      try {
        await uploadImage(f);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "The image could not be uploaded.",
        );
      }
    }
    setUploading(false);
    load();
  };

  const remove = async (a: Asset) => {
    const warning =
      a.used_in > 0
        ? `"${a.filename}" is used in ${a.used_in} post or project${a.used_in === 1 ? "" : "s"}. They will show a broken image. Delete it anyway?`
        : `Delete "${a.filename}"? This cannot be undone.`;
    if (!confirm(warning)) return;
    const res = await fetch(`/api/admin/media/${a.id}`, { method: "DELETE" });
    if (res.ok) setAssets((prev) => prev.filter((x) => x.id !== a.id));
    else setError("Could not delete the image");
  };

  const copy = async (a: Asset) => {
    const absolute = a.url.startsWith("/")
      ? `${window.location.origin}${a.url}`
      : a.url;
    await navigator.clipboard.writeText(absolute).catch(() => undefined);
    setCopied(a.id);
    window.setTimeout(() => setCopied(null), 1500);
  };

  return (
    <>
      <PageHeader
        title="Media"
        subtitle="Images you add to posts and projects are stored here. Delete one at any time and it is removed from storage."
        actions={
          <>
            <button
              type="button"
              className={button("primary")}
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4" aria-hidden="true" />
              {uploading ? "Uploading…" : "Upload images"}
            </button>
            <input
              ref={fileRef}
              type="file"
              hidden
              multiple
              accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
              onChange={(e) => {
                void upload(Array.from(e.target.files ?? []));
                e.target.value = "";
              }}
            />
          </>
        }
      />
      {storage === "local" && (
        <p className="mb-6 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          Local development: images are saved in this project&apos;s{" "}
          <code>public/uploads</code> folder. On the live site they go to
          Cloudflare R2.
        </p>
      )}
      {storage === "none" && (
        <p className="mb-6 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Image storage is not set up on this server, so uploads are turned off.
        </p>
      )}
      {error && <ErrorBanner message={error} onRetry={load} />}

      {loading ? (
        <div
          className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"
          aria-busy="true"
        >
          {[0, 1, 2, 3].map((n) => (
            <div
              key={n}
              className="aspect-square animate-pulse rounded-xl bg-gray-900"
            />
          ))}
        </div>
      ) : assets.length === 0 ? (
        <Card>
          <EmptyState
            title="No images yet"
            body="Upload one here, or paste or drag an image into a post and it appears in this list."
          />
        </Card>
      ) : (
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {assets.map((a) => (
            <li key={a.id}>
              <Card className="overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.url}
                  alt={a.filename}
                  loading="lazy"
                  className="aspect-square w-full object-cover"
                />
                <div className="p-3">
                  <p
                    className="truncate text-sm font-medium text-white"
                    title={a.filename}
                  >
                    {a.filename}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {kb(a.size)} ·{" "}
                    {format(new Date(a.created_at), "d MMM yyyy")}
                  </p>
                  <p
                    className={`mt-0.5 text-xs ${a.used_in ? "text-purple-300" : "text-gray-500"}`}
                  >
                    {a.used_in ? `Used in ${a.used_in}` : "Not used anywhere"}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => copy(a)}
                      className={`${button("secondary")} flex-1 !px-2 !py-1.5 text-xs`}
                    >
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      {copied === a.id ? "Copied" : "Copy link"}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(a)}
                      aria-label={`Delete ${a.filename}`}
                      className={`${button("danger")} !px-2 !py-1.5`}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
