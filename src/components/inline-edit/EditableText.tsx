"use client";

import React, { useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { useInlineEdit } from "./InlineEditProvider";
import type {
  InlineEditTarget,
  InlineEditorMode,
  InlinePreviewStyle,
} from "./types";

const PLAIN_ONLY_SETTING_FIELDS = new Set([
  "phone1",
  "phone2",
  "whatsappNumber",
  "email",
  "email2",
  "upiId",
  "upiName",
  "infraVideoUrl",
  "pressVideoUrl",
  "homeVideoUrl",
  "mapEmbedUrl",
]);

function parseRgbLuminance(rgbStr: string): { lum: number; alpha: number } | null {
  const m = rgbStr.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*[,/]\s*([\d.]+))?\s*\)/i
  );
  if (!m) return null;
  const r = Number(m[1]) / 255;
  const g = Number(m[2]) / 255;
  const b = Number(m[3]) / 255;
  const alpha = m[4] !== undefined ? Number(m[4]) : 1;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return { lum, alpha };
}

function detectElementPreviewStyle(el: HTMLElement | null): InlinePreviewStyle {
  if (!el || typeof window === "undefined") return {};
  try {
    const cs = window.getComputedStyle(el);
    const textLum = parseRgbLuminance(cs.color);

    let bgLum: number | null = null;
    let cur: HTMLElement | null = el;
    while (cur && cur !== document.documentElement) {
      const bgCs = window.getComputedStyle(cur);
      const parsed = parseRgbLuminance(bgCs.backgroundColor);
      if (parsed && parsed.alpha > 0.2) {
        bgLum = parsed.lum;
        break;
      }
      cur = cur.parentElement;
    }

    const isLightOnDark =
      (bgLum !== null && bgLum < 0.28) ||
      (bgLum === null && textLum !== null && textLum.alpha > 0.4 && textLum.lum > 0.78);

    return {
      isLightOnDark,
      color: cs.color,
      fontWeight: cs.fontWeight,
      textTransform: cs.textTransform,
      letterSpacing: cs.letterSpacing,
      fontStyle: cs.fontStyle,
    };
  } catch {
    return {};
  }
}

interface EditableTextProps {
  /** Key in SiteContent table (e.g. "home.hero.title") */
  contentKey?: string;
  /** Field in SiteSetting singleton (e.g. "address", "phone1") */
  settingField?: string;
  /** Field on a specific DB entity row */
  entity?: {
    model: string;
    id: string;
    field: string;
  };
  /** Direct field on a Product */
  productPatch?: {
    productId: string;
    field: string;
  };
  /** Current text or HTML value from server */
  value: string;
  /** Human-readable label shown in modal title */
  label?: string;
  /** Wrapper HTML element */
  as?: "span" | "p" | "h1" | "h2" | "h3" | "h4" | "div";
  /** Editor mode */
  mode?: InlineEditorMode;
  className?: string;
  contextHint?: string;
  allowSwitchToHtml?: boolean;
  /**
   * Optional custom JSX children when using default un-edited styling (e.g. multi-color or gradient spans).
   * Automatically yields to database value whenever `SiteContent` has a saved override for `contentKey`.
   */
  children?: React.ReactNode;
  /** Set true when value differs from hardcoded default so custom `children` yields to `value` */
  hasCustomValue?: boolean;
}

export function EditableText({
  contentKey,
  settingField,
  entity,
  productPatch,
  value,
  label = "Edit Content",
  as: Tag = "span",
  mode = "plain",
  className = "",
  contextHint,
  allowSwitchToHtml,
  children,
  hasCustomValue = false,
}: EditableTextProps) {
  const {
    editMode,
    openEditor,
    siteContent,
    siteSettings,
    recordSiteContentSave,
    recordSiteContentReset,
    recordSiteSettingSave,
  } = useInlineEdit();

  // Authoritative Database Lookup via Context:
  // Even if a parent server component forgot to pass `content` or `hasCustomValue`,
  // `siteContent` from RootLayout guarantees every saved DB key is honored across reloads and navigations!
  const hasDbSiteContentKey = Boolean(
    contentKey &&
      siteContent &&
      Object.prototype.hasOwnProperty.call(siteContent, contentKey) &&
      siteContent[contentKey] !== ""
  );

  const dbResolvedValue = (() => {
    if (hasDbSiteContentKey && contentKey) {
      return siteContent[contentKey];
    }
    if (
      settingField &&
      siteSettings &&
      typeof siteSettings[settingField] === "string" &&
      (siteSettings[settingField] as string).trim() !== ""
    ) {
      return String(siteSettings[settingField]).replace(/\\n/g, "\n");
    }
    return value;
  })();

  const [localValue, setLocalValue] = useState(dbResolvedValue);
  const [wasEditedSession, setWasEditedSession] = useState(false);
  const [wasResetSession, setWasResetSession] = useState(false);

  const wrapperRef = useRef<HTMLElement | null>(null);
  const innerRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!wasEditedSession) {
      setLocalValue(dbResolvedValue);
    }
  }, [dbResolvedValue, wasEditedSession]);

  const effectiveAllowHtml =
    allowSwitchToHtml !== undefined
      ? allowSwitchToHtml
      : settingField && PLAIN_ONLY_SETTING_FIELDS.has(settingField)
      ? false
      : Boolean(
          contentKey ||
            mode === "html" ||
            (entity && entity.field.endsWith("Html"))
        );

  const target: InlineEditTarget | null = contentKey
    ? {
        kind: "site_content",
        key: contentKey,
        contentType: mode === "html" ? "html" : "text",
      }
    : settingField
    ? { kind: "site_setting", field: settingField }
    : entity
    ? {
        kind: "entity_field",
        model: entity.model,
        id: entity.id,
        field: entity.field,
      }
    : productPatch
    ? {
        kind: "product_patch",
        productId: productPatch.productId,
        field: productPatch.field,
      }
    : null;

  const isUsingCustomOverride =
    ((hasCustomValue || hasDbSiteContentKey) && !wasResetSession) ||
    wasEditedSession;

  const looksLikeHtml =
    mode === "html" || /<\/?[a-z][\s\S]*>/i.test(localValue || "");

  const hasBlockLevelHtml = /<(p|ul|ol|div|h[1-6]|blockquote|table|section)\b/i.test(
    localValue || ""
  );

  const resolveSafeTag = (): "span" | "p" | "h1" | "h2" | "h3" | "h4" | "div" => {
    if (hasBlockLevelHtml && (Tag === "span" || Tag === "p")) {
      return "div";
    }
    return Tag;
  };

  const shouldRenderHtmlDirectly =
    looksLikeHtml && (!children || isUsingCustomOverride);

  const normalizedDisplayValue = (localValue || "")
    .replace(/&nbsp;|&#160;|&#xa0;/gi, " ")
    .replace(/\u00a0/g, " ");

  // Zero overhead path for normal visitors or when editMode is toggled off
  if (!editMode || !target) {
    if (shouldRenderHtmlDirectly) {
      const SafeTag = resolveSafeTag();
      return (
        <SafeTag
          className={className}
          dangerouslySetInnerHTML={{ __html: normalizedDisplayValue }}
        />
      );
    }
    return (
      <Tag className={className}>
        {children && !isUsingCustomOverride ? children : normalizedDisplayValue}
      </Tag>
    );
  }

  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const previewStyle = detectElementPreviewStyle(wrapperRef.current);

    let initialEditorValue = localValue;
    let initialEditorMode: InlineEditorMode = looksLikeHtml ? "html" : mode;

    // Preserve JSX design language (brand colors, gradients, <strong>, <br>) when editing un-overridden elements!
    if (
      !isUsingCustomOverride &&
      children &&
      innerRef.current &&
      effectiveAllowHtml
    ) {
      const capturedDomHtml = innerRef.current.innerHTML.trim();
      if (/<\/?[a-z][\s\S]*>/i.test(capturedDomHtml)) {
        initialEditorValue = capturedDomHtml;
        initialEditorMode = "html";
      }
    }

    openEditor({
      title: label,
      mode: initialEditorMode,
      initialValue: initialEditorValue,
      target,
      contextHint,
      allowSwitchToHtml: effectiveAllowHtml,
      previewStyle,
      canResetToDefault: Boolean(contentKey && isUsingCustomOverride),
      onSaved: (nextVal) => {
        setLocalValue(nextVal);
        setWasEditedSession(true);
        setWasResetSession(false);
        if (contentKey) {
          recordSiteContentSave(contentKey, nextVal);
        } else if (settingField) {
          recordSiteSettingSave(settingField, nextVal);
        }
      },
      onReset: () => {
        setWasEditedSession(false);
        setWasResetSession(true);
        setLocalValue(value);
        if (contentKey) {
          recordSiteContentReset(contentKey);
        }
      },
    });
  };

  const editWrapperClasses = `${className} relative group/iedit transition-all rounded-md hover:outline-2 hover:outline-dashed hover:outline-indigo-500/75 hover:outline-offset-4`;

  const pencilBadge = (
    <span
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          handleOpen(e as unknown as React.MouseEvent);
        }
      }}
      title={`Edit: ${label}`}
      className="opacity-0 group-hover/iedit:opacity-100 focus:opacity-100 pointer-events-none group-hover/iedit:pointer-events-auto focus:pointer-events-auto absolute -top-3.5 right-0 z-30 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-sans font-semibold leading-none tracking-normal normal-case shadow-lg border border-white/80 cursor-pointer transition-all duration-150 select-none whitespace-nowrap"
    >
      <Pencil className="w-2.5 h-2.5" />
      <span>Edit</span>
    </span>
  );

  const SafeTag = shouldRenderHtmlDirectly ? resolveSafeTag() : Tag;

  if (shouldRenderHtmlDirectly) {
    return (
      <SafeTag
        ref={(node: HTMLElement | null) => {
          wrapperRef.current = node;
        }}
        className={editWrapperClasses}
      >
        <span
          ref={innerRef}
          className="contents"
          dangerouslySetInnerHTML={{ __html: normalizedDisplayValue }}
        />
        {pencilBadge}
      </SafeTag>
    );
  }

  return (
    <SafeTag
      ref={(node: HTMLElement | null) => {
        wrapperRef.current = node;
      }}
      className={editWrapperClasses}
    >
      <span ref={innerRef} className="contents">
        {children && !isUsingCustomOverride ? children : normalizedDisplayValue}
      </span>
      {pencilBadge}
    </SafeTag>
  );
}
