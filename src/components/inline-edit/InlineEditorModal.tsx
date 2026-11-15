"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  X,
  Check,
  Sparkles,
  Upload,
  Loader2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Code,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Wand2,
  ExternalLink,
  Image as ImageIcon,
  Palette,
  Eraser,
  Sun,
  Moon,
  RotateCcw,
  CornerDownLeft,
} from "lucide-react";
import { ImageCropperModal } from "@/components/admin/ImageCropperModal";
import {
  compressRasterImageIfNeeded,
  uploadAdminFile,
} from "@/lib/client-upload";
import {
  bulletsToCleanHtml,
  extractBulletsFromContent,
} from "@/lib/bullet-formatter";
import type { InlineEditorMode, InlineEditorRequest } from "./types";

interface InlineEditorModalProps {
  request: InlineEditorRequest;
  aiConfigured: boolean;
  onClose: () => void;
}

const BRAND_COLOR_SWATCHES = [
  { name: "Brand Royal Blue", hex: "#0056b3" },
  { name: "Electric Sky Blue", hex: "#3b82f6" },
  { name: "Ice Cyan (Dark Bg)", hex: "#38bdf8" },
  { name: "Brand Crimson Red", hex: "#e31837" },
  { name: "Prestige Amber", hex: "#f59e0b" },
  { name: "Emerald Green", hex: "#10b981" },
  { name: "Heading Charcoal", hex: "#0f172a" },
  { name: "Body Slate", hex: "#475569" },
  { name: "Pure White (Dark Bg)", hex: "#ffffff" },
];

const BRAND_GRADIENTS = [
  {
    name: "Hero Aurora",
    preview: "linear-gradient(90deg, #60a5fa, #a78bfa, #f43f5e)",
    css: "background-image: linear-gradient(90deg, #60a5fa, #a78bfa, #f43f5e); -webkit-background-clip: text; background-clip: text; color: transparent;",
  },
  {
    name: "Banner Cyan",
    preview: "linear-gradient(90deg, #60a5fa, #67e8f9)",
    css: "background-image: linear-gradient(90deg, #60a5fa, #67e8f9); -webkit-background-clip: text; background-clip: text; color: transparent;",
  },
  {
    name: "Royal → Cyan",
    preview: "linear-gradient(90deg, #0056b3, #06b6d4)",
    css: "background-image: linear-gradient(90deg, #0056b3, #06b6d4); -webkit-background-clip: text; background-clip: text; color: transparent;",
  },
  {
    name: "Crimson → Gold",
    preview: "linear-gradient(90deg, #e31837, #f59e0b)",
    css: "background-image: linear-gradient(90deg, #e31837, #f59e0b); -webkit-background-clip: text; background-clip: text; color: transparent;",
  },
];

const FONT_SCALE_OPTIONS = [
  { label: "Small", size: "0.85em" },
  { label: "Normal", size: "1em" },
  { label: "Large", size: "1.18em" },
  { label: "Display", size: "1.35em" },
];

const AI_PRESETS = [
  {
    label: "Simple & Clear (Keep Styling)",
    instruction:
      "Rewrite in simple, everyday layman English that anyone can understand. Never use em dashes or fancy words. Keep all facts, bold text, and any colored or gradient highlight spans.",
    kind: "preserve" as const,
  },
  {
    label: "Shorter & Easier to Read",
    instruction:
      "Make this ~35% shorter using simple everyday words and short sentences (no em dashes, no buzzwords) while keeping any bold, colored, or gradient highlight spans.",
    kind: "preserve" as const,
  },
  {
    label: "Convert to Simple Bullets",
    instruction:
      "Turn this into short, easy-to-understand bullet points in plain layman English with simple bold labels and zero em dashes.",
    kind: "bullets" as const,
  },
  {
    label: "Friendly Buyer Copy",
    instruction:
      "Write warm, clear, everyday buyer-friendly text explaining why this helps the customer in plain words (no jargon, no em dashes) while keeping existing color and bold highlights.",
    kind: "preserve" as const,
  },
];

function escapeHtmlText(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

/**
 * Normalizes deprecated <font color="..."> tags created by browser execCommand("foreColor")
 * into clean modern <span style="color: ..."> markup.
 */
function normalizeLegacyFontTags(html: string): string {
  if (!html) return "";
  return html.replace(
    /<font\b([^>]*)>([\s\S]*?)<\/font>/gi,
    (_full, attrs: string, inner: string) => {
      const colorMatch = attrs.match(/color=["']?([^"'\s>]+)["']?/i);
      if (colorMatch?.[1]) {
        return `<span style="color: ${colorMatch[1]};">${inner}</span>`;
      }
      return `<span>${inner}</span>`;
    }
  );
}

export default function InlineEditorModal({
  request,
  aiConfigured,
  onClose,
}: InlineEditorModalProps) {
  const router = useRouter();
  const pathname = usePathname();

  const canUseRichHtml = Boolean(
    request.allowSwitchToHtml ||
      request.target.kind === "site_content" ||
      request.mode === "html"
  );

  const [mode, setMode] = useState<InlineEditorMode>(request.mode);
  const [value, setValue] = useState<string>(request.initialValue || "");
  const [darkCanvas, setDarkCanvas] = useState<boolean>(
    Boolean(request.previewStyle?.isLightOnDark)
  );
  const [customHex, setCustomHex] = useState<string>("#0056b3");

  const [bullets, setBullets] = useState<string[]>(() => {
    if (request.initialBullets && request.initialBullets.length > 0) {
      return request.initialBullets;
    }
    if (request.mode === "bullets") {
      const parsed = extractBulletsFromContent(request.initialValue);
      return parsed.length > 0 ? parsed : [""];
    }
    return [""];
  });

  const [showHtmlSource, setShowHtmlSource] = useState(false);
  const visualRef = useRef<HTMLDivElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const colorPickerInputRef = useRef<HTMLInputElement | null>(null);

  // Image upload & crop state
  const [pendingCropFile, setPendingCropFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // AI Co-Pilot state
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPreview, setAiPreview] = useState<string | null>(null);
  const [aiSourceLabel, setAiSourceLabel] = useState<string | null>(null);

  // Save state
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync HTML into contentEditable when switching into visual HTML mode
  useEffect(() => {
    if (mode === "html" && !showHtmlSource && visualRef.current) {
      if (visualRef.current.innerHTML !== value) {
        visualRef.current.innerHTML = value || "";
      }
    }
  }, [mode, showHtmlSource]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveCurrentSelection = () => {
    if (typeof window === "undefined" || !visualRef.current) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (visualRef.current.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
    }
  };

  const restoreSavedSelection = (): Selection | null => {
    if (typeof window === "undefined" || !visualRef.current) return null;
    visualRef.current.focus();
    const sel = window.getSelection();
    if (!sel) return null;
    if (
      savedRangeRef.current &&
      visualRef.current.contains(savedRangeRef.current.commonAncestorContainer)
    ) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
    return sel;
  };

  const syncVisualDomToState = () => {
    if (!visualRef.current) return;
    const cleaned = normalizeLegacyFontTags(visualRef.current.innerHTML);
    setValue(cleaned);
  };

  const switchToRichHtmlMode = () => {
    if (mode === "html") return;
    if (mode === "bullets") {
      const cleanedBullets = bullets.map((b) => b.trim()).filter(Boolean);
      const nextBulletHtml =
        cleanedBullets.length > 0
          ? bulletsToCleanHtml(cleanedBullets)
          : "<ul><li></li></ul>";
      setValue(nextBulletHtml);
      setShowHtmlSource(false);
      setMode("html");
      return;
    }
    const nextHtml = /<\/?[a-z][\s\S]*>/i.test(value)
      ? value
      : escapeHtmlText(value);
    setValue(nextHtml);
    setShowHtmlSource(false);
    setMode("html");
  };

  const switchToBulletRowsMode = () => {
    if (mode === "bullets") return;
    const parsed = extractBulletsFromContent(normalizeLegacyFontTags(value));
    setBullets(parsed.length > 0 ? parsed : [""]);
    setShowHtmlSource(false);
    setMode("bullets");
  };

  const execVisualCommand = (cmd: string, arg?: string) => {
    if (!visualRef.current) return;
    restoreSavedSelection();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(cmd, false, arg);
    saveCurrentSelection();
    syncVisualDomToState();
  };

  const applySpanStyleToSelection = (inlineStyleCss: string) => {
    if (!visualRef.current) return;
    const sel = restoreSavedSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    if (!visualRef.current.contains(range.commonAncestorContainer)) return;

    if (range.collapsed) {
      // If nothing is selected, wrap the entire content so 1-click styling still works intuitively
      const currentInner = visualRef.current.innerHTML.trim();
      if (!currentInner) return;
      visualRef.current.innerHTML = `<span style="${inlineStyleCss}">${currentInner}</span>`;
      syncVisualDomToState();
      return;
    }

    const fragment = range.extractContents();
    const wrapper = document.createElement("span");
    wrapper.setAttribute("style", inlineStyleCss);
    wrapper.appendChild(fragment);
    range.insertNode(wrapper);

    // Keep newly styled span selected so user can combine Bold + Color + Size seamlessly
    const newRange = document.createRange();
    newRange.selectNodeContents(wrapper);
    sel.removeAllRanges();
    sel.addRange(newRange);
    savedRangeRef.current = newRange.cloneRange();
    syncVisualDomToState();
  };

  const applyTextColor = (hex: string) => {
    if (!visualRef.current) return;
    const sel = restoreSavedSelection();
    if (sel && sel.rangeCount > 0 && !sel.getRangeAt(0).collapsed) {
      // Clear any gradient text-transparent on the selection and apply solid color
      applySpanStyleToSelection(
        `color: ${hex}; -webkit-text-fill-color: ${hex}; background-image: none;`
      );
    } else {
      applySpanStyleToSelection(
        `color: ${hex}; -webkit-text-fill-color: ${hex};`
      );
    }
  };

  const handleClearFormatting = () => {
    if (!visualRef.current) return;
    const sel = restoreSavedSelection();
    if (sel && sel.rangeCount > 0 && !sel.getRangeAt(0).collapsed) {
      const plainText = sel.toString();
      document.execCommand("removeFormat", false);
      document.execCommand("insertText", false, plainText);
      syncVisualDomToState();
    } else {
      // Strip inline span/strong/em/u/s tags while preserving <br> and paragraphs
      const stripped = value
        .replace(/<\/?(span|font|strong|b|em|i|u|s|strike)\b[^>]*>/gi, "")
        .trim();
      visualRef.current.innerHTML = stripped;
      setValue(stripped);
    }
  };

  const handleInsertLineBreak = () => {
    if (!visualRef.current) return;
    restoreSavedSelection();
    document.execCommand("insertHTML", false, "<br>");
    saveCurrentSelection();
    syncVisualDomToState();
  };

  const handleConvertProseToBullets = () => {
    const extracted = extractBulletsFromContent(value);
    if (extracted.length === 0) return;
    if (mode === "bullets") {
      setBullets(extracted);
      return;
    }
    const bulletHtml = bulletsToCleanHtml(extracted);
    if (canUseRichHtml) {
      setMode("html");
      setValue(bulletHtml);
      if (visualRef.current) {
        visualRef.current.innerHTML = bulletHtml;
      }
    } else {
      setValue(extracted.map((b) => `• ${b}`).join("\n"));
    }
  };

  const runAiAssist = async (
    instructionText: string,
    presetKind?: "preserve" | "bullets"
  ) => {
    const cleanInstruction = instructionText.trim();
    if (!cleanInstruction) return;
    setAiLoading(true);
    setError(null);

    try {
      const currentContent =
        mode === "bullets" ? bullets.filter(Boolean).join("\n") : value;

      const hasRichMarkup = /<(span|strong|b|em|i|u|ul|ol|li|p|br)\b/i.test(
        currentContent
      );

      const targetMode: "plain" | "html" | "bullets" =
        presetKind === "bullets" || mode === "bullets"
          ? "bullets"
          : mode === "html" || (hasRichMarkup && canUseRichHtml)
          ? "html"
          : "plain";

      const res = await fetch("/api/admin/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "inline_rewrite",
          currentText: currentContent,
          instruction: cleanInstruction,
          mode: targetMode,
          fieldLabel: `${request.title}${
            request.contextHint ? ` — ${request.contextHint}` : ""
          }`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.result) {
        throw new Error(data?.error || "Could not generate suggestion.");
      }

      setAiPreview(String(data.result));
      setAiSourceLabel(
        data.source === "ai" && !data.warning
          ? "ACRIO Copy Assist (Design & Styling Retained)"
          : "Smart Local Formatter"
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI generation failed.");
    } finally {
      setAiLoading(false);
    }
  };

  const applyAiPreview = () => {
    if (!aiPreview) return;
    if (mode === "bullets") {
      const parsed = extractBulletsFromContent(aiPreview);
      setBullets(parsed.length > 0 ? parsed : [aiPreview]);
    } else if (/<(ul|ol|li|strong|b|em|span|br|p)\b/i.test(aiPreview)) {
      if (canUseRichHtml) {
        setMode("html");
        setValue(aiPreview);
        if (visualRef.current) {
          visualRef.current.innerHTML = aiPreview;
        }
      } else {
        const plain = aiPreview
          .replace(/<\/li>/gi, "\n")
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<[^>]+>/g, "")
          .trim();
        setValue(plain);
      }
    } else {
      setValue(aiPreview);
      if (mode === "html" && visualRef.current) {
        visualRef.current.innerHTML = aiPreview;
      }
    }
    setAiPreview(null);
  };

  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    e.target.value = "";
    if (!picked) return;
    if (
      picked.type.startsWith("image/") &&
      picked.type !== "image/svg+xml" &&
      picked.type !== "image/gif"
    ) {
      setPendingCropFile(picked);
    } else {
      void uploadPreparedFile(picked);
    }
  };

  const uploadPreparedFile = async (fileToUpload: File) => {
    setPendingCropFile(null);
    setUploadingImage(true);
    setError(null);
    try {
      const compressed = await compressRasterImageIfNeeded(fileToUpload, 2000);
      const uploadedUrl = await uploadAdminFile(compressed);
      setValue(uploadedUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleResetToDefault = async () => {
    if (request.target.kind !== "site_content") return;
    setResetting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/inline-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "reset_site_content",
          key: request.target.key,
          pathname,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Could not reset to default.");
      }
      request.onReset?.();
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset content.");
    } finally {
      setResetting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const target = request.target;
      let payload: Record<string, unknown>;
      const liveValue =
        mode === "html" && !showHtmlSource && visualRef.current
          ? visualRef.current.innerHTML
          : value;
      let finalStringValue =
        mode === "html" ? normalizeLegacyFontTags(liveValue) : liveValue;
      let finalBullets: string[] | undefined;

      if (mode === "bullets") {
        finalBullets = bullets.map((b) => b.trim()).filter(Boolean);
        finalStringValue = bulletsToCleanHtml(finalBullets);
      } else if (request.mode === "bullets") {
        finalBullets = extractBulletsFromContent(finalStringValue);
        finalStringValue = bulletsToCleanHtml(finalBullets);
      }

      const containsHtmlTags = /<\/?[a-z][\s\S]*>/i.test(finalStringValue);

      if (target.kind === "site_content") {
        const contentType =
          mode === "image"
            ? "image"
            : mode === "html" || mode === "bullets" || containsHtmlTags
            ? "html"
            : target.contentType || "text";
        payload = {
          kind: "site_content",
          key: target.key,
          type: contentType,
          value: finalStringValue,
          pathname,
        };
      } else if (target.kind === "site_setting") {
        payload = {
          kind: "site_setting",
          field: target.field,
          value: finalStringValue,
          pathname,
        };
      } else if (target.kind === "entity_field") {
        payload = {
          kind: "entity_field",
          model: target.model,
          id: target.id,
          field: target.field,
          value: finalStringValue,
          pathname,
        };
      } else {
        const patch: Record<string, unknown> =
          target.field === "bullets"
            ? {
                bullets:
                  finalBullets || extractBulletsFromContent(finalStringValue),
              }
            : { [target.field]: finalStringValue };
        payload = {
          kind: "product_patch",
          productId: target.productId,
          patch,
          pathname,
        };
      }

      const res = await fetch("/api/admin/inline-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to save inline edit.");
      }

      request.onSaved?.(finalStringValue, finalBullets);
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  };

  // Mirror live element typography (weight, uppercase, letter-spacing) inside the WYSIWYG canvas
  const mirroredCanvasTypography: React.CSSProperties = {
    fontWeight: request.previewStyle?.fontWeight || undefined,
    textTransform:
      (request.previewStyle?.textTransform as React.CSSProperties["textTransform"]) ||
      undefined,
    letterSpacing: request.previewStyle?.letterSpacing || undefined,
    fontStyle: request.previewStyle?.fontStyle || undefined,
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[120] bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget && !saving) onClose();
        }}
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/25 text-indigo-200 border border-indigo-400/30">
                  Live Inline Design Editor
                </span>
                {mode !== "image" && (
                  <span className="text-[11px] text-slate-400">
                    {aiConfigured
                      ? "ACRIO Ready"
                      : "Smart Local Assist"}
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-bold truncate mt-1">
                {request.title}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close editor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 overflow-y-auto space-y-5 flex-1">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Mode Switcher for Bullet Descriptions vs Rich Design & Colors */}
            {request.mode === "bullets" && canUseRichHtml && (
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div className="inline-flex rounded-lg bg-slate-100 p-1 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={switchToBulletRowsMode}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                      mode === "bullets"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    Structured Bullet Rows
                  </button>
                  <button
                    type="button"
                    onClick={switchToRichHtmlMode}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                      mode === "html"
                        ? "bg-white text-indigo-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Palette className="w-3.5 h-3.5" />
                    Rich Design &amp; Colors
                  </button>
                </div>
                <span className="text-[11px] text-slate-500">
                  Bold, brand colors &amp; gradients are preserved across bullets
                </span>
              </div>
            )}

            {/* Mode Switcher for Plain Text vs Rich Design & Colors */}
            {mode !== "image" && request.mode !== "bullets" && canUseRichHtml && (
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div className="inline-flex rounded-lg bg-slate-100 p-1 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={switchToRichHtmlMode}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                      mode === "html"
                        ? "bg-white text-indigo-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Palette className="w-3.5 h-3.5" />
                    Rich Design &amp; Colors
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const plainText = value
                        .replace(/<br\s*\/?>/gi, "\n")
                        .replace(/<\/p>/gi, "\n")
                        .replace(/<[^>]+>/g, "")
                        .trim();
                      setValue(plainText);
                      setMode(request.mode === "plain" ? "plain" : "multiline");
                    }}
                    className={`px-3 py-1.5 rounded-md transition-colors ${
                      mode === "plain" || mode === "multiline"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Plain Text Only
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleConvertProseToBullets}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <List className="w-3.5 h-3.5" />
                    Convert to Bullet List
                  </button>
                </div>
              </div>
            )}

            {/* 1. Plain / Multiline Editor (with 1-click upgrade strip when Rich Design is supported) */}
            {(mode === "plain" || mode === "multiline") && (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Content
                  </label>
                  {canUseRichHtml && (
                    <button
                      type="button"
                      onClick={switchToRichHtmlMode}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                    >
                      <Palette className="w-3.5 h-3.5" />
                      Add Bold, Brand Colors or Gradients →
                    </button>
                  )}
                </div>
                {mode === "plain" && value.length < 95 ? (
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 text-sm"
                    placeholder="Enter text..."
                    autoFocus
                  />
                ) : (
                  <textarea
                    rows={5}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 text-sm leading-relaxed"
                    placeholder="Enter text..."
                    autoFocus
                  />
                )}
              </div>
            )}

            {/* 2. Rich Brand Design & HTML Editor */}
            {mode === "html" && (
              <div className="space-y-0">
                {/* Row 1: Text Formatting, Lists, Sizes, Canvas Surface Toggle & HTML Source */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 p-2.5 rounded-t-xl bg-slate-100 border border-slate-300 border-b-slate-200">
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => execVisualCommand("bold")}
                      className="p-1.5 rounded hover:bg-white text-slate-800 font-bold"
                      title="Bold (Ctrl+B)"
                    >
                      <Bold className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() =>
                        applySpanStyleToSelection("font-weight: 800;")
                      }
                      className="px-1.5 py-1 rounded hover:bg-white text-slate-800 text-[11px] font-black"
                      title="Extra-Bold (800 Weight)"
                    >
                      B+
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => execVisualCommand("italic")}
                      className="p-1.5 rounded hover:bg-white text-slate-700"
                      title="Italic"
                    >
                      <Italic className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => execVisualCommand("underline")}
                      className="p-1.5 rounded hover:bg-white text-slate-700"
                      title="Underline"
                    >
                      <Underline className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => execVisualCommand("strikeThrough")}
                      className="p-1.5 rounded hover:bg-white text-slate-700"
                      title="Strikethrough"
                    >
                      <Strikethrough className="w-4 h-4" />
                    </button>

                    <span className="w-px h-4 bg-slate-300 mx-0.5" />

                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={handleInsertLineBreak}
                      className="p-1.5 rounded hover:bg-white text-slate-700"
                      title="Insert Line Break (<br>)"
                    >
                      <CornerDownLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => execVisualCommand("insertUnorderedList")}
                      className="p-1.5 rounded hover:bg-white text-slate-700"
                      title="Bullet List"
                    >
                      <List className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => execVisualCommand("insertOrderedList")}
                      className="p-1.5 rounded hover:bg-white text-slate-700"
                      title="Numbered List"
                    >
                      <ListOrdered className="w-4 h-4" />
                    </button>

                    <span className="w-px h-4 bg-slate-300 mx-0.5" />

                    {/* Relative Size Scale */}
                    <div className="inline-flex items-center bg-white rounded border border-slate-200 p-0.5">
                      {FONT_SCALE_OPTIONS.map((opt) => (
                        <button
                          key={opt.label}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() =>
                            applySpanStyleToSelection(`font-size: ${opt.size};`)
                          }
                          className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded"
                          title={`Set selected text size to ${opt.label}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={handleClearFormatting}
                      className="p-1.5 rounded hover:bg-red-50 text-slate-600 hover:text-red-600"
                      title="Clear Formatting on Selection"
                    >
                      <Eraser className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDarkCanvas((d) => !d)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold border transition-colors ${
                        darkCanvas
                          ? "bg-slate-900 text-cyan-300 border-slate-700"
                          : "bg-white text-slate-700 border-slate-200"
                      }`}
                      title="Toggle Dark / Light Preview Background (does not change website background)"
                    >
                      {darkCanvas ? (
                        <Moon className="w-3 h-3" />
                      ) : (
                        <Sun className="w-3 h-3" />
                      )}
                      {darkCanvas ? "Dark Surface" : "Light Surface"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowHtmlSource((s) => !s)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold ${
                        showHtmlSource
                          ? "bg-slate-800 text-white"
                          : "bg-white text-slate-700 border border-slate-200"
                      }`}
                    >
                      <Code className="w-3 h-3" />
                      {showHtmlSource ? "Visual" : "HTML"}
                    </button>
                  </div>
                </div>

                {/* Row 2: Classic Concepts Brand Color Swatches & Signature Gradients */}
                {!showHtmlSource && (
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-50 border-x border-b border-slate-300 text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mr-0.5">
                        Colors:
                      </span>
                      {BRAND_COLOR_SWATCHES.map((swatch) => (
                        <button
                          key={swatch.hex}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => applyTextColor(swatch.hex)}
                          title={`${swatch.name} (${swatch.hex}) — Select text & click`}
                          className="w-5 h-5 rounded-full border border-slate-300 shadow-2xs hover:scale-125 transition-transform shrink-0"
                          style={{ backgroundColor: swatch.hex }}
                        />
                      ))}

                      {/* Custom Color Picker */}
                      <label
                        onMouseDown={() => saveCurrentSelection()}
                        title="Pick any custom text color"
                        className="relative inline-flex items-center justify-center w-6 h-5 rounded border border-slate-300 bg-white hover:bg-slate-100 cursor-pointer text-slate-700"
                      >
                        <Palette className="w-3.5 h-3.5" />
                        <input
                          ref={colorPickerInputRef}
                          type="color"
                          value={customHex}
                          onChange={(e) => {
                            setCustomHex(e.target.value);
                            applyTextColor(e.target.value);
                          }}
                          className="sr-only"
                        />
                      </label>
                    </div>

                    {/* Signature Brand Text Gradients */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Gradients:
                      </span>
                      {BRAND_GRADIENTS.map((grad) => (
                        <button
                          key={grad.name}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => applySpanStyleToSelection(grad.css)}
                          title={`Apply ${grad.name} gradient to selected text`}
                          className="px-2 py-0.5 rounded-full text-[10px] font-extrabold text-white shadow-2xs hover:scale-105 transition-transform"
                          style={{ backgroundImage: grad.preview }}
                        >
                          {grad.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {showHtmlSource ? (
                  <textarea
                    rows={7}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-b-xl border border-t-0 border-slate-300 font-mono text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <div
                    ref={visualRef}
                    contentEditable
                    suppressContentEditableWarning
                    style={mirroredCanvasTypography}
                    onMouseUp={saveCurrentSelection}
                    onKeyUp={saveCurrentSelection}
                    onBlur={saveCurrentSelection}
                    onInput={syncVisualDomToState}
                    className={`min-h-[150px] max-h-[280px] overflow-y-auto px-4 py-3.5 rounded-b-xl border border-t-0 border-slate-300 text-base leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 transition-colors ${
                      darkCanvas
                        ? "bg-[#070b14] text-white"
                        : "bg-white text-slate-900"
                    }`}
                  />
                )}
                <p className="text-[11px] text-slate-500 pt-1.5">
                  Tip: Highlight any word or letter above and click a{" "}
                  <strong>Brand Color</strong>, <strong>Gradient</strong>, or{" "}
                  <strong>Bold</strong> button — exact website colors &amp;
                  design styling are retained automatically.
                </p>
              </div>
            )}

            {/* 3. Bullet List Editor */}
            {mode === "bullets" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Structured Bullet Points (
                    {bullets.filter((b) => b.trim()).length})
                  </label>
                  <button
                    type="button"
                    onClick={() => setBullets((prev) => [...prev, ""])}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Bullet
                  </button>
                </div>

                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {bullets.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="mt-2.5 w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => {
                          const next = [...bullets];
                          next[idx] = e.target.value;
                          setBullets(next);
                        }}
                        onPaste={(e) => {
                          const pasted = e.clipboardData.getData("text");
                          if (pasted.includes("\n")) {
                            e.preventDefault();
                            const split = extractBulletsFromContent(pasted);
                            if (split.length > 0) {
                              const next = [...bullets];
                              next.splice(idx, 1, ...split);
                              setBullets(next);
                            }
                          }
                        }}
                        placeholder="e.g., Material: Crafted from 12mm imported cast clear acrylic"
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500"
                      />
                      <div className="flex items-center gap-0.5 shrink-0 mt-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => {
                            if (idx === 0) return;
                            const next = [...bullets];
                            [next[idx - 1], next[idx]] = [
                              next[idx],
                              next[idx - 1],
                            ];
                            setBullets(next);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                          title="Move up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === bullets.length - 1}
                          onClick={() => {
                            if (idx === bullets.length - 1) return;
                            const next = [...bullets];
                            [next[idx + 1], next[idx]] = [
                              next[idx],
                              next[idx + 1],
                            ];
                            setBullets(next);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                          title="Move down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setBullets((prev) =>
                              prev.length > 1
                                ? prev.filter((_, i) => i !== idx)
                                : [""]
                            )
                          }
                          className="p-1 text-slate-400 hover:text-red-600"
                          title="Remove bullet"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500">
                  Tip: Use <strong>Label: Detail</strong> (for example,{" "}
                  <em>Finish: Diamond-polished edges</em>) to highlight key
                  specs automatically. You can also paste multiple lines at
                  once.
                </p>
              </div>
            )}

            {/* 4. Image Upload + Cropper Editor */}
            {mode === "image" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col items-center justify-center min-h-[190px]">
                  {value ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={value}
                      alt={request.title}
                      className="max-h-52 object-contain rounded-lg shadow-xs bg-white"
                    />
                  ) : (
                    <div className="text-center text-slate-400 py-8">
                      <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-60" />
                      <p className="text-sm">No image selected yet</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFilePicked}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={uploadingImage}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-xs disabled:opacity-60 transition-colors"
                  >
                    {uploadingImage ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {uploadingImage ? "Uploading..." : "Upload & Crop New Image"}
                  </button>
                  <span className="text-xs text-slate-500">
                    Auto-compressed to crisp WebP/JPEG for fast loading
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Or Image URL / Path
                  </label>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="/uploads/... or https://..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* ACRIO Co-Pilot Panel (for all text/html/bullets modes) */}
            {mode !== "image" && (
              <div className="rounded-xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/70 via-white to-violet-50/60 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-indigo-900 font-semibold text-sm">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>ACRIO Copy &amp; Style Co-Pilot</span>
                  </div>
                  {!aiConfigured && (
                    <a
                      href="/admin/settings#ai-settings"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 hover:text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full"
                    >
                      Configure API Key
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {/* Quick Preset Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {AI_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      disabled={aiLoading}
                      onClick={() =>
                        runAiAssist(preset.instruction, preset.kind)
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-white hover:bg-indigo-600 text-slate-700 hover:text-white border border-indigo-200 shadow-2xs transition-colors disabled:opacity-50"
                    >
                      <Wand2 className="w-3 h-3" />
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Custom Prompt Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void runAiAssist(aiPrompt, "preserve");
                      }
                    }}
                    placeholder="Talk to ACRIO to write or style (e.g., 'Make this simpler and highlight key words in blue')..."
                    className="flex-1 px-3 py-2 rounded-xl border border-indigo-200 bg-white text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    disabled={aiLoading || !aiPrompt.trim()}
                    onClick={() => runAiAssist(aiPrompt, "preserve")}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold disabled:opacity-50 shrink-0 transition-colors"
                  >
                    {aiLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    Generate
                  </button>
                </div>

                {/* AI Result Preview (rendered with live dark/light theme & HTML styling!) */}
                {aiPreview && (
                  <div className="rounded-xl bg-white border border-indigo-200 p-3.5 space-y-2.5 shadow-xs">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-semibold text-indigo-700">
                        Suggested Output ({aiSourceLabel})
                      </span>
                      <button
                        type="button"
                        onClick={() => setAiPreview(null)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        Dismiss
                      </button>
                    </div>
                    {/<(ul|ol|li|strong|b|em|span|br|p)\b/i.test(aiPreview) ? (
                      <div
                        style={mirroredCanvasTypography}
                        className={`text-sm p-3 rounded-lg [&_ul]:list-disc [&_ul]:pl-5 ${
                          darkCanvas
                            ? "bg-[#070b14] text-white"
                            : "bg-slate-50 text-slate-900"
                        }`}
                        dangerouslySetInnerHTML={{ __html: aiPreview }}
                      />
                    ) : (
                      <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {aiPreview}
                      </p>
                    )}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={applyAiPreview}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Apply Styled Output
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 hidden sm:inline">
                Changes save live with full styling &amp; colors
              </span>
              {request.canResetToDefault &&
                request.target.kind === "site_content" && (
                  <button
                    type="button"
                    disabled={saving || resetting}
                    onClick={handleResetToDefault}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-amber-700 hover:bg-amber-50 border border-amber-200 transition-colors disabled:opacity-50"
                    title="Revert this element back to its original coded design default"
                  >
                    {resetting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3.5 h-3.5" />
                    )}
                    Reset to Default Design
                  </button>
                )}
            </div>
            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                disabled={saving || resetting}
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-200/70 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || resetting || uploadingImage}
                onClick={handleSave}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm disabled:opacity-60 transition-colors"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {pendingCropFile && (
        <ImageCropperModal
          file={pendingCropFile}
          defaultAspectRatio={request.aspectRatio}
          aspectLabel={request.title}
          onCancel={() => setPendingCropFile(null)}
          onComplete={(croppedFile: File) => void uploadPreparedFile(croppedFile)}
          onSkipCrop={(originalFile: File) => void uploadPreparedFile(originalFile)}
        />
      )}
    </>
  );
}
