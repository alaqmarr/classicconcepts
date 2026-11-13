"use client";

import React, { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { useInlineEdit } from "./InlineEditProvider";
import type { InlineEditTarget } from "./types";

interface EditableImageProps {
  contentKey?: string;
  settingField?: string;
  entity?: {
    model: string;
    id: string;
    field: string;
  };
  productPatch?: {
    productId: string;
    field: string;
  };
  src: string | null | undefined;
  alt: string;
  label?: string;
  aspectRatio?: number;
  className?: string;
  wrapperClassName?: string;
  /** Optional custom JSX rendered when `src` is empty/null */
  emptyPlaceholder?: React.ReactNode;
}

export function EditableImage({
  contentKey,
  settingField,
  entity,
  productPatch,
  src,
  alt,
  label = "Change Image",
  aspectRatio,
  className = "",
  wrapperClassName = "relative",
  emptyPlaceholder,
}: EditableImageProps) {
  const {
    editMode,
    openEditor,
    siteContent,
    siteSettings,
    recordSiteContentSave,
    recordSiteSettingSave,
  } = useInlineEdit();

  const dbResolvedSrc = (() => {
    if (
      contentKey &&
      siteContent &&
      Object.prototype.hasOwnProperty.call(siteContent, contentKey) &&
      siteContent[contentKey]
    ) {
      return siteContent[contentKey];
    }
    if (
      settingField &&
      siteSettings &&
      typeof siteSettings[settingField] === "string" &&
      (siteSettings[settingField] as string).trim() !== ""
    ) {
      return String(siteSettings[settingField]);
    }
    return src || "";
  })();

  const [localSrc, setLocalSrc] = useState(dbResolvedSrc);
  const [wasEditedSession, setWasEditedSession] = useState(false);

  useEffect(() => {
    if (!wasEditedSession) {
      setLocalSrc(dbResolvedSrc);
    }
  }, [dbResolvedSrc, wasEditedSession]);

  const target: InlineEditTarget | null = contentKey
    ? { kind: "site_content", key: contentKey, contentType: "image" }
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

  if (!editMode || !target) {
    if (!localSrc && emptyPlaceholder) {
      return <>{emptyPlaceholder}</>;
    }
    if (!localSrc) {
      return null;
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={localSrc} alt={alt} className={className} />
    );
  }

  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openEditor({
      title: label,
      mode: "image",
      initialValue: localSrc,
      target,
      aspectRatio,
      onSaved: (nextUrl) => {
        setLocalSrc(nextUrl);
        setWasEditedSession(true);
        if (contentKey) {
          recordSiteContentSave(contentKey, nextUrl);
        } else if (settingField) {
          recordSiteSettingSave(settingField, nextUrl);
        }
      },
    });
  };

  return (
    <div
      className={`${wrapperClassName} group/iimg hover:outline-2 hover:outline-dashed hover:outline-indigo-500 rounded-lg`}
    >
      {localSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={localSrc} alt={alt} className={className} />
      ) : (
        emptyPlaceholder || (
          <div className="w-full h-full min-h-[80px] flex items-center justify-center bg-slate-100 text-slate-400 text-xs font-semibold">
            Click Edit Image to Upload
          </div>
        )
      )}
      <button
        type="button"
        onClick={handleOpen}
        title={label}
        className="opacity-0 group-hover/iimg:opacity-100 focus:opacity-100 absolute top-2 right-2 z-30 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-lg border border-white/80 cursor-pointer transition-all"
      >
        <Pencil className="w-3 h-3" />
        <span>{localSrc ? "Edit Image" : "Upload Image"}</span>
      </button>
    </div>
  );
}
