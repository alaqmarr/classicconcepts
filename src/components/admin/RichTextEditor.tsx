"use client";

import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";
import { useMemo, useState } from "react";

// Dynamically import react-quill-new to avoid SSR issues with the document object
const ReactQuill = dynamic(() => import("react-quill-new"), {
  ssr: false,
  loading: () => (
    <div className="h-40 w-full bg-slate-50 animate-pulse border border-slate-200 rounded-xl" />
  ),
});

interface RichTextEditorProps {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}

const ALLOWED_QUILL_FORMATS = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "list",
  "link",
];

function normalizeEditorHtml(html: string): string {
  if (!html) return "";
  const stripped = html.replace(/<p>(\s|<br\s*\/?>|&nbsp;)*<\/p>/gi, "").trim();
  return stripped ? html : "";
}

export function RichTextEditor({
  name,
  defaultValue = "",
  placeholder,
  required = false,
}: RichTextEditorProps) {
  const [content, setContent] = useState(defaultValue);

  const modules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ list: "ordered" }, { list: "bullet" }],
        ["link", "clean"],
      ],
    }),
    []
  );

  const normalizedValue = normalizeEditorHtml(content);

  return (
    <div className="w-full relative">
      <input type="hidden" name={name} value={normalizedValue} />
      {required && !normalizedValue && (
        <input
          type="text"
          tabIndex={-1}
          aria-hidden="true"
          required
          value=""
          onChange={() => {}}
          className="sr-only"
        />
      )}

      <div className="bg-white rounded-xl overflow-hidden [&_.ql-toolbar]:rounded-t-xl [&_.ql-toolbar]:border-slate-200 [&_.ql-container]:border-slate-200 [&_.ql-container]:rounded-b-xl [&_.ql-editor]:min-h-[150px] [&_.ql-editor]:text-sm">
        <ReactQuill
          theme="snow"
          value={content}
          onChange={setContent}
          modules={modules}
          formats={ALLOWED_QUILL_FORMATS}
          placeholder={placeholder || "Start typing here..."}
        />
      </div>
    </div>
  );
}
