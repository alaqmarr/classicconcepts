import Link from "next/link";
import { ChevronRight } from "lucide-react";
import React from "react";
import {
  getSiteContentMap,
  getContentValue,
  hasContentOverride,
} from "@/lib/site-content";
import { EditableText } from "@/components/inline-edit/EditableText";

type Breadcrumb = {
  label: string;
  href?: string;
};

type PageHeaderProps = {
  breadcrumbs: Breadcrumb[];
  title: React.ReactNode;
  description?: React.ReactNode;
  contentKeyPrefix?: string;
};

function extractPlainTextFromNode(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(extractPlainTextFromNode).join("");
  }
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    return extractPlainTextFromNode(props?.children);
  }
  return "";
}

export async function PageHeader({
  breadcrumbs,
  title,
  description,
  contentKeyPrefix,
}: PageHeaderProps) {
  const content = await getSiteContentMap();

  const autoSlug =
    contentKeyPrefix ||
    `pageheader.${
      breadcrumbs
        .map((b) => b.label.toLowerCase().replace(/[^a-z0-9]+/g, "_"))
        .filter(Boolean)
        .join("_") || "page"
    }`;

  const titleKey = `${autoSlug}.title`;
  const descKey = `${autoSlug}.description`;

  const fallbackTitle = extractPlainTextFromNode(title).trim() || "Page Title";
  const fallbackDesc = extractPlainTextFromNode(description).trim();

  const resolvedTitle = getContentValue(content, titleKey, fallbackTitle);
  const resolvedDesc = getContentValue(content, descKey, fallbackDesc);

  return (
    <section className="relative bg-[#05060A] text-white pt-32 pb-24 overflow-hidden border-b border-white/10 shadow-2xl">
      {/* Dark Mesh Gradient Background (Global Hero Theme) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[30%] -left-[10%] w-[50%] h-[120%] bg-[#3b82f6] rounded-full mix-blend-screen filter blur-[120px] opacity-20"></div>
        <div className="absolute top-[20%] right-[10%] w-[40%] h-[80%] bg-[#e31837] rounded-full mix-blend-screen filter blur-[130px] opacity-20"></div>
        <div className="absolute -bottom-[20%] left-[30%] w-[60%] h-[60%] bg-[#ffdf00] rounded-full mix-blend-screen filter blur-[150px] opacity-[0.15]"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto space-y-6">
          {/* Breadcrumbs */}
          {breadcrumbs.length > 0 && (
            <div className="flex items-center text-sm font-medium text-slate-300 bg-white/10 px-4 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={`${crumb.label}-${index}`}>
                    {crumb.href && !isLast ? (
                      <Link
                        href={crumb.href}
                        className="hover:text-white transition-colors"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-white">{crumb.label}</span>
                    )}

                    {!isLast && (
                      <ChevronRight size={14} className="mx-2 opacity-50" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}

          {/* Title */}
          <EditableText
            as="h1"
            mode="plain"
            contentKey={titleKey}
            label={`Banner Heading (${fallbackTitle})`}
            value={resolvedTitle}
            hasCustomValue={hasContentOverride(content, titleKey)}
            className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight block"
          >
            {title}
          </EditableText>

          {/* Description */}
          {description && (
            <EditableText
              as="p"
              mode="multiline"
              contentKey={descKey}
              label={`Banner Subtitle (${fallbackTitle})`}
              value={resolvedDesc}
              hasCustomValue={hasContentOverride(content, descKey)}
              className="text-lg md:text-xl text-slate-300 max-w-2xl font-light block"
            >
              {description}
            </EditableText>
          )}
        </div>
      </div>
    </section>
  );
}
