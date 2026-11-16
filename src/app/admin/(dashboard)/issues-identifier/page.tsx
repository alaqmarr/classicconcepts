"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Info,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Wrench,
} from "lucide-react";

type IssueSeverity = "CRITICAL" | "WARNING" | "INFO";
type IssueCategory =
  | "LINKS_AND_CROSS_SITE"
  | "MEDIA_AND_R2"
  | "PRICING_AND_SPECS"
  | "HTML_AND_CONTENT"
  | "TAXONOMY";

interface DetectedCatalogIssue {
  id: string;
  severity: IssueSeverity;
  category: IssueCategory;
  site: "CLASSIC_CONCEPTS" | "CLASSIC_EDGE_53" | "WHATSAPP_HUB";
  title: string;
  detail: string;
  entityName: string;
  skuOrSlug?: string | null;
  publicUrl?: string | null;
  adminEditUrl?: string | null;
  autoFixable?: boolean;
  suggestion: string;
}

interface AuditReport {
  scannedAtIso: string;
  durationMs: number;
  healthScore: number;
  totals: {
    totalIssues: number;
    critical: number;
    warning: number;
    info: number;
    autoFixableCount: number;
    productsScanned: number;
    categoriesScanned: number;
    podiumRangesScanned: number;
    linksAndResourcesScanned: number;
  };
  issues: DetectedCatalogIssue[];
  acrioAnalysis?: string | null;
}

const PRESET_PROMPTS = [
  "Which products or variants are missing R2 photos or dimensions?",
  "Check all links, resources, and product descriptions for discrepancies",
  "Audit all Acrylic Podiums for missing Height/Top Sheet specs or sub-categories",
  "Summarize the top priority fixes needed across classicconcepts.in right now",
];

export default function AdminIssuesIdentifierPage() {
  const [report, setReport] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [asking, setAsking] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [banner, setBanner] = useState("");
  const [error, setError] = useState("");

  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const loadAudit = useCallback(async () => {
    setScanning(true);
    setError("");
    try {
      const res = await fetch("/api/admin/issues-identifier", {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not run Issues Identifier.");
        return;
      }
      setReport(data.report);
    } catch {
      setError("Network error while running Issues Identifier.");
    } finally {
      setLoading(false);
      setScanning(false);
    }
  }, []);

  useEffect(() => {
    void loadAudit();
  }, [loadAudit]);

  const handleAutoClean = async () => {
    setCleaning(true);
    setBanner("");
    setError("");
    try {
      const res = await fetch("/api/admin/issues-identifier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "auto_clean_db" }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Auto-clean failed.");
        return;
      }
      if (data.report) setReport(data.report);
      setBanner(data.message || "Cleaned formatting and refreshed cache.");
    } catch {
      setError("Network error during auto-clean.");
    } finally {
      setCleaning(false);
    }
  };

  const handleAskAcrio = async (preset?: string) => {
    const q = (preset ?? prompt).trim();
    if (!q) return;
    if (preset) setPrompt(preset);
    setAsking(true);
    setError("");
    try {
      const res = await fetch("/api/admin/issues-identifier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ask_acrio", prompt: q }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "ACRIO analysis failed.");
        return;
      }
      if (data.report) setReport(data.report);
    } catch {
      setError("Network error while asking ACRIO.");
    } finally {
      setAsking(false);
    }
  };

  const filteredIssues = useMemo(() => {
    if (!report) return [];
    const q = searchQuery.trim().toLowerCase();
    return report.issues.filter((i) => {
      if (severityFilter !== "ALL" && i.severity !== severityFilter) return false;
      if (categoryFilter !== "ALL" && i.category !== categoryFilter) return false;
      if (q) {
        const hay = `${i.title} ${i.detail} ${i.entityName} ${i.skuOrSlug || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [report, severityFilter, categoryFilter, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold uppercase tracking-wider">
              DEV &amp; ADMIN MODE
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-indigo-600" />
              <span>ACRIO Issues Identifier</span>
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Scan products, variants, R2 photos, dimensions, pricing, HTML formatting, and cross-site links across the Classic Concepts ecosystem.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={scanning}
            onClick={() => void loadAudit()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${scanning ? "animate-spin" : ""}`} />
            <span>{scanning ? "Scanning..." : "Run Fresh Scan"}</span>
          </button>

          <button
            type="button"
            disabled={cleaning}
            onClick={() => void handleAutoClean()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold disabled:opacity-50"
          >
            {cleaning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Wrench className="w-4 h-4" />
            )}
            <span>Auto-Clean HTML &amp; Flush Cache</span>
          </button>

          <a
            href="https://chat.ccapl.cc/dashboard/issues-identifier"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs sm:text-sm font-bold"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open Cross-Site Hub Auditor (chat.ccapl.cc)</span>
          </a>
        </div>
      </div>

      {banner && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{banner}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {report && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="bg-slate-900 text-white rounded-2xl p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Health Score
            </span>
            <div className="text-3xl font-black text-emerald-400 mt-1">
              {report.healthScore}%
            </div>
            <span className="text-xs text-slate-400">
              {report.totals.totalIssues} total issues
            </span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200">
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-600">
              Critical
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {report.totals.critical}
            </div>
            <span className="text-xs text-slate-500">Immediate attention</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
              Warnings
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {report.totals.warning}
            </div>
            <span className="text-xs text-slate-500">Missing photos / specs</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600">
              Products Scanned
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {report.totals.productsScanned}
            </div>
            <span className="text-xs text-slate-500">
              Across {report.totals.categoriesScanned} categories
            </span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
              Auto-Fixable
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {report.totals.autoFixableCount}
            </div>
            <span className="text-xs text-slate-500">1-click HTML &amp; space fixes</span>
          </div>
        </div>
      )}

      {/* Ask ACRIO Diagnostic Console */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3.5 shadow-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-bold text-slate-900">
            Ask ACRIO Issues Identifier (claude-haiku-5-5)
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {PRESET_PROMPTS.map((p) => (
            <button
              key={p}
              type="button"
              disabled={asking}
              onClick={() => void handleAskAcrio(p)}
              className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 text-xs font-semibold transition-colors"
            >
              {p}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleAskAcrio();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask ACRIO to inspect specific products, missing variant images, broken links, or discrepancies..."
            className="flex-1 px-4 py-2 rounded-xl border border-slate-300 text-sm text-slate-900"
          />
          <button
            type="submit"
            disabled={asking || !prompt.trim()}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold disabled:opacity-50"
          >
            {asking ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>Analyze</span>
          </button>
        </form>

        {report?.acrioAnalysis && (
          <div className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
            {report.acrioAnalysis}
          </div>
        )}
      </div>

      {/* Filterable Issues List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {(["ALL", "CRITICAL", "WARNING", "INFO"] as const).map((sev) => (
              <button
                key={sev}
                type="button"
                onClick={() => setSeverityFilter(sev)}
                className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                  severityFilter === sev
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-600 border-slate-200"
                }`}
              >
                {sev === "ALL" ? "All Severities" : sev}
              </button>
            ))}

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700"
            >
              <option value="ALL">All Categories</option>
              <option value="LINKS_AND_CROSS_SITE">Links &amp; Resources</option>
              <option value="MEDIA_AND_R2">Photos &amp; Variant Media</option>
              <option value="PRICING_AND_SPECS">Pricing &amp; Dimensions</option>
              <option value="HTML_AND_CONTENT">HTML &amp; Content</option>
              <option value="TAXONOMY">Categories &amp; Ranges</option>
            </select>
          </div>

          <div className="relative min-w-[240px] flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by SKU, product name, or issue..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500 flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            <span>Running ecosystem audit...</span>
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className="p-12 text-center space-y-1">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <div className="text-sm font-bold text-slate-900">
              No matching discrepancies found
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredIssues.map((iss) => (
              <div
                key={iss.id}
                className="p-4 hover:bg-slate-50/80 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        iss.severity === "CRITICAL"
                          ? "bg-red-100 text-red-800"
                          : iss.severity === "WARNING"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-sky-100 text-sky-800"
                      }`}
                    >
                      {iss.severity}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {iss.category}
                    </span>
                    {iss.skuOrSlug && (
                      <span className="font-mono text-xs font-bold text-slate-700">
                        {iss.skuOrSlug}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {iss.title}
                  </div>
                  <p className="text-xs text-slate-600">{iss.detail}</p>
                  <div className="text-xs text-indigo-700 font-medium flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    <span>{iss.suggestion}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {iss.publicUrl && (
                    <Link
                      href={iss.publicUrl}
                      target="_blank"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>View Page</span>
                    </Link>
                  )}
                  {iss.adminEditUrl && (
                    <Link
                      href={iss.adminEditUrl}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold"
                    >
                      <span>Edit</span>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
