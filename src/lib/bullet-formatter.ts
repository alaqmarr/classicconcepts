/**
 * Isomorphic Bullet-Point Formatting & Parsing Utilities
 * Ensures all product descriptions render and save as clean, structured bullet points
 * while retaining inline rich formatting (bold, italic, brand colors, gradients).
 */

const PROTECTED_ABBREVIATIONS = [
  "pvt.",
  "ltd.",
  "sq.",
  "ft.",
  "mm.",
  "cm.",
  "in.",
  "mr.",
  "mrs.",
  "ms.",
  "dr.",
  "no.",
  "rs.",
  "approx.",
  "incl.",
  "excl.",
  "vs.",
  "etc.",
  "e.g.",
  "i.e.",
  "co.",
  "inc.",
  "st.",
  "mt.",
  "wt.",
  "ht.",
];

export function escapeHtmlBasic(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeNonBreakingSpaces(str: string): string {
  return (str || "")
    .replace(/&nbsp;|&#160;|&#xa0;/gi, " ")
    .replace(/\u00a0/g, " ");
}

function decodeHtmlEntities(str: string): string {
  return normalizeNonBreakingSpaces(str)
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/>/g, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&rsquo;/gi, "'")
    .replace(/&ldquo;|&rdquo;/gi, '"')
    .replace(/&ndash;/gi, "–")
    .replace(/&mdash;/gi, "—");
}

function stripLeadingBulletMarker(line: string): string {
  return line
    .replace(/^[\s•●▪▸►✓✔✦★\-–—*]+/, "")
    .replace(/^\d+[\.\)]\s+/, "")
    .trim();
}

export function stripAllHtmlTags(str: string): string {
  return decodeHtmlEntities(
    (str || "")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
  ).trim();
}

/**
 * Sanitizes inline HTML inside a bullet item: preserves safe inline styling tags
 * (`<strong>`, `<b>`, `<em>`, `<i>`, `<u>`, `<s>`, `<span style="..." class="...">`),
 * normalizes `<font color="...">` to `<span style="color:...">`, and strips scripts/events.
 */
export function sanitizeInlineFormatting(raw: string): string {
  if (!raw) return "";
  let cleaned = normalizeNonBreakingSpaces(raw)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(
      /<font\b([^>]*)>([\s\S]*?)<\/font>/gi,
      (_full, attrs: string, inner: string) => {
        const colorMatch = attrs.match(/color=["']?([^"'\s>]+)["']?/i);
        return colorMatch?.[1]
          ? `<span style="color: ${colorMatch[1]};">${inner}</span>`
          : inner;
      }
    )
    // Strip block wrappers inside a single bullet item while keeping inner content
    .replace(/<\/?(p|div|ul|ol|li|h[1-6])\b[^>]*>/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Support **bold** markdown shorthand
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return cleaned;
}

function hasInlineRichFormatting(str: string): boolean {
  return /<(span|strong|b|em|i|u|s|font)\b/i.test(str || "");
}

function splitParagraphIntoSentenceBullets(paragraph: string): string[] {
  const cleaned = paragraph.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  if (cleaned.length <= 150) return [cleaned];

  let working = cleaned;
  PROTECTED_ABBREVIATIONS.forEach((abbr, idx) => {
    const escaped = abbr.replace(/\./g, "\\.");
    const regex = new RegExp(`\\b${escaped}`, "gi");
    working = working.replace(regex, (m) => m.replace(/\./g, `__DOT${idx}__`));
  });

  working = working.replace(/(\d)\.(\d)/g, "$1__DECDOT__$2");

  const rawParts = working
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])/)
    .map((part) => {
      let restored = part.replace(/__DECDOT__/g, ".");
      PROTECTED_ABBREVIATIONS.forEach((_, idx) => {
        restored = restored.replace(new RegExp(`__DOT${idx}__`, "g"), ".");
      });
      return stripLeadingBulletMarker(restored);
    })
    .filter((s) => s.length >= 3);

  return rawParts.length > 0 ? rawParts : [cleaned];
}

/**
 * Extracts structured bullet strings from ANY HTML or plain-text description.
 * Preserves custom inline bold/color/gradient spans inside `<li>` items while
 * cleanly unwrapping standard `<strong>Label:</strong> Value` prefixes for easy editing.
 */
export function extractBulletsFromContent(
  primaryHtmlOrText?: string | null,
  fallbackText?: string | null
): string[] {
  const source = normalizeNonBreakingSpaces(
    (primaryHtmlOrText || "").trim() || (fallbackText || "").trim()
  );
  if (!source) return [];

  // 1. If HTML contains explicit <li> items, extract them first
  const liMatches = Array.from(source.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi));
  if (liMatches.length > 0) {
    const bullets = liMatches
      .map((m) => {
        const rawInner = sanitizeInlineFormatting(m[1]);
        // Check if the ONLY tag is a leading `<strong>Label:</strong> Rest`
        const leadOnlyMatch = rawInner.match(
          /^<(?:strong|b)>([^<>:]{1,42}:?)<\/(?:strong|b)>\s*:?\s*([\s\S]*)$/i
        );
        if (leadOnlyMatch && !hasInlineRichFormatting(leadOnlyMatch[2])) {
          const cleanLabel = decodeHtmlEntities(leadOnlyMatch[1]).replace(
            /:$/,
            ""
          );
          const cleanRest = decodeHtmlEntities(leadOnlyMatch[2]).trim();
          return stripLeadingBulletMarker(
            cleanRest ? `${cleanLabel}: ${cleanRest}` : cleanLabel
          );
        }

        if (hasInlineRichFormatting(rawInner)) {
          return stripLeadingBulletMarker(rawInner);
        }

        return stripLeadingBulletMarker(stripAllHtmlTags(rawInner));
      })
      .filter((b) => stripAllHtmlTags(b).length >= 2);

    if (bullets.length > 0) return bullets;
  }

  // 2. Convert block tags (<p>, <div>, <br>, <h1>-<h6>) to line breaks
  const normalizedLines = source
    .replace(/<\/(p|div|h[1-6]|tr|blockquote)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .split(/\r?\n/)
    .map((line) => {
      const cleanInline = sanitizeInlineFormatting(line);
      return hasInlineRichFormatting(cleanInline)
        ? stripLeadingBulletMarker(cleanInline)
        : stripLeadingBulletMarker(stripAllHtmlTags(line));
    })
    .filter((line) => stripAllHtmlTags(line).length > 0);

  const expandedLines: string[] = [];
  for (const line of normalizedLines) {
    if (!hasInlineRichFormatting(line) && line.includes(" • ")) {
      line
        .split(" • ")
        .map((s) => stripLeadingBulletMarker(s))
        .filter(Boolean)
        .forEach((s) => expandedLines.push(s));
    } else {
      expandedLines.push(line);
    }
  }

  // 3. Split any overly long plain paragraph lines into crisp sentence bullets
  const result: string[] = [];
  for (const line of expandedLines) {
    if (hasInlineRichFormatting(line)) {
      if (!result.includes(line)) result.push(line);
      continue;
    }
    const subBullets = splitParagraphIntoSentenceBullets(line);
    for (const b of subBullets) {
      if (b && !result.includes(b)) {
        result.push(b);
      }
    }
  }

  return result;
}

/**
 * Renders the inner HTML of a single bullet point, preserving inline colors,
 * gradients, bold/italic tags, and auto-bolding `Label:` lead-ins.
 */
export function formatBulletItemHtml(item: string): string {
  const trimmed = stripLeadingBulletMarker(
    normalizeNonBreakingSpaces(item || "").trim()
  );
  if (!trimmed) return "";

  if (hasInlineRichFormatting(trimmed) || /\*\*[^*]+\*\*/.test(trimmed)) {
    const sanitized = sanitizeInlineFormatting(trimmed);
    // If it starts with plain `Label: ...` before any HTML tag, bold the label too
    const plainPrefixMatch = sanitized.match(/^([^<>:]{2,38}):\s+([\s\S]+)$/);
    if (plainPrefixMatch && !plainPrefixMatch[1].includes("//")) {
      return `<strong class="font-bold text-slate-900">${escapeHtmlBasic(
        plainPrefixMatch[1].trim()
      )}:</strong> ${plainPrefixMatch[2]}`;
    }
    return sanitized;
  }

  const colonIdx = trimmed.indexOf(":");
  if (
    colonIdx > 1 &&
    colonIdx <= 38 &&
    !trimmed.slice(0, colonIdx).includes("//")
  ) {
    const label = escapeHtmlBasic(trimmed.slice(0, colonIdx).trim());
    const rest = escapeHtmlBasic(trimmed.slice(colonIdx + 1).trim());
    if (rest) {
      return `<strong class="font-bold text-slate-900">${label}:</strong> ${rest}`;
    }
  }

  return escapeHtmlBasic(trimmed);
}

/**
 * Formats an array of bullet strings into clean, semantic `<ul><li>...</li></ul>` HTML,
 * preserving inline bold, colors, gradients, and lead-in labels.
 */
export function bulletsToCleanHtml(bullets: string[]): string {
  const cleaned = bullets
    .map((b) => formatBulletItemHtml(b))
    .filter(Boolean);

  if (cleaned.length === 0) return "";

  const itemsHtml = cleaned.map((html) => `<li>${html}</li>`).join("");
  return `<ul>${itemsHtml}</ul>`;
}

/**
 * Formats an array of bullet strings into a compact plain-text bullet list for `product.description`.
 */
export function bulletsToPlainSummary(bullets: string[], maxItems = 4): string {
  return bullets
    .map((b) => stripLeadingBulletMarker(stripAllHtmlTags(b || "")))
    .filter(Boolean)
    .slice(0, maxItems)
    .map((b) => `• ${b}`)
    .join("\n");
}

/**
 * Converts any raw HTML or prose string into guaranteed `<ul><li>...</li></ul>` HTML.
 */
export function ensureBulletHtml(raw?: string | null): string | null {
  if (!raw || !raw.trim()) return null;
  const bullets = extractBulletsFromContent(raw);
  if (bullets.length === 0) return null;
  return bulletsToCleanHtml(bullets);
}
