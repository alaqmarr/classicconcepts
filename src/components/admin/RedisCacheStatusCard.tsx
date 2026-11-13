"use client";

import { useState } from "react";
import {
  Zap,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Server,
  HardDrive,
  Activity,
} from "lucide-react";
import type { CacheHealthStats } from "@/lib/redis-cache";

interface Props {
  initialStats: CacheHealthStats;
}

export function RedisCacheStatusCard({ initialStats }: Props) {
  const [stats, setStats] = useState<CacheHealthStats>(initialStats);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  async function runCacheAction(action: "warm" | "flush_and_warm" | "refresh") {
    setBusyAction(action);
    setStatusNote(null);
    try {
      const res =
        action === "refresh"
          ? await fetch("/api/admin/cache", { cache: "no-store" })
          : await fetch("/api/admin/cache", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action }),
            });

      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Cache update failed.");
      }

      if (data.stats) {
        setStats(data.stats);
      }

      if (action === "warm") {
        setStatusNote(
          "100MB cache re-warmed with latest products, categories, site texts, and ACRIO answers."
        );
      } else if (action === "flush_and_warm") {
        setStatusNote(
          "100MB cache purged and rebuilt cleanly from the database."
        );
      } else {
        setStatusNote("Live stats refreshed.");
      }
    } catch (err: any) {
      setStatusNote(err?.message || "Could not complete cache action.");
    } finally {
      setBusyAction(null);
    }
  }

  const isRedisServer = stats.backend === "redis-server";
  const barWidth = Math.min(100, Math.max(2, stats.usedPercent || 0));

  return (
    <section className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-extrabold text-slate-900">
                100MB In-Memory Speed Cache (Zero Client DB Hits)
              </h2>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  isRedisServer
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-blue-50 text-blue-700 border-blue-200"
                }`}
              >
                <Server className="w-3 h-3" />
                {isRedisServer
                  ? "Redis Server Live (100MB RAM)"
                  : "100MB In-Memory LRU Active"}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                Policy: {stats.evictionPolicy}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Serves public pages, category filters, site text edits, and ACRIO search misses directly from 100MB RAM without touching SQLite. Every admin save updates affected tags right away.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={busyAction !== null}
            onClick={() => runCacheAction("refresh")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors disabled:opacity-50"
          >
            <Activity
              className={`w-3.5 h-3.5 ${
                busyAction === "refresh" ? "animate-spin" : ""
              }`}
            />
            Refresh Stats
          </button>

          <button
            type="button"
            disabled={busyAction !== null}
            onClick={() => runCacheAction("warm")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0056b3] hover:bg-blue-800 text-white text-xs font-bold transition-colors shadow-2xs disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                busyAction === "warm" ? "animate-spin" : ""
              }`}
            />
            {busyAction === "warm" ? "Warming..." : "Re-Warm Cache"}
          </button>

          <button
            type="button"
            disabled={busyAction !== null}
            onClick={() => runCacheAction("flush_and_warm")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {busyAction === "flush_and_warm"
              ? "Rebuilding..."
              : "Purge & Rebuild 100MB"}
          </button>
        </div>
      </div>

      {/* 100MB Memory Bar & Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4">
        <div className="lg:col-span-5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-[#0056b3]" />
              RAM Allocation ({stats.usedMemoryMb} MB / {stats.maxMemoryMb} MB)
            </span>
            <span className="font-extrabold text-slate-900">
              {stats.usedPercent}% used
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                stats.usedPercent >= 85
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }`}
              style={{ width: `${barWidth}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-500">{stats.note}</div>
        </div>

        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-slate-200/80 p-3">
            <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
              Hit Rate
            </div>
            <div className="text-xl font-extrabold text-emerald-700 mt-0.5">
              {stats.hitRatePercent}%
            </div>
            <div className="text-[11px] text-slate-500">
              {stats.hits.toLocaleString("en-IN")} hits / {stats.misses} misses
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 p-3">
            <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
              Cached Keys
            </div>
            <div className="text-xl font-extrabold text-slate-900 mt-0.5">
              {stats.keyCount.toLocaleString("en-IN")}
            </div>
            <div className="text-[11px] text-slate-500">
              {stats.writes.toLocaleString("en-IN")} writes
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 p-3">
            <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
              Invalidations
            </div>
            <div className="text-xl font-extrabold text-[#0056b3] mt-0.5">
              {stats.invalidations.toLocaleString("en-IN")}
            </div>
            <div className="text-[11px] text-slate-500">
              Instant tag bumps
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 p-3">
            <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
              LRU Evictions
            </div>
            <div className="text-xl font-extrabold text-slate-900 mt-0.5">
              {stats.evictions.toLocaleString("en-IN")}
            </div>
            <div className="text-[11px] text-slate-500">
              Auto-trimmed at 100MB
            </div>
          </div>
        </div>
      </div>

      {/* Live Tag Versions Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-bold text-slate-600">Tag Versions:</span>
          {Object.entries(stats.tagVersions).map(([tag, version]) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/80 font-mono text-[11px] text-slate-700"
            >
              {tag}:v{version}
            </span>
          ))}
        </div>

        {statusNote && (
          <div className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{statusNote}</span>
          </div>
        )}
      </div>
    </section>
  );
}
