"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Film,
  Link2,
  Plus,
  Smartphone,
  Trash2,
} from "lucide-react";
import {
  isUploadedOrLocalVideoInput,
  parseVideoUrlEntries,
  resolveVideoEmbed,
  serializeVideoUrlEntries,
} from "@/lib/youtube";
import { UniversalVideoPlayer } from "@/components/shop/UniversalVideoPlayer";

interface VideoLinksEditorProps {
  /** Initial stored string (single URL or newline-separated URLs) */
  defaultValue?: string | null;
  /** Controlled value override (if used in controlled modal) */
  value?: string;
  onChange?: (serialized: string) => void;
  /** Form field name when used inside a <form> (e.g. "videoUrl") */
  name?: string;
  productName?: string;
}

export function VideoLinksEditor({
  defaultValue,
  value,
  onChange,
  name,
  productName = "Product",
}: VideoLinksEditorProps) {
  const isControlled = typeof value === "string";

  const [internalRows, setInternalRows] = useState<string[]>(() => {
    const parsed = parseVideoUrlEntries(isControlled ? value : defaultValue);
    return parsed.length > 0 ? parsed : [""];
  });
  const [showPreview, setShowPreview] = useState(false);

  // Sync rows when controlled value changes externally (e.g. modal reset)
  const rows = isControlled
    ? (() => {
        const split = value
          .split(/\r?\n/)
          .map((s) => s);
        return split.length > 0 ? split : [""];
      })()
    : internalRows;

  const updateRows = (nextRows: string[]) => {
    const safeRows = nextRows.length > 0 ? nextRows : [""];
    if (!isControlled) {
      setInternalRows(safeRows);
    }
    onChange?.(safeRows.join("\n"));
  };

  const serializedClean =
    serializeVideoUrlEntries(rows.filter((r) => r.trim().length > 0)) || "";

  const validCount = rows.filter((r) => Boolean(resolveVideoEmbed(r))).length;

  return (
    <div className="space-y-3">
      {name && <input type="hidden" name={name} value={serializedClean} />}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-[#0056b3]" />
            <span>Product Videos, Shorts &amp; Reels (External Links Only)</span>
          </label>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Paste links or embed codes from{" "}
            <span className="font-semibold text-slate-700">
              YouTube, YouTube Shorts, Instagram Reels/Posts, Vimeo, Facebook Reels/Videos, Google Drive, Loom, Dailymotion, TikTok
            </span>{" "}
            or external video streams. Direct file uploads are disabled.
          </p>
        </div>

        {validCount > 0 && (
          <button
            type="button"
            onClick={() => setShowPreview((p) => !p)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
          >
            {showPreview ? (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span>Hide Preview</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Preview ({validCount})</span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="space-y-2.5">
        {rows.map((rowValue, idx) => {
          const trimmed = rowValue.trim();
          const isUploadBlocked = trimmed
            ? isUploadedOrLocalVideoInput(trimmed)
            : false;
          const resolved = trimmed ? resolveVideoEmbed(trimmed) : null;

          return (
            <div key={idx} className="space-y-1">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={rowValue}
                  onChange={(e) => {
                    const pasted = e.target.value;
                    const next = [...rows];
                    next[idx] = pasted;
                    updateRows(next);
                  }}
                  placeholder="https://youtube.com/shorts/... or https://instagram.com/reel/... or Vimeo / Drive / Loom link"
                  className={`flex-1 px-3.5 py-2.5 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:bg-white text-sm ${
                    isUploadBlocked || (trimmed && !resolved)
                      ? "border-red-300 focus:ring-red-500"
                      : "border-slate-200 focus:ring-[#0056b3]"
                  }`}
                />

                {rows.length > 1 || trimmed ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (rows.length === 1) {
                        updateRows([""]);
                      } else {
                        updateRows(rows.filter((_, i) => i !== idx));
                      }
                    }}
                    className="p-2.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors shrink-0"
                    title="Remove video link"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : null}
              </div>

              {isUploadBlocked && (
                <p className="text-[11px] font-medium text-red-600 flex items-center gap-1 pl-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Video file uploads are disabled. Please paste an external video URL (YouTube, Shorts, Instagram Reel, Vimeo, Drive, etc.).
                  </span>
                </p>
              )}

              {!isUploadBlocked && trimmed && !resolved && (
                <p className="text-[11px] font-medium text-amber-600 flex items-center gap-1 pl-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Enter a valid https:// video URL or embed snippet.
                  </span>
                </p>
              )}

              {resolved && (
                <div className="flex items-center gap-2 pl-1 text-[11px] text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Detected: {resolved.platformLabel}</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                    {resolved.orientation === "vertical" ? (
                      <>
                        <Smartphone className="w-2.5 h-2.5" />
                        9:16 Vertical
                      </>
                    ) : (
                      <>
                        <Film className="w-2.5 h-2.5" />
                        16:9 Widescreen
                      </>
                    )}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
        <button
          type="button"
          onClick={() => updateRows([...rows, ""])}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0056b3] border border-blue-200 text-xs font-bold transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Another Video / Short / Reel</span>
        </button>

        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold text-slate-400">
          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
            YouTube &amp; Shorts
          </span>
          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
            Instagram Reels
          </span>
          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
            Vimeo
          </span>
          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
            FB Reels
          </span>
          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
            Drive / Loom / All Links
          </span>
        </div>
      </div>

      {showPreview && serializedClean && (
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <UniversalVideoPlayer
            rawVideoUrl={serializedClean}
            productName={productName}
            compact
          />
        </div>
      )}
    </div>
  );
}
