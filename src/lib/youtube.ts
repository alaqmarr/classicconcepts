export type VideoOrientation = "landscape" | "vertical";

export type VideoPlatform =
  | "youtube"
  | "youtube-short"
  | "instagram-reel"
  | "instagram-post"
  | "vimeo"
  | "facebook"
  | "facebook-reel"
  | "dailymotion"
  | "loom"
  | "gdrive"
  | "streamable"
  | "wistia"
  | "tiktok"
  | "linkedin"
  | "twitter"
  | "direct-video"
  | "external-embed";

export interface ResolvedVideoItem {
  rawInput: string;
  embedUrl: string;
  originalUrl: string;
  platform: VideoPlatform;
  platformLabel: string;
  orientation: VideoOrientation;
  renderKind: "iframe" | "video";
}

function parseYouTubeStartSeconds(raw: string | null): number | null {
  if (!raw) return null;
  const trimmed = raw.trim().toLowerCase();
  if (/^\d+$/.test(trimmed)) {
    const sec = parseInt(trimmed, 10);
    return sec > 0 ? sec : null;
  }
  const match = trimmed.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/);
  if (!match) return null;
  const hours = parseInt(match[1] || "0", 10);
  const mins = parseInt(match[2] || "0", 10);
  const secs = parseInt(match[3] || "0", 10);
  const total = hours * 3600 + mins * 60 + secs;
  return total > 0 ? total : null;
}

/**
 * Extracts a clean URL from pasted HTML snippets (<iframe src="..."> or Instagram <blockquote data-instgrm-permalink="...">)
 */
export function extractUrlFromEmbedSnippet(input: string): {
  url: string;
  hintedVertical: boolean;
} {
  const trimmed = input.trim();

  // Instagram embed blockquote
  const igMatch = trimmed.match(/data-instgrm-permalink=["']([^"']+)["']/i);
  if (igMatch?.[1]) {
    return {
      url: igMatch[1].replace(/&amp;/g, "&").trim(),
      hintedVertical: true,
    };
  }

  // TikTok embed blockquote
  const ttMatch = trimmed.match(/cite=["'](https?:\/\/[^"']*tiktok\.com[^"']+)["']/i);
  if (ttMatch?.[1]) {
    return {
      url: ttMatch[1].replace(/&amp;/g, "&").trim(),
      hintedVertical: true,
    };
  }

  // Generic <iframe ... src="...">
  if (/<iframe\b/i.test(trimmed)) {
    const srcMatch = trimmed.match(/\bsrc=["']([^"']+)["']/i);
    const widthMatch = trimmed.match(/\bwidth=["']?(\d+)["']?/i);
    const heightMatch = trimmed.match(/\bheight=["']?(\d+)["']?/i);
    const w = widthMatch ? parseInt(widthMatch[1], 10) : 0;
    const h = heightMatch ? parseInt(heightMatch[1], 10) : 0;
    if (srcMatch?.[1]) {
      return {
        url: srcMatch[1].replace(/&amp;/g, "&").trim(),
        hintedVertical: w > 0 && h > w,
      };
    }
  }

  return { url: trimmed, hintedVertical: false };
}

/**
 * Checks whether an input looks like a disallowed local/uploaded file URL rather than an external video link.
 */
export function isUploadedOrLocalVideoInput(input: string): boolean {
  const clean = input.trim().toLowerCase();
  if (!clean) return false;
  if (
    clean.startsWith("/uploads/") ||
    clean.startsWith("uploads/") ||
    clean.startsWith("blob:") ||
    clean.startsWith("file:") ||
    clean.startsWith("data:")
  ) {
    return true;
  }
  const r2Public =
    typeof process !== "undefined" && process.env?.NEXT_PUBLIC_R2_PUBLIC_URL
      ? process.env.NEXT_PUBLIC_R2_PUBLIC_URL.toLowerCase()
      : "";
  if (r2Public && clean.startsWith(r2Public)) {
    return true;
  }
  return false;
}

/**
 * Resolves any external video URL or embed snippet (YouTube, YouTube Shorts, Instagram Reels/Posts,
 * Vimeo, Facebook Reels/Videos, Google Drive, Loom, Dailymotion, TikTok, Streamable, Wistia, LinkedIn,
 * X/Twitter, Cloudflare/Bunny/Canva iframe embeds, or external direct MP4/WebM streams) into a structured player config.
 */
export function resolveVideoEmbed(
  rawInput: string | null | undefined
): ResolvedVideoItem | null {
  if (!rawInput) return null;
  const trimmedRaw = rawInput.trim();
  if (!trimmedRaw) return null;

  if (isUploadedOrLocalVideoInput(trimmedRaw)) {
    return null;
  }

  const { url: extracted, hintedVertical } = extractUrlFromEmbedSnippet(trimmedRaw);
  if (!extracted || isUploadedOrLocalVideoInput(extracted)) {
    return null;
  }

  // Support bare 11-character YouTube Video ID (e.g. "dQw4w9WgXcQ")
  if (/^[A-Za-z0-9_-]{11}$/.test(extracted)) {
    return {
      rawInput: trimmedRaw,
      embedUrl: `https://www.youtube.com/embed/${extracted}?rel=0&playsinline=1`,
      originalUrl: `https://www.youtube.com/watch?v=${extracted}`,
      platform: "youtube",
      platformLabel: "YouTube",
      orientation: "landscape",
      renderKind: "iframe",
    };
  }

  const normalizedUrl = /^https?:\/\//i.test(extracted)
    ? extracted
    : extracted.startsWith("//")
    ? `https:${extracted}`
    : /^(www\.|youtube\.com|youtu\.be|m\.youtube\.com|instagram\.com|vimeo\.com|fb\.watch|facebook\.com|loom\.com|dailymotion\.com|dai\.ly|drive\.google\.com|tiktok\.com|streamable\.com)/i.test(
        extracted
      )
    ? `https://${extracted}`
    : extracted;

  let parsed: URL;
  try {
    parsed = new URL(normalizedUrl);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return null;
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  const pathname = parsed.pathname;
  const pathSegments = pathname.split("/").filter(Boolean);

  // 1. YouTube & YouTube Shorts
  if (
    host === "youtu.be" ||
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "music.youtube.com" ||
    host === "youtube-nocookie.com"
  ) {
    let videoId: string | null = null;
    let isShort = false;

    if (host === "youtu.be") {
      videoId = pathSegments[0] || null;
    } else if (pathSegments[0] === "shorts" && pathSegments[1]) {
      videoId = pathSegments[1];
      isShort = true;
    } else if (
      (pathSegments[0] === "embed" ||
        pathSegments[0] === "live" ||
        pathSegments[0] === "v" ||
        pathSegments[0] === "e") &&
      pathSegments[1]
    ) {
      videoId = pathSegments[1];
    } else {
      videoId = parsed.searchParams.get("v");
    }

    if (videoId) {
      const cleanId = videoId.replace(/[^A-Za-z0-9_-]/g, "");
      if (cleanId) {
        const startSec =
          parseYouTubeStartSeconds(parsed.searchParams.get("t")) ||
          parseYouTubeStartSeconds(parsed.searchParams.get("start"));
        const params = new URLSearchParams({
          rel: "0",
          playsinline: "1",
        });
        if (startSec) params.set("start", String(startSec));

        return {
          rawInput: trimmedRaw,
          embedUrl: `https://www.youtube.com/embed/${cleanId}?${params.toString()}`,
          originalUrl: isShort
            ? `https://www.youtube.com/shorts/${cleanId}`
            : `https://www.youtube.com/watch?v=${cleanId}`,
          platform: isShort ? "youtube-short" : "youtube",
          platformLabel: isShort ? "YouTube Short" : "YouTube",
          orientation: isShort || hintedVertical ? "vertical" : "landscape",
          renderKind: "iframe",
        };
      }
    }
  }

  // 2. Instagram Reels, Posts & IGTV
  if (host === "instagram.com" || host === "instagr.am" || host.endsWith(".instagram.com")) {
    // Supports /reel/{code}, /reels/{code}, /p/{code}, /tv/{code}, and /{username}/reel/{code}
    const kindIdx = pathSegments.findIndex((seg) =>
      ["reel", "reels", "p", "tv"].includes(seg.toLowerCase())
    );
    if (kindIdx !== -1 && pathSegments[kindIdx + 1]) {
      const rawKind = pathSegments[kindIdx].toLowerCase();
      const shortcode = pathSegments[kindIdx + 1].replace(/[^A-Za-z0-9_-]/g, "");
      if (shortcode) {
        const isReel = rawKind === "reel" || rawKind === "reels" || rawKind === "tv";
        const embedKind = rawKind === "reels" ? "reel" : rawKind;
        return {
          rawInput: trimmedRaw,
          embedUrl: `https://www.instagram.com/${embedKind}/${shortcode}/embed/`,
          originalUrl: `https://www.instagram.com/${embedKind}/${shortcode}/`,
          platform: isReel ? "instagram-reel" : "instagram-post",
          platformLabel: isReel ? "Instagram Reel" : "Instagram Video",
          orientation: "vertical",
          renderKind: "iframe",
        };
      }
    }
  }

  // 3. Vimeo (Standard, Unlisted with hash, Player URL, Channels)
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    if (host === "player.vimeo.com" && pathSegments[0] === "video" && pathSegments[1]) {
      const id = pathSegments[1].replace(/\D/g, "");
      const h = parsed.searchParams.get("h");
      if (id) {
        return {
          rawInput: trimmedRaw,
          embedUrl: `https://player.vimeo.com/video/${id}${h ? `?h=${encodeURIComponent(h)}` : ""}`,
          originalUrl: `https://vimeo.com/${id}`,
          platform: "vimeo",
          platformLabel: "Vimeo",
          orientation: hintedVertical ? "vertical" : "landscape",
          renderKind: "iframe",
        };
      }
    } else {
      // Find numeric video ID in segments (e.g. /123456789 or /123456789/abcdef or /channels/staffpicks/123456789)
      const numericIdx = pathSegments.findIndex((seg) => /^\d{6,}$/.test(seg));
      if (numericIdx !== -1) {
        const id = pathSegments[numericIdx];
        const maybeHash = pathSegments[numericIdx + 1];
        const hashParam =
          maybeHash && /^[A-Za-z0-9]+$/.test(maybeHash)
            ? `?h=${encodeURIComponent(maybeHash)}`
            : parsed.searchParams.get("h")
            ? `?h=${encodeURIComponent(parsed.searchParams.get("h")!)}`
            : "";
        return {
          rawInput: trimmedRaw,
          embedUrl: `https://player.vimeo.com/video/${id}${hashParam}`,
          originalUrl: `https://vimeo.com/${id}`,
          platform: "vimeo",
          platformLabel: "Vimeo",
          orientation: hintedVertical ? "vertical" : "landscape",
          renderKind: "iframe",
        };
      }
    }
  }

  // 4. Facebook Videos & Facebook Reels
  if (
    host === "facebook.com" ||
    host === "m.facebook.com" ||
    host === "web.facebook.com" ||
    host === "fb.watch"
  ) {
    if (pathname.includes("/plugins/video.php")) {
      const innerHref = parsed.searchParams.get("href") || normalizedUrl;
      const isReel = /\/reel(s)?\/|\/share\/r\//i.test(innerHref);
      return {
        rawInput: trimmedRaw,
        embedUrl: normalizedUrl,
        originalUrl: innerHref,
        platform: isReel ? "facebook-reel" : "facebook",
        platformLabel: isReel ? "Facebook Reel" : "Facebook Video",
        orientation: isReel || hintedVertical ? "vertical" : "landscape",
        renderKind: "iframe",
      };
    }

    const isReel =
      pathSegments[0] === "reel" ||
      pathSegments[0] === "reels" ||
      (pathSegments[0] === "share" && pathSegments[1] === "r");
    return {
      rawInput: trimmedRaw,
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
        normalizedUrl
      )}&show_text=false`,
      originalUrl: normalizedUrl,
      platform: isReel ? "facebook-reel" : "facebook",
      platformLabel: isReel ? "Facebook Reel" : "Facebook Video",
      orientation: isReel || hintedVertical ? "vertical" : "landscape",
      renderKind: "iframe",
    };
  }

  // 5. Dailymotion
  if (host === "dailymotion.com" || host === "dai.ly") {
    let dmId: string | null = null;
    if (host === "dai.ly") {
      dmId = pathSegments[0] || null;
    } else if (pathSegments[0] === "embed" && pathSegments[1] === "video" && pathSegments[2]) {
      dmId = pathSegments[2];
    } else if (pathSegments[0] === "video" && pathSegments[1]) {
      dmId = pathSegments[1].split("_")[0];
    }
    if (dmId) {
      return {
        rawInput: trimmedRaw,
        embedUrl: `https://www.dailymotion.com/embed/video/${encodeURIComponent(dmId)}`,
        originalUrl: `https://www.dailymotion.com/video/${encodeURIComponent(dmId)}`,
        platform: "dailymotion",
        platformLabel: "Dailymotion",
        orientation: hintedVertical ? "vertical" : "landscape",
        renderKind: "iframe",
      };
    }
  }

  // 6. Loom
  if (host === "loom.com" || host.endsWith(".loom.com")) {
    if ((pathSegments[0] === "share" || pathSegments[0] === "embed") && pathSegments[1]) {
      const loomId = pathSegments[1].replace(/[^A-Za-z0-9_-]/g, "");
      if (loomId) {
        return {
          rawInput: trimmedRaw,
          embedUrl: `https://www.loom.com/embed/${loomId}`,
          originalUrl: `https://www.loom.com/share/${loomId}`,
          platform: "loom",
          platformLabel: "Loom",
          orientation: hintedVertical ? "vertical" : "landscape",
          renderKind: "iframe",
        };
      }
    }
  }

  // 7. Google Drive Shared Video
  if (host === "drive.google.com") {
    let fileId: string | null = null;
    if (pathSegments[0] === "file" && pathSegments[1] === "d" && pathSegments[2]) {
      fileId = pathSegments[2];
    } else if (parsed.searchParams.get("id")) {
      fileId = parsed.searchParams.get("id");
    }
    if (fileId) {
      const cleanId = fileId.replace(/[^A-Za-z0-9_-]/g, "");
      return {
        rawInput: trimmedRaw,
        embedUrl: `https://drive.google.com/file/d/${cleanId}/preview`,
        originalUrl: `https://drive.google.com/file/d/${cleanId}/view`,
        platform: "gdrive",
        platformLabel: "Google Drive Video",
        orientation: hintedVertical ? "vertical" : "landscape",
        renderKind: "iframe",
      };
    }
  }

  // 8. Streamable
  if (host === "streamable.com") {
    const streamId =
      pathSegments[0] === "e" || pathSegments[0] === "o"
        ? pathSegments[1]
        : pathSegments[0];
    if (streamId) {
      const cleanId = streamId.replace(/[^A-Za-z0-9_-]/g, "");
      return {
        rawInput: trimmedRaw,
        embedUrl: `https://streamable.com/e/${cleanId}`,
        originalUrl: `https://streamable.com/${cleanId}`,
        platform: "streamable",
        platformLabel: "Streamable",
        orientation: hintedVertical ? "vertical" : "landscape",
        renderKind: "iframe",
      };
    }
  }

  // 9. Wistia
  if (host.endsWith("wistia.com") || host === "fast.wistia.net") {
    const mediasIdx = pathSegments.findIndex((seg) => seg === "medias" || seg === "iframe");
    if (mediasIdx !== -1 && pathSegments[mediasIdx + 1]) {
      const wistiaId = pathSegments[mediasIdx + 1].replace(/[^A-Za-z0-9_-]/g, "");
      if (wistiaId) {
        return {
          rawInput: trimmedRaw,
          embedUrl: `https://fast.wistia.net/embed/iframe/${wistiaId}`,
          originalUrl: normalizedUrl,
          platform: "wistia",
          platformLabel: "Wistia",
          orientation: hintedVertical ? "vertical" : "landscape",
          renderKind: "iframe",
        };
      }
    }
  }

  // 10. TikTok
  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) {
    const videoIdx = pathSegments.findIndex((seg) => seg === "video" || seg === "v2");
    if (videoIdx !== -1 && pathSegments[videoIdx + 1]) {
      const ttId = pathSegments[videoIdx + 1].replace(/\D/g, "");
      if (ttId) {
        return {
          rawInput: trimmedRaw,
          embedUrl: `https://www.tiktok.com/embed/v2/${ttId}`,
          originalUrl: normalizedUrl,
          platform: "tiktok",
          platformLabel: "TikTok",
          orientation: "vertical",
          renderKind: "iframe",
        };
      }
    }
  }

  // 11. LinkedIn Video / Post Embed
  if (host === "linkedin.com" || host.endsWith(".linkedin.com")) {
    if (pathname.startsWith("/embed/feed/update/")) {
      return {
        rawInput: trimmedRaw,
        embedUrl: normalizedUrl,
        originalUrl: normalizedUrl,
        platform: "linkedin",
        platformLabel: "LinkedIn Video",
        orientation: hintedVertical ? "vertical" : "landscape",
        renderKind: "iframe",
      };
    }
    const urnMatch = normalizedUrl.match(/urn:li:(activity|ugcPost):(\d+)/i);
    const activityMatch = normalizedUrl.match(/(?:activity|ugcPost)-(\d{10,})/i);
    if (urnMatch) {
      const urn = `urn:li:${urnMatch[1]}:${urnMatch[2]}`;
      return {
        rawInput: trimmedRaw,
        embedUrl: `https://www.linkedin.com/embed/feed/update/${urn}?compact=1`,
        originalUrl: normalizedUrl,
        platform: "linkedin",
        platformLabel: "LinkedIn Video",
        orientation: "landscape",
        renderKind: "iframe",
      };
    }
    if (activityMatch) {
      const kind = normalizedUrl.toLowerCase().includes("ugcpost-") ? "ugcPost" : "activity";
      return {
        rawInput: trimmedRaw,
        embedUrl: `https://www.linkedin.com/embed/feed/update/urn:li:${kind}:${activityMatch[1]}?compact=1`,
        originalUrl: normalizedUrl,
        platform: "linkedin",
        platformLabel: "LinkedIn Video",
        orientation: "landscape",
        renderKind: "iframe",
      };
    }
  }

  // 12. X / Twitter Status Video
  if (host === "x.com" || host === "twitter.com" || host === "mobile.twitter.com") {
    const statusIdx = pathSegments.findIndex((seg) => seg === "status");
    if (statusIdx !== -1 && pathSegments[statusIdx + 1]) {
      const statusId = pathSegments[statusIdx + 1].replace(/\D/g, "");
      if (statusId) {
        return {
          rawInput: trimmedRaw,
          embedUrl: `https://platform.twitter.com/embed/Tweet.html?id=${statusId}`,
          originalUrl: `https://x.com/i/status/${statusId}`,
          platform: "twitter",
          platformLabel: "X / Twitter Video",
          orientation: "vertical",
          renderKind: "iframe",
        };
      }
    }
  }

  // 13. Direct External Video Stream (.mp4, .webm, .ogg, .mov — strictly external, no uploads)
  const cleanPath = pathname.toLowerCase();
  if (/\.(mp4|webm|ogg|ogv|mov)$/i.test(cleanPath)) {
    return {
      rawInput: trimmedRaw,
      embedUrl: normalizedUrl,
      originalUrl: normalizedUrl,
      platform: "direct-video",
      platformLabel: "External Video Stream",
      orientation: hintedVertical ? "vertical" : "landscape",
      renderKind: "video",
    };
  }

  // 14. Any other external HTTPS embed player URL (e.g. Canva, Vidyard, Bunny Stream, Cloudflare Stream, Rumble)
  return {
    rawInput: trimmedRaw,
    embedUrl: normalizedUrl,
    originalUrl: normalizedUrl,
    platform: "external-embed",
    platformLabel: host.split(".").slice(-2, -1)[0]
      ? `${host.split(".").slice(-2, -1)[0].charAt(0).toUpperCase()}${host
          .split(".")
          .slice(-2, -1)[0]
          .slice(1)} Video`
      : "External Video",
    orientation: hintedVertical ? "vertical" : "landscape",
    renderKind: "iframe",
  };
}

/**
 * Backward-compatible helper used across Infrastructure, Press, Home & legacy callers.
 */
export function getYouTubeEmbedUrl(url: string | null | undefined): string | null {
  const resolved = resolveVideoEmbed(url);
  return resolved ? resolved.embedUrl : null;
}

/**
 * Splits a product's stored `videoUrl` string (single URL or newline-separated multiple URLs)
 * into clean individual raw entries.
 */
export function parseVideoUrlEntries(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const entries = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !isUploadedOrLocalVideoInput(line));
  return Array.from(new Set(entries));
}

/**
 * Serializes an array of external video URLs / embed snippets into the `Product.videoUrl` string column.
 */
export function serializeVideoUrlEntries(entries: string[]): string | null {
  const cleaned = entries
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0 && !isUploadedOrLocalVideoInput(entry));
  const unique = Array.from(new Set(cleaned));
  return unique.length > 0 ? unique.join("\n") : null;
}

/**
 * Resolves all external videos configured on a product.
 */
export function resolveProductVideos(
  raw: string | null | undefined
): ResolvedVideoItem[] {
  const entries = parseVideoUrlEntries(raw);
  const resolved: ResolvedVideoItem[] = [];
  const seenEmbeds = new Set<string>();

  for (const entry of entries) {
    const item = resolveVideoEmbed(entry);
    if (item && !seenEmbeds.has(item.embedUrl)) {
      seenEmbeds.add(item.embedUrl);
      resolved.push(item);
    }
  }
  return resolved;
}
