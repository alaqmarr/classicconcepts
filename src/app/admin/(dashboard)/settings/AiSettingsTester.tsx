"use client";

import React, { useState } from "react";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Database,
} from "lucide-react";

interface AiSettingsTesterProps {
  hasClientKeyConfigured: boolean;
  hasAdminKeyConfigured: boolean;
  initialCatalogCount: number;
  initialCacheRows: number;
}

export function AiSettingsTester({
  hasClientKeyConfigured,
  hasAdminKeyConfigured,
  initialCatalogCount,
  initialCacheRows,
}: AiSettingsTesterProps) {
  const [testingScope, setTestingScope] = useState<"client" | "admin" | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [catalogCount, setCatalogCount] = useState(initialCatalogCount);
  const [cacheRows, setCacheRows] = useState(initialCacheRows);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    scope?: "client" | "admin";
    agentName?: string;
    reply?: string;
    modelUsed?: string;
    latencyMs?: number;
    usage?: {
      inputTokens: number;
      outputTokens: number;
      cacheCreationInputTokens: number;
      cacheReadInputTokens: number;
    };
    error?: string;
  } | null>(null);

  const handleTestConnection = async (scope: "client" | "admin") => {
    setTestingScope(scope);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_connection", scope }),
      });
      const data = await res.json();
      if (typeof data.catalogProductsCount === "number") {
        setCatalogCount(data.catalogProductsCount);
      }
      if (typeof data.cachedQueryResponses === "number") {
        setCacheRows(data.cachedQueryResponses);
      }
      setTestResult(data);
    } catch (err) {
      setTestResult({
        ok: false,
        scope,
        error: err instanceof Error ? err.message : "Network request failed.",
      });
    } finally {
      setTestingScope(null);
    }
  };

  const handleRefreshCache = async (clearResponseCache: boolean) => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "refresh_cache",
          clearResponseCache,
        }),
      });
      const data = await res.json();
      if (typeof data.catalogProductsCount === "number") {
        setCatalogCount(data.catalogProductsCount);
      }
      if (typeof data.cachedQueryResponses === "number") {
        setCacheRows(data.cachedQueryResponses);
      }
      alert(
        clearResponseCache
          ? "Catalog snapshot rebuilt and query response cache cleared!"
          : `Catalog snapshot refreshed (${data.catalogProductsCount} products indexed).`
      );
    } catch {
      alert("Failed to refresh cache.");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="mt-4 p-4 rounded-xl bg-white border border-indigo-200/80 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 font-semibold text-slate-800">
            <Database className="w-3.5 h-3.5 text-indigo-600" />
            Indexed Products: {catalogCount}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 font-semibold text-emerald-800 border border-emerald-200">
            Saved 0-Token Cached Answers: {cacheRows}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={testingScope !== null}
            onClick={() => void handleTestConnection("client")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer transition-colors"
          >
            {testingScope === "client" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            )}
            <span>
              {hasClientKeyConfigured
                ? "Test Client Key (claude-haiku-5-5)"
                : "Test Client Key (Save Key First)"}
            </span>
          </button>

          <button
            type="button"
            disabled={testingScope !== null}
            onClick={() => void handleTestConnection("admin")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer transition-colors"
          >
            {testingScope === "admin" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            )}
            <span>
              {hasAdminKeyConfigured
                ? "Test Admin Key (claude-haiku-5-5)"
                : "Test Admin Key (Save Key First)"}
            </span>
          </button>

          <button
            type="button"
            disabled={refreshing}
            onClick={() => void handleRefreshCache(false)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold disabled:opacity-50 cursor-pointer transition-colors"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            <span>Rebuild Catalog Snapshot</span>
          </button>

          {cacheRows > 0 && (
            <button
              type="button"
              disabled={refreshing}
              onClick={() => void handleRefreshCache(true)}
              className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-red-50 hover:text-red-700 text-slate-600 text-xs font-medium cursor-pointer transition-colors"
            >
              Clear Query Cache
            </button>
          )}
        </div>
      </div>

      {testResult && (
        <div
          className={`p-3.5 rounded-xl border text-xs sm:text-sm space-y-1.5 ${
            testResult.ok
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-amber-50 border-amber-200 text-amber-900"
          }`}
        >
          <div className="flex items-center gap-2 font-bold">
            {testResult.ok ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <span>
              {testResult.ok
                ? `${testResult.agentName || "Agent"} Connected! Model: ${testResult.modelUsed} (${testResult.latencyMs}ms)`
                : `${
                    testResult.scope === "client" ? "Client" : "Admin"
                  } AI Key Not Active Yet — Graceful Non-Blocking Fallback Enabled`}
            </span>
          </div>

          {testResult.reply && <p>{testResult.reply}</p>}
          {testResult.error && (
            <p className="text-xs opacity-90">{testResult.error}</p>
          )}

          {testResult.usage && (
            <p className="text-[11px] font-mono opacity-80 pt-1">
              Prompt Cache Write: {testResult.usage.cacheCreationInputTokens} tokens
              {" • "}Prompt Cache Hit (90% Discount):{" "}
              {testResult.usage.cacheReadInputTokens} tokens{" • "}Uncached Input:{" "}
              {testResult.usage.inputTokens} tokens{" • "}Output:{" "}
              {testResult.usage.outputTokens} tokens
            </p>
          )}
        </div>
      )}
    </div>
  );
}
