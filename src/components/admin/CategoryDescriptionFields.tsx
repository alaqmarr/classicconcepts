"use client";

import React, { useState } from "react";
import { Sparkles, Loader2, Check, X } from "lucide-react";
import toast from "react-hot-toast";
import { RichTextEditor } from "@/components/admin/RichTextEditor";

interface CategoryDescriptionFieldsProps {
  defaultDescription?: string | null;
  defaultDescriptionHtml?: string | null;
  parentCategoryName?: string;
}

export function CategoryDescriptionFields({
  defaultDescription = "",
  defaultDescriptionHtml = "",
  parentCategoryName,
}: CategoryDescriptionFieldsProps) {
  const [description, setDescription] = useState(defaultDescription || "");
  const [descriptionHtml, setDescriptionHtml] = useState(
    defaultDescriptionHtml || ""
  );
  const [loading, setLoading] = useState(false);
  const [pendingPreview, setPendingPreview] = useState<{
    description: string;
    descriptionHtml: string;
  } | null>(null);

  const handleWriteWithAcrio = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const form = e.currentTarget.closest("form");
    const nameInput = form?.querySelector<HTMLInputElement>('input[name="name"]');
    const currentName = nameInput?.value?.trim() || "";

    if (!currentName) {
      toast.error("Please enter a Category Name above first so ACRIO knows what to write.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/taxonomy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_description",
          name: currentName,
          parentName: parentCategoryName || undefined,
          currentDescription: description || undefined,
        }),
      });
      const json = await res.json();
      if (json?.ok && json.description) {
        // Require explicit Admin review & confirmation before overwriting!
        setPendingPreview({
          description: json.description,
          descriptionHtml: json.descriptionHtml || `<p>${json.description}</p>`,
        });
      } else {
        toast.error(json?.error || "Could not generate description.");
      }
    } catch {
      toast.error("Could not connect to ACRIO.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPreview = () => {
    if (!pendingPreview) return;
    setDescription(pendingPreview.description);
    setDescriptionHtml(pendingPreview.descriptionHtml);
    setPendingPreview(null);
    toast.success("Approved ACRIO description applied! Click Save when ready.");
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Plain Summary Description (Shown on Category Cards &amp; SEO)
          </label>
          <button
            type="button"
            disabled={loading}
            onClick={handleWriteWithAcrio}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Sparkles size={13} />
            )}
            Write with ACRIO
          </button>
        </div>
        {pendingPreview && (
          <div className="mb-3 p-3.5 rounded-xl bg-amber-50 border border-amber-300 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                <Sparkles size={14} className="text-indigo-600" />
                Review ACRIO Proposed Description (Edit if needed, then Confirm)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPendingPreview(null)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-700"
                >
                  <X size={12} />
                  Discard
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPreview}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold"
                >
                  <Check size={12} />
                  Confirm &amp; Use Description
                </button>
              </div>
            </div>
            <textarea
              rows={2}
              value={pendingPreview.description}
              onChange={(e) =>
                setPendingPreview({
                  description: e.target.value,
                  descriptionHtml: `<p>${e.target.value}</p>`,
                })
              }
              className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-xs text-slate-800"
            />
          </div>
        )}
        <textarea
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Short, clear layman summary of what products belong in this category and where customers use them..."
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white transition-all text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
          Formatted Page Description (Optional Rich Text Banner on Category Page)
        </label>
        <RichTextEditor
          name="descriptionHtml"
          value={descriptionHtml}
          onChangeValue={setDescriptionHtml}
          placeholder="Write or format detailed category guidance for buyers..."
          fieldLabel="Category Page Description"
        />
      </div>
    </div>
  );
}
