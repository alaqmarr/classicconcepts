"use client";

import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";
import { useEffect, useMemo, useState } from "react";
import { Sparkles, ListChecks, Wand2, Loader2, Check, X } from "lucide-react";
import toast from "react-hot-toast";

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
  value?: string;
  onChangeValue?: (nextHtml: string) => void;
  placeholder?: string;
  required?: boolean;
  fieldLabel?: string;
  enableAi?: boolean;
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
  value,
  onChangeValue,
  placeholder,
  required = false,
  fieldLabel = "Rich Content",
  enableAi = true,
}: RichTextEditorProps) {
  const [content, setContent] = useState(value !== undefined ? value : defaultValue);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [pendingAiHtml, setPendingAiHtml] = useState<string | null>(null);
  const [pendingAiWarning, setPendingAiWarning] = useState<string | null>(null);

  useEffect(() => {
    if (value !== undefined) {
      setContent(value);
    }
  }, [value]);

  const handleEditorChange = (next: string) => {
    setContent(next);
    onChangeValue?.(next);
  };

  const runAiAction = async (instruction: string, mode: "html" | "bullets") => {
    setAiLoading(true);
    try {
      const res = await fetch("/api/admin/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "inline_rewrite",
          currentText: content,
          instruction,
          mode,
          fieldLabel,
        }),
      });
      const json = await res.json();
      if (json?.ok && json.result) {
        // NEVER overwrite editor content directly — always require admin confirmation!
        setPendingAiHtml(json.result);
        setPendingAiWarning(json.warning || null);
      } else {
        toast.error(json?.error || "Could not run ACRIO rewrite.");
      }
    } catch {
      toast.error("Network error while calling ACRIO helper.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleConfirmAiHtml = () => {
    if (pendingAiHtml === null) return;
    setContent(pendingAiHtml);
    onChangeValue?.(pendingAiHtml);
    setPendingAiHtml(null);
    setPendingAiWarning(null);
    toast.success("Approved ACRIO draft applied!");
  };

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
    <div className="w-full relative space-y-2">
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

      {enableAi && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-indigo-50/60 border border-indigo-100 rounded-xl px-3 py-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 mr-1">
              <Sparkles size={13} />
              AI Writer:
            </span>
            <button
              type="button"
              disabled={aiLoading}
              onClick={() =>
                runAiAction(
                  "Convert into 4 to 6 crisp, scannable bullet points with bold lead-in labels.",
                  "bullets"
                )
              }
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <ListChecks size={12} />}
              Convert to Bullets
            </button>
            <button
              type="button"
              disabled={aiLoading}
              onClick={() =>
                runAiAction(
                  "Polish grammar, clarity, and B2B persuasiveness while keeping accurate facts.",
                  "html"
                )
              }
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <Wand2 size={12} />
              Polish Copy
            </button>
            <button
              type="button"
              onClick={() => setAiOpen((o) => !o)}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-indigo-700 hover:bg-white transition-colors"
            >
              {aiOpen ? "Hide Prompt" : "Custom Prompt..."}
            </button>
          </div>
        </div>
      )}

      {enableAi && aiOpen && (
        <div className="flex flex-col sm:flex-row gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Tell Claude Haiku what to write or change (e.g. 'Add cleaning & care instructions as bullets')..."
            className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="button"
            disabled={aiLoading || !aiPrompt.trim()}
            onClick={() => runAiAction(aiPrompt, "html")}
            className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            Generate
          </button>
        </div>
      )}

      {pendingAiHtml !== null && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
              <Sparkles size={14} className="text-indigo-600" />
              Review ACRIO Proposed Text (Confirm before applying)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPendingAiHtml(null);
                  setPendingAiWarning(null);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                <X size={12} />
                Discard
              </button>
              <button
                type="button"
                onClick={handleConfirmAiHtml}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold"
              >
                <Check size={12} />
                Confirm &amp; Apply
              </button>
            </div>
          </div>
          {pendingAiWarning && (
            <p className="text-[11px] text-amber-800">{pendingAiWarning}</p>
          )}
          <div
            className="p-3 rounded-lg bg-white border border-amber-200 text-xs text-slate-800 prose prose-xs max-w-none"
            dangerouslySetInnerHTML={{ __html: pendingAiHtml }}
          />
        </div>
      )}

      <div className="bg-white rounded-xl overflow-hidden [&_.ql-toolbar]:rounded-t-xl [&_.ql-toolbar]:border-slate-200 [&_.ql-container]:border-slate-200 [&_.ql-container]:rounded-b-xl [&_.ql-editor]:min-h-[150px] [&_.ql-editor]:text-sm">
        <ReactQuill
          theme="snow"
          value={content}
          onChange={handleEditorChange}
          modules={modules}
          formats={ALLOWED_QUILL_FORMATS}
          placeholder={placeholder || "Start typing here..."}
        />
      </div>
    </div>
  );
}
