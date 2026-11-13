/**
 * Runtime Plain-Language & Anti-AI-Pattern Rules + Deterministic Output Sanitizer.
 * Enforces simple layman English, zero em-dashes, and zero robotic AI clichés across
 * both Client Concierge (`claude-haiku-5-5`) and Admin Co-Pilot (`claude-haiku-5-5`).
 */

export const PLAIN_LANGUAGE_RULES_PROMPT = `MANDATORY PLAIN-LANGUAGE & ANTI-AI-PATTERN RULES (STRICTLY ENFORCED):
1. LAYMAN TERMS ONLY: Write in simple, everyday English for a normal buyer who knows nothing about technical acrylic terms.
   - Say "thick, glass-clear acrylic that does not turn yellow" instead of "optical-grade cast acrylic".
   - Say "custom-made in the size or shape you need" instead of "bespoke fabrication".
   - Say "smooth, shiny edges" instead of "diamond-polished CNC-routed edges".
   - Say "your logo printed or engraved on the front" instead of "UV flatbed branding".
2. ZERO EM DASHES: NEVER use em dashes ("—"), spaced en dashes (" – "), or "--" anywhere. Use simple commas or short sentences with periods.
3. NO HIGH-LEVEL ENGLISH OR AI BUZZWORDS: NEVER use words like: bespoke, elevate, delve, meticulous, meticulously, unparalleled, seamless, seamlessly, testament, tapestry, landscape, leverage, robust, synergy, paramount, cutting-edge, state-of-the-art, pivotal, embark, foster, realm, multifaceted, curated, comprehensive, utilize, aesthetic.
4. NO AI SENTENCE TEMPLATES: Never write "Not only X, but also Y", "Whether you're X or Y", "In today's world", "Look no further", or filler openers like "Certainly!", "Absolutely!", or "Great question!".
5. SHORT & CLEAR: Keep sentences short (10-18 words), warm, direct, and easy to understand on the first read.`;

const WORD_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bbespoke\b/gi, "custom-made"],
  [/\bmeticulously\b/gi, "carefully"],
  [/\bmeticulous\b/gi, "careful"],
  [/\bunparalleled\b/gi, "top-quality"],
  [/\bseamlessly\b/gi, "smoothly"],
  [/\bseamless\b/gi, "smooth"],
  [/\bstate-of-the-art\b/gi, "modern"],
  [/\bcutting-edge\b/gi, "modern"],
  [/\belevates\b/gi, "improves"],
  [/\belevating\b/gi, "improving"],
  [/\belevate\b/gi, "improve"],
  [/\butilize\b/gi, "use"],
  [/\butilizing\b/gi, "using"],
  [/\bleverage\b/gi, "use"],
  [/\bleveraging\b/gi, "using"],
  [/\brobust\b/gi, "strong"],
  [/\bparamount\b/gi, "very important"],
  [/\boptical-grade\b/gi, "glass-clear"],
  [/\bconsultative\b/gi, "helpful"],
  [/\bpivotal\b/gi, "key"],
  [/\bcomprehensive\b/gi, "complete"],
  [/\bcurated\b/gi, "selected"],
  [/\bdelve\b/gi, "look"],
  [/\bmultifaceted\b/gi, "versatile"],
  [/\baesthetic\b/gi, "look"],
  [/\baesthetics\b/gi, "looks"],
];

function cleanTextSegment(segment: string): string {
  let out = segment
    // Replace em-dashes and spaced en-dashes with clean comma or hyphen
    .replace(/\s*—\s*/g, ", ")
    .replace(/\s+–\s+/g, ", ")
    .replace(/\s+--\s+/g, ", ")
    // Strip robotic chat openers at very start
    .replace(/^(?:Certainly|Absolutely|Sure thing|Of course|Great question)!\s+/i, "")
    // Fix accidental double punctuation like ", ," or ".,"
    .replace(/,\s*,/g, ",")
    .replace(/([.!?]),/g, "$1");

  for (const [pattern, replacement] of WORD_REPLACEMENTS) {
    out = out.replace(pattern, (match) => {
      // Preserve leading capital letter if the matched word was capitalized
      if (match[0] && match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()) {
        return replacement.charAt(0).toUpperCase() + replacement.slice(1);
      }
      return replacement;
    });
  }

  return out;
}

/**
 * Strips em-dashes (`—`), spaced en-dashes (` – `), and banned high-level AI buzzwords.
 * Safely skips HTML tag attributes (`<span style="...">`) when `preserveHtml` is true!
 */
export function cleanAiPatterns(input: string, preserveHtml = false): string {
  if (!input) return input;
  if (!preserveHtml || !input.includes("<")) {
    return cleanTextSegment(input).replace(/\s{2,}/g, (m) => (m.includes("\n") ? m : " ")).trim();
  }

  // Split by HTML tags so we NEVER touch tag names, classes, or style attributes
  const parts = input.split(/(<[^>]+>)/g);
  return parts
    .map((part) => (part.startsWith("<") && part.endsWith(">") ? part : cleanTextSegment(part)))
    .join("")
    .trim();
}
