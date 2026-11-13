/**
 * Utility functions for handling media types (PDFs, Images, Documents, Videos)
 */

import { resolveVideoEmbed } from "@/lib/youtube";

export function isPdfUrl(url?: string | null): boolean {
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  return clean.endsWith(".pdf") || clean.includes(".pdf");
}

export function isImageUrl(url?: string | null): boolean {
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  return /\.(jpg|jpeg|png|webp|gif|svg|avif|ico|bmp|tiff)$/i.test(clean);
}

export function isVideoUrl(url?: string | null): boolean {
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  if (
    /\.(mp4|webm|ogg|mov)$/i.test(clean) ||
    url.includes("youtube.com") ||
    url.includes("youtu.be") ||
    url.includes("instagram.com/reel") ||
    url.includes("instagram.com/p/") ||
    url.includes("instagram.com/tv/") ||
    url.includes("vimeo.com") ||
    url.includes("facebook.com/reel") ||
    url.includes("facebook.com/watch") ||
    url.includes("fb.watch") ||
    url.includes("loom.com") ||
    url.includes("dailymotion.com") ||
    url.includes("dai.ly") ||
    url.includes("tiktok.com") ||
    url.includes("drive.google.com/file/")
  ) {
    return true;
  }
  const resolved = resolveVideoEmbed(url);
  return Boolean(resolved && resolved.platform !== "external-embed");
}

export function getFileNameFromUrl(url?: string | null): string {
  if (!url) return "";
  try {
    const clean = url.split("?")[0];
    const parts = clean.split("/");
    return decodeURIComponent(parts[parts.length - 1] || "");
  } catch {
    return url;
  }
}
