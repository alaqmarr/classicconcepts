"use client";

import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";
import { useMemo, useState } from "react";

// Dynamically import react-quill-new to avoid SSR issues with the document object
const ReactQuill = dynamic(() => import("react-quill-new"), {
  ssr: false,
  loading: () => <div className="h-40 w-full bg-slate-50 animate-pulse border border-slate-200 rounded-xl"></div>,
});

interface RichTextEditorProps {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}

export function RichTextEditor({ name, defaultValue = "", placeholder, required = false }: RichTextEditorProps) {
  const [content, setContent] = useState(defaultValue);
  // Modules for the Quill Editor Toolbar
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

  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "list",
    "link",
  ];

  return (
    <div className="w-full">
      {/* Hidden input ensures Server Actions can read this value seamlessly */}
      <input type="hidden" name={name} value={content} required={required && !content} />
      
      <div className="bg-white rounded-xl overflow-hidden [&_.ql-toolbar]:rounded-t-xl [&_.ql-toolbar]:border-slate-200 [&_.ql-container]:border-slate-200 [&_.ql-container]:rounded-b-xl [&_.ql-editor]:min-h-[150px] [&_.ql-editor]:text-sm">
        <ReactQuill
          theme="snow"
          value={content}
          onChange={setContent}
          modules={modules}
          formats={formats}
          placeholder={placeholder || "Start typing here..."}
        />
      </div>
    </div>
  );
}
