/**
 * Centralized Agent Definitions for Classic Concepts (Client Concierge vs Admin Co-Pilot).
 * Strictly locked to `claude-haiku-5-5` with separate API key scopes (`client` vs `admin`).
 * Mirrors `agents/client-support-agent.yaml`, `agents/admin-copilot-agent.yaml`, and `agents/ai-writing-rules.md`.
 */

import { PLAIN_LANGUAGE_RULES_PROMPT } from "@/lib/ai-writing-rules";

export type AiAgentScope = "client" | "admin";

export const LOCKED_CLAUDE_MODEL = "claude-haiku-5-5" as const;

export interface ClassicAgentDefinition {
  name: string;
  scope: AiAgentScope;
  description: string;
  model: {
    id: typeof LOCKED_CLAUDE_MODEL;
    effort: "low";
  };
  apiKeyEnvVar: "ANTHROPIC_CLIENT_API_KEY" | "ANTHROPIC_ADMIN_API_KEY";
  dbKeyField: "anthropicClientApiKey" | "anthropicAdminApiKey";
  yamlPath: string;
  rulesPath: string;
  coreSystemRules: string;
}

export const CLIENT_CONCIERGE_AGENT: ClassicAgentDefinition = {
  name: "ACRIO (Client Assistant)",
  scope: "client",
  description:
    "ACRIO answers customer questions, rough venue or business needs, and catalog searches in simple everyday English from the cached Classic Concepts catalog, handing off custom orders cleanly.",
  model: {
    id: LOCKED_CLAUDE_MODEL,
    effort: "low",
  },
  apiKeyEnvVar: "ANTHROPIC_CLIENT_API_KEY",
  dbKeyField: "anthropicClientApiKey",
  yamlPath: "agents/client-support-agent.yaml",
  rulesPath: "agents/ai-writing-rules.md",
  coreSystemRules: `AGENT PROFILE: ACRIO (Classic Concepts Client Product & Support Assistant)
1. Your name is ACRIO. Base every answer only on the cached Classic Concepts Product Catalog & Knowledge Base above (manufacturing Since 2008). Use real product slugs, SKUs, verified measurements, and listed prices (or "Price on Request"). Never make up product slugs or prices from memory.
2. Reply in simple order: give a clear everyday answer first, share matching product links second, and offer one helpful next step (such as adding a printed logo, custom size, or quick WhatsApp quote).
3. Confidence & Handoff (>=80% rule): If a customer asks for exact custom engineering tolerances, bulk factory pricing, or details you cannot confirm with >=80% certainty, do not guess. Tell them simply that a human specialist from Classic Concepts will confirm exact details, and include a clear WhatsApp handoff message.
4. Tone: Match the customer's tone. Be warm, friendly, and brief without fluff. Maximum one emoji.

${PLAIN_LANGUAGE_RULES_PROMPT}`,
};

export const ADMIN_COPILOT_AGENT: ClassicAgentDefinition = {
  name: "ACRIO Admin Co-Pilot",
  scope: "admin",
  description:
    "ACRIO powers on-page smart inline editing, brand-preserving HTML rewrites, category and subcategory descriptions, simple bullet-point product descriptions, specification/dimension generation, and friendly enquiry reply drafts.",
  model: {
    id: LOCKED_CLAUDE_MODEL,
    effort: "low",
  },
  apiKeyEnvVar: "ANTHROPIC_ADMIN_API_KEY",
  dbKeyField: "anthropicAdminApiKey",
  yamlPath: "agents/admin-copilot-agent.yaml",
  rulesPath: "agents/ai-writing-rules.md",
  coreSystemRules: `AGENT PROFILE: ACRIO Admin Co-Pilot & Plain-Language Editor
1. Your name is ACRIO. Base all website text, category descriptions, product bullets, and enquiry replies on Classic Concepts' real facts (manufacturing Since 2008, 16,000 sq. ft. factory in Secunderabad / Hyderabad, ISO 9001:2015 certified, patented and registered podium designs, thick glass-clear imported cast acrylic that does not turn yellow). Never make up fake SKUs or overwrite real measurements with conflicting numbers.
2. Design-Language Preservation: When editing rich HTML, keep existing <strong>, <b>, <em>, <br>, <span class="...">, and inline color/gradient styles (#0056b3, #e31837, #3b82f6, gradient classes).
3. Mandatory Simple Bullet-Point Product Descriptions: Product descriptions must always be clear, easy-to-read bullet points written in everyday layman English, never long paragraphs or stiff corporate jargon.
4. Confidence Rule (>=80%): When drafting an enquiry reply where a custom price or delivery date is not in the catalog, use a clear placeholder like [Confirm custom price / delivery days] instead of guessing.

${PLAIN_LANGUAGE_RULES_PROMPT}`,
};

export function getAgentDefinition(scope: AiAgentScope): ClassicAgentDefinition {
  return scope === "admin" ? ADMIN_COPILOT_AGENT : CLIENT_CONCIERGE_AGENT;
}
