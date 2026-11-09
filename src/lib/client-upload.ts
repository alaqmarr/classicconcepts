"use client";

/**
 * Compresses large raster images (JPEG/PNG/WEBP > 900KB or > maxDimension) in the browser
 * before uploading so 20MB DSLR/Canva files become crisp ~250-500KB web assets and never
 * trip Nginx or proxy body-size limits. Preserves full alpha transparency via WebP for PNG/WebP.
 */
export async function compressRasterImageIfNeeded(
  file: File,
  maxDimension = 2000
): Promise<File> {
  if (
    !file.type.startsWith("image/") ||
    file.type === "image/gif" ||
    file.type === "image/svg+xml"
  ) {
    return file;
  }

  // Small web-ready files under 900KB pass straight through unless huge dimensions
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not decode image"));
      el.src = objectUrl;
    });

    const nw = img.naturalWidth || img.width;
    const nh = img.naturalHeight || img.height;
    const needsResize = Math.max(nw, nh) > maxDimension;
    const needsByteCompression = file.size > 900 * 1024;

    if (!needsResize && !needsByteCompression) {
      return file;
    }

    const scale = needsResize ? maxDimension / Math.max(nw, nh) : 1;
    const outW = Math.max(1, Math.round(nw * scale));
    const outH = Math.max(1, Math.round(nh * scale));

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, outW, outH);

    // WebP preserves alpha transparency for PNG/WebP while compressing 10x smaller than raw PNG
    const outMime =
      file.type === "image/png" || file.type === "image/webp"
        ? "image/webp"
        : "image/jpeg";
    const ext = outMime === "image/webp" ? "webp" : "jpg";

    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Canvas compression failed"))),
        outMime,
        0.9
      );
    });

    // Only keep compressed output if it is actually smaller or resized
    if (blob.size >= file.size && !needsResize) {
      return file;
    }

    const baseName = file.name.replace(/\.[^/.]+$/, "");
    return new File([blob], `${baseName}.${ext}`, { type: outMime });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Uploads a file to `/api/upload` and safely parses JSON or HTML proxy errors (e.g. 413 / 502 / 401)
 * into clear human-readable messages.
 */
export async function uploadAdminFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  const text = await res.text();
  let data: { url?: string; error?: string } | null = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    if (res.status === 413) {
      throw new Error(
        "File is too large for the web server limit (HTTP 413). Please try a smaller file."
      );
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        "Your admin session has expired. Please refresh the page and sign in again."
      );
    }
    throw new Error(`Upload failed (HTTP ${res.status}). Please try again.`);
  }

  if (!res.ok || !data?.url) {
    throw new Error(data?.error || `Upload failed (HTTP ${res.status}).`);
  }

  return data.url;
}
