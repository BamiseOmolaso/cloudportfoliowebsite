"use client";

import { useRef, useState, type ReactNode } from "react";
import { ImagePlus, Trash2, X } from "lucide-react";
import { uploadImage } from "@/lib/upload-client";
import { Card, button, inputClass } from "./ui";

/** A labelled form control with optional help text, error and character counter. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  counter,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  counter?: { value: number; max: number };
  children: ReactNode;
}) {
  const over = counter && counter.value > counter.max;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-sm font-medium text-gray-200">
          {label}
        </label>
        {counter && (
          <span
            className={`text-xs ${over ? "text-red-400" : "text-gray-500"}`}
          >
            {counter.value}/{counter.max}
          </span>
        )}
      </div>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-red-400" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-gray-500">{hint}</p>
      )}
    </div>
  );
}

/** A titled box in the side column of an editor. */
export function Panel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Card className="p-4">
      <h2 className="mb-3 text-sm font-semibold text-white">{title}</h2>
      <div className="space-y-4">{children}</div>
    </Card>
  );
}

/** Tags or technologies: type, press Enter or comma, click × to remove. */
export function TagInput({
  id,
  values,
  onChange,
  placeholder,
}: {
  id: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState("");
  const add = (raw: string) => {
    const t = raw.trim();
    if (t && !values.includes(t)) onChange([...values, t]);
    setText("");
  };
  return (
    <div>
      <input
        id={id}
        value={text}
        placeholder={placeholder}
        className={inputClass}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(text);
          } else if (e.key === "Backspace" && !text && values.length) {
            onChange(values.slice(0, -1));
          }
        }}
        onBlur={() => text && add(text)}
      />
      {values.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {values.map((v) => (
            <li
              key={v}
              className="inline-flex items-center gap-1 rounded-md bg-purple-500/15 px-2 py-1 text-xs text-purple-200 ring-1 ring-inset ring-purple-500/30"
            >
              {v}
              <button
                type="button"
                aria-label={`Remove ${v}`}
                onClick={() => onChange(values.filter((x) => x !== v))}
                className="rounded p-0.5 hover:bg-purple-500/30"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** A picture for the top of a post or project: upload one (it goes to storage) or paste an address. */
export function ImageField({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onChange((await uploadImage(file)).url);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "The image could not be uploaded.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {value ? (
        <div className="relative overflow-hidden rounded-lg border border-gray-700">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt=""
            className="aspect-video w-full object-cover"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Remove the cover image"
            className="absolute right-2 top-2 rounded-md bg-gray-950/80 p-1.5 text-gray-200 hover:bg-red-600 hover:text-white"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-600 text-sm text-gray-400 transition-colors hover:border-purple-500 hover:text-white disabled:opacity-60"
        >
          <ImagePlus className="h-6 w-6" aria-hidden="true" />
          {busy ? "Uploading…" : "Upload a cover image"}
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        hidden
        accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <div className="mt-2 flex items-center gap-2">
        <input
          aria-label="Cover image address"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="or paste an image address"
          className={`${inputClass} text-xs`}
        />
        {value && (
          <button
            type="button"
            className={button("secondary")}
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            Replace
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
