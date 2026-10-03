"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { createLowlight } from "lowlight";
import {
  Bold,
  Code,
  Code2,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { uploadImage } from "@/lib/upload-client";

const lowlight = createLowlight();

function Tool({
  icon: Icon,
  label,
  onClick,
  active = false,
  disabled = false,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-md p-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 disabled:opacity-40 ${
        active
          ? "bg-purple-600 text-white"
          : "text-gray-300 hover:bg-gray-800 hover:text-white"
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

const Divider = () => (
  <span className="mx-1 h-5 w-px bg-gray-700" aria-hidden="true" />
);

/**
 * The writing box for posts, projects and newsletters. Images can be added with the
 * toolbar button, pasted, or dropped in: each one is uploaded to storage first, so the
 * text only ever holds a link to it (never the picture itself).
 */
export default function RichEditor({
  content,
  onChange,
  placeholder = "Start writing…",
  minHeight = 420,
}: {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const insertFiles = useCallback(async (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return;
    setError(null);
    for (const file of images) {
      setUploading((n) => n + 1);
      try {
        const { url, filename } = await uploadImage(file);
        editorRef.current
          ?.chain()
          .focus()
          .setImage({ src: url, alt: filename.replace(/\.[^.]+$/, "") })
          .run();
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "The image could not be uploaded.",
        );
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, codeBlock: false }),
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder }),
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
    editorProps: {
      attributes: {
        class:
          "prose prose-invert max-w-none px-5 py-4 focus:outline-none prose-img:rounded-lg prose-a:text-purple-400",
        style: `min-height:${minHeight}px`,
      },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []);
        if (files.some((f) => f.type.startsWith("image/"))) {
          event.preventDefault();
          void insertFiles(files);
          return true;
        }
        return false;
      },
      handleDrop: (_view, event) => {
        const files = Array.from(event.dataTransfer?.files ?? []);
        if (files.some((f) => f.type.startsWith("image/"))) {
          event.preventDefault();
          void insertFiles(files);
          return true;
        }
        return false;
      },
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // Load text that arrives after the editor was created (editing an existing post).
  useEffect(() => {
    if (editor && content !== editor.getHTML())
      editor.commands.setContent(content, false);
    // Only when the incoming text changes; typing updates `content` through onChange.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt(
      "Link address (leave empty to remove the link)",
      previous ?? "https://",
    );
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url.trim() })
        .run();
    }
  }, [editor]);

  if (!editor) {
    return (
      <div
        className="rounded-xl border border-gray-700 bg-gray-950"
        style={{ minHeight }}
        aria-busy="true"
      />
    );
  }

  const words = editor.getText().trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-950 focus-within:border-purple-500">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-gray-800 bg-gray-900 px-2 py-1.5">
        <Tool
          icon={Heading2}
          label="Large heading"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        />
        <Tool
          icon={Heading3}
          label="Small heading"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        />
        <Divider />
        <Tool
          icon={Bold}
          label="Bold (Ctrl+B)"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <Tool
          icon={Italic}
          label="Italic (Ctrl+I)"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <Tool
          icon={Strikethrough}
          label="Strikethrough"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        />
        <Tool
          icon={Code}
          label="Inline code"
          active={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
        />
        <Tool
          icon={LinkIcon}
          label="Link"
          active={editor.isActive("link")}
          onClick={setLink}
        />
        <Divider />
        <Tool
          icon={List}
          label="Bulleted list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <Tool
          icon={ListOrdered}
          label="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <Tool
          icon={Quote}
          label="Quote"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />
        <Tool
          icon={Code2}
          label="Code block"
          active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        />
        <Divider />
        <Tool
          icon={ImagePlus}
          label="Upload an image"
          disabled={uploading > 0}
          onClick={() => fileRef.current?.click()}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
          multiple
          hidden
          onChange={(e) => {
            void insertFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
        <span className="ml-auto flex items-center gap-0.5">
          <Tool
            icon={Undo2}
            label="Undo"
            disabled={!editor.can().undo()}
            onClick={() => editor.chain().focus().undo().run()}
          />
          <Tool
            icon={Redo2}
            label="Redo"
            disabled={!editor.can().redo()}
            onClick={() => editor.chain().focus().redo().run()}
          />
        </span>
      </div>

      {error && (
        <p
          role="alert"
          className="border-b border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300"
        >
          {error}
        </p>
      )}

      <EditorContent editor={editor} />

      <div className="flex items-center justify-between border-t border-gray-800 px-4 py-2 text-xs text-gray-500">
        <span aria-live="polite">
          {uploading > 0
            ? "Uploading image…"
            : "Tip: paste or drag images straight into the text."}
        </span>
        <span>
          {words} {words === 1 ? "word" : "words"}
        </span>
      </div>
    </div>
  );
}
