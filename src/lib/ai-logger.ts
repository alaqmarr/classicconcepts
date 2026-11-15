import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { CC_BRIDGE_KEY } from "@/lib/whatsapp-bridge";

export type AiLogCacheStatus = "HIT" | "MISS" | "BYPASS" | "LOCAL_ONLY";

export type AiLogOutcomeSource =
  | "LIVE_AI"
  | "RESPONSE_CACHE"
  | "LOCAL_FALLBACK"
  | "ORDER_LOOKUP"
  | "HUMAN_HANDOFF"
  | "ERROR";

export interface AiLookedUpProduct {
  name: string;
  slug?: string;
  sku?: string | null;
  brand?: string;
  itemType?: string;
  priceInr?: number | null;
  url?: string | null;
  reason?: string | null;
}

export interface AiTraceStep {
  stepNumber: number;
  label: string;
  detail?: string;
  durationMs?: number;
  status?: "OK" | "WARN" | "SKIP" | "ERROR";
}

export interface AiTokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  thinkingTokens?: number;
  cacheReadInputTokens?: number;
  cacheCreationInputTokens?: number;
}

export interface WebsiteAiLogInput {
  feature: string;
  actor: string;
  question: string;
  model: string;
  effort?: string;
  outcomeSource: AiLogOutcomeSource;
  responseCacheStatus: AiLogCacheStatus;
  catalogCacheStatus: AiLogCacheStatus;
  cacheDetails: string;
  productLookupTriggered: boolean;
  productLookupQuery: string;
  productLookupBudget?: string | null;
  productLookupTotalScanned: number;
  productsLookedUp: AiLookedUpProduct[];
  steps: AiTraceStep[];
  response: string;
  durationMs: number;
  tokenUsage?: AiTokenUsage | null;
  error?: string | null;
}

function formatIstTimestamp(utcIso: string): string {
  try {
    const dt = new Date(utcIso);
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(dt);
    const get = (type: string) => parts.find((p) => p.type === type)?.value || "00";
    return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")} IST`;
  } catch {
    return utcIso;
  }
}

export function logClassicConceptsAiTrace(input: WebsiteAiLogInput): void {
  const timestampUtc = new Date().toISOString();
  const timestampIst = formatIstTimestamp(timestampUtc);
  const id = `ail_cc_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`;

  const entry = {
    id,
    timestampUtc,
    timestampIst,
    website: "CLASSIC_CONCEPTS" as const,
    websiteLabel: "Classic Concepts (classicconcepts.in)",
    ...input,
  };

  // 1. Write locally to classicconcepts/ai.logs for durability
  try {
    const logPath = path.join(/*turbopackIgnore: true*/ process.cwd(), "ai.logs");
    const indent = (s: string) =>
      String(s || "(empty)")
        .replace(/\r\n/g, "\n")
        .split("\n")
        .map((l) => `  ${l}`)
        .join("\n");

    const prodText = !entry.productLookupTriggered
      ? "  (No product lookup executed)"
      : entry.productsLookedUp.length === 0
      ? `  (0 matched across ${entry.productLookupTotalScanned} items for "${entry.productLookupQuery}")`
      : entry.productsLookedUp
          .map(
            (p, idx) =>
              `  ${idx + 1}. [CLASSIC_CONCEPTS] ${p.name} (${
                typeof p.priceInr === "number" && p.priceInr > 0
                  ? `₹${p.priceInr.toLocaleString("en-IN")}`
                  : "Custom"
              }${p.slug ? ` | slug: ${p.slug}` : ""}${p.reason ? ` | ${p.reason}` : ""})`
          )
          .join("\n");

    const stepText = entry.steps
      .map(
        (s, idx) =>
          `  ${s.stepNumber || idx + 1}. [${s.status || "OK"}]${
            typeof s.durationMs === "number" ? ` (+${s.durationMs}ms)` : ""
          } ${s.label}${s.detail ? ` -> ${s.detail}` : ""}`
      )
      .join("\n");

    const block = [
      "================================================================================",
      `[${timestampIst} | ${timestampUtc}] TRACE_ID: ${id}`,
      `WEBSITE: ${entry.websiteLabel} | FEATURE: ${entry.feature}`,
      `ACTOR: ${entry.actor} | MODEL: ${entry.model}${entry.effort ? ` (effort=${entry.effort})` : ""} | OUTCOME: ${entry.outcomeSource} (${entry.durationMs}ms)`,
      `CACHE: response=${entry.responseCacheStatus} | catalog=${entry.catalogCacheStatus} | ${entry.cacheDetails}`,
      `QUESTION / INPUT:\n${indent(entry.question)}`,
      `PRODUCT LOOKUP (triggered=${entry.productLookupTriggered}, query="${entry.productLookupQuery}", matched=${entry.productsLookedUp.length} of ${entry.productLookupTotalScanned}):\n${prodText}`,
      `STEPS FOLLOWED:\n${stepText}`,
      `RESPONSE FOLLOWED:\n${indent(entry.response)}`,
      `META_JSON: ${JSON.stringify(entry)}`,
      "",
    ].join("\n");

    fs.appendFileSync(logPath, `${block}\n`, "utf8");
  } catch {
    // Non-blocking
  }

  // 2. Push asynchronously to Central WhatsApp Hub Dev AI Logs collector (:3007 or :3000)
  void (async () => {
    const candidates = Array.from(
      new Set(
        [
          process.env.CCWHATSAPP_INTERNAL_URL,
          "http://127.0.0.1:3007",
          "http://127.0.0.1:3000",
        ]
          .filter(Boolean)
          .map((u) => String(u).replace(/\/+$/, ""))
      )
    );
    for (const base of candidates) {
      try {
        const res = await fetch(`${base}/api/internal/ai-logs`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-cc-bridge-key": CC_BRIDGE_KEY,
          },
          body: JSON.stringify(entry),
          signal: AbortSignal.timeout(1800),
        });
        if (res.ok) break;
      } catch {
        // Try next candidate port
      }
    }
  })();
}
