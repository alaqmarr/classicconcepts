/**
 * Utility functions for handling media types (PDFs, Images, Documents, Videos)
 */

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
  return (
    /\.(mp4|webm|ogg|mov)$/i.test(clean) ||
    url.includes("youtube.com") ||
    url.includes("youtu.be") ||
    url.includes("vimeo.com")
  );
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
