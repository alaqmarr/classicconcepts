"use client";

import React, { useRef, useState } from "react";
import {
  Download,
  Upload,
  Database,
  Package,
  FileText,
  Settings,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Loader2,
  HardDrive,
} from "lucide-react";
import toast from "react-hot-toast";
import type {
  BundleType,
  ImportMode,
  ServerBackupFileInfo,
} from "@/lib/data-import-export";

export interface LiveSummaryShape {
  catalogBundle: {
    categories: number;
    subCategories: number;
    podiumSubCategories: number;
    industries: number;
    problemStatements: number;
    products: number;
  };
  siteData: {
    siteContent: number;
    teamMembers: number;
    clients: number;
    onlinePlatforms: number;
    certificates: number;
    resources: number;
    galleryImages: number;
    machinery: number;
    pressArticles: number;
    infrastructureLocations: number;
    usefulLinks: number;
  };
  siteSettings: {
    configured: boolean;
    email: string | null;
    phone1: string | null;
    updatedAt: string | null;
  };
  backups: ServerBackupFileInfo[];
}

interface PreviewResult {
  valid: boolean;
  bundleType: BundleType;
  exportedAt: string | null;
  secretsRedacted: boolean;
  counts: Record<string, number>;
  warnings: string[];
}

interface SlotUploadState {
  fileName: string | null;
  parsedJson: unknown | null;
  preview: PreviewResult | null;
  mode: ImportMode;
  busy: boolean;
  error: string | null;
}

const INITIAL_SLOT_STATE: SlotUploadState = {
  fileName: null,
  parsedJson: null,
  preview: null,
  mode: "merge",
  busy: false,
  error: null,
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function ImportExportManager({
  initialSummary,
}: {
  initialSummary: LiveSummaryShape;
}) {
  const [summary, setSummary] = useState<LiveSummaryShape>(initialSummary);
  const [includeSecretsOnExport, setIncludeSecretsOnExport] = useState(false);
  const [restoringFile, setRestoringFile] = useState<string | null>(null);

  const [slots, setSlots] = useState<Record<BundleType, SlotUploadState>>({
    "catalog-bundle": { ...INITIAL_SLOT_STATE },
    "site-data": { ...INITIAL_SLOT_STATE },
    "site-settings": { ...INITIAL_SLOT_STATE },
  });

  const fileInputRefs: Record<
    BundleType,
    React.RefObject<HTMLInputElement | null>
  > = {
    "catalog-bundle": useRef<HTMLInputElement | null>(null),
    "site-data": useRef<HTMLInputElement | null>(null),
    "site-settings": useRef<HTMLInputElement | null>(null),
  };

  const updateSlot = (
    bundleType: BundleType,
    patch: Partial<SlotUploadState>
  ) => {
    setSlots((prev) => ({
      ...prev,
      [bundleType]: { ...prev[bundleType], ...patch },
    }));
  };

  const handleDownloadBundle = (bundleType: BundleType) => {
    const params = new URLSearchParams({ bundle: bundleType });
    if (bundleType === "site-settings" && includeSecretsOnExport) {
      params.set("includeSecrets", "1");
    }
    window.location.href = `/api/admin/import-export?${params.toString()}`;
    toast.success("Preparing JSON export file...");
  };

  const handlePickFile = async (
    bundleType: BundleType,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    updateSlot(bundleType, {
      busy: true,
      error: null,
      fileName: file.name,
      parsedJson: null,
      preview: null,
    });

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      const res = await fetch("/api/admin/import-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "preview",
          expectedType: bundleType,
          payload: parsed,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Invalid backup file for this section.");
      }

      updateSlot(bundleType, {
        busy: false,
        parsedJson: parsed,
        preview: data.preview as PreviewResult,
        error: null,
      });
      toast.success(`Verified ${file.name}`);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Could not read JSON file. Please pick a valid export file.";
      updateSlot(bundleType, {
        busy: false,
        parsedJson: null,
        preview: null,
        error: msg,
      });
      toast.error(msg);
    }
  };

  const handleRunImport = async (bundleType: BundleType) => {
    const slot = slots[bundleType];
    if (!slot.parsedJson || !slot.preview) return;

    if (slot.mode === "replace") {
      const targetName =
        bundleType === "catalog-bundle"
          ? "all Products, Categories, and Subcategories"
          : bundleType === "site-data"
          ? "all Site Texts, Images, and Page Sections"
          : "all Site Settings";
      const ok = window.confirm(
        `Replace mode will overwrite ${targetName} with the contents of "${slot.fileName}".\n\nAn automatic backup of your current data will be saved first. Proceed?`
      );
      if (!ok) return;
    }

    updateSlot(bundleType, { busy: true, error: null });
    try {
      const res = await fetch("/api/admin/import-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "import",
          bundleType,
          mode: slot.mode,
          payload: slot.parsedJson,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Import failed.");
      }

      if (data.summary) {
        setSummary(data.summary as LiveSummaryShape);
      }

      updateSlot(bundleType, {
        busy: false,
        fileName: null,
        parsedJson: null,
        preview: null,
        error: null,
      });

      toast.success(
        `Import complete! Safety backup saved (${data.result?.backupFileName || "backups/"}).`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Import failed.";
      updateSlot(bundleType, { busy: false, error: msg });
      toast.error(msg);
    }
  };

  const handleRestoreServerBackup = async (fileName: string) => {
    const ok = window.confirm(
      `Restore server backup "${fileName}"?\n\nAn automatic safety snapshot of your current live data will also be saved before restoring.`
    );
    if (!ok) return;

    setRestoringFile(fileName);
    try {
      const res = await fetch("/api/admin/import-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "restore_backup",
          fileName,
          mode: "replace",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Could not restore backup.");
      }
      if (data.summary) {
        setSummary(data.summary as LiveSummaryShape);
      }
      toast.success(`Restored backup "${fileName}"`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to restore backup."
      );
    } finally {
      setRestoringFile(null);
    }
  };

  const renderUploadPanel = (
    bundleType: BundleType,
    mergeLabel: string,
    mergeHelp: string,
    replaceLabel: string,
    replaceHelp: string,
    accentClass: string
  ) => {
    const slot = slots[bundleType];

    return (
      <div className="mt-5 pt-5 border-t border-slate-200 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
            Import or Replace from JSON File
          </span>
          {slot.fileName && (
            <button
              type="button"
              onClick={() => updateSlot(bundleType, { ...INITIAL_SLOT_STATE })}
              className="text-xs font-semibold text-slate-500 hover:text-red-600"
            >
              Clear File
            </button>
          )}
        </div>

        <input
          ref={fileInputRefs[bundleType]}
          type="file"
          accept="application/json,.json"
          onChange={(e) => handlePickFile(bundleType, e)}
          className="hidden"
        />

        <button
          type="button"
          disabled={slot.busy}
          onClick={() => fileInputRefs[bundleType].current?.click()}
          className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/40 text-slate-700 text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          {slot.busy && !slot.preview ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>Checking JSON file...</span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 text-blue-600" />
              <span>
                {slot.fileName
                  ? `Selected: ${slot.fileName}`
                  : "Choose JSON File to Import"}
              </span>
            </>
          )}
        </button>

        {slot.error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{slot.error}</span>
          </div>
        )}

        {slot.preview && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
                Valid {slot.preview.bundleType} file
              </span>
              {slot.preview.exportedAt && (
                <span className="text-[11px] text-slate-500">
                  Exported {new Date(slot.preview.exportedAt).toLocaleDateString()}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {Object.entries(slot.preview.counts).map(([k, v]) => (
                <span
                  key={k}
                  className="px-2 py-1 rounded-md bg-white border border-slate-200 text-[11px] font-semibold text-slate-700"
                >
                  {k}: <strong>{v}</strong>
                </span>
              ))}
            </div>

            {slot.preview.warnings.map((w, idx) => (
              <p
                key={idx}
                className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5"
              >
                {w}
              </p>
            ))}

            {/* Import Mode Picker */}
            <div className="space-y-2 pt-1">
              <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-white cursor-pointer">
                <input
                  type="radio"
                  name={`mode-${bundleType}`}
                  checked={slot.mode === "merge"}
                  onChange={() => updateSlot(bundleType, { mode: "merge" })}
                  className="mt-0.5"
                />
                <span className="text-xs">
                  <strong className="block text-slate-800">{mergeLabel}</strong>
                  <span className="text-slate-500">{mergeHelp}</span>
                </span>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-amber-200 bg-amber-50/40 cursor-pointer">
                <input
                  type="radio"
                  name={`mode-${bundleType}`}
                  checked={slot.mode === "replace"}
                  onChange={() => updateSlot(bundleType, { mode: "replace" })}
                  className="mt-0.5"
                />
                <span className="text-xs">
                  <strong className="block text-slate-800">{replaceLabel}</strong>
                  <span className="text-slate-600">{replaceHelp}</span>
                </span>
              </label>
            </div>

            <button
              type="button"
              disabled={slot.busy}
              onClick={() => handleRunImport(bundleType)}
              className={`w-full py-2.5 px-4 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer ${accentClass}`}
            >
              {slot.busy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Applying changes to database...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>
                    {slot.mode === "replace"
                      ? "Backup Current & Replace Now"
                      : "Backup Current & Merge Now"}
                  </span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    );
  };

  const totalSiteShowcaseItems =
    summary.siteData.teamMembers +
    summary.siteData.clients +
    summary.siteData.onlinePlatforms +
    summary.siteData.certificates +
    summary.siteData.resources +
    summary.siteData.galleryImages +
    summary.siteData.machinery +
    summary.siteData.pressArticles +
    summary.siteData.infrastructureLocations +
    summary.siteData.usefulLinks;

  return (
    <div className="space-y-8">
      {/* Top Info Banner */}
      <div className="bg-gradient-to-r from-[#071128] to-[#0f2557] text-white rounded-2xl p-6 md:p-8 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Database Truth &amp; Safe Deployment Retention Active</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Import &amp; Export Website Data
            </h1>
            <p className="text-sm text-blue-100/90 leading-relaxed">
              Every inline text edit, image change, product update, and setting
              is saved permanently in the SQLite database. Pushing code updates
              from development never overwrites your live site texts, images,
              categories, products, or site settings. Use the three separate
              bundles below whenever you want to back up, move, or replace a
              specific dataset.
            </p>
          </div>
          <div className="shrink-0 bg-white/10 border border-white/15 rounded-xl p-4 text-xs space-y-1.5">
            <div className="font-bold text-cyan-300 flex items-center gap-1.5">
              <Database className="w-4 h-4" />
              <span>Strict 3-File Separation</span>
            </div>
            <p className="text-blue-100">1. Categories + Subcategories + Products</p>
            <p className="text-blue-100">2. Site Texts, Images &amp; Page Sections</p>
            <p className="text-blue-100">3. Site Settings (Completely Separate)</p>
          </div>
        </div>
      </div>

      {/* 3 Strictly Separated Bundle Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* BUNDLE 1: CATALOG BUNDLE */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#0056b3] flex items-center justify-center shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <span className="px-2.5 py-1 rounded-full bg-blue-50 text-[#0056b3] text-[11px] font-bold">
              Always Exported Together
            </span>
          </div>

          <h2 className="text-lg font-extrabold text-slate-800">
            1. Product &amp; Category Data
          </h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Exports and imports Categories, Subcategories, Podium Sub-Categories,
            Industries, Problem Statements, and all Products (with images,
            variants, specs, dimensions, and patent notes) together in one file.
          </p>

          {/* Live Counts */}
          <div className="grid grid-cols-2 gap-2.5 my-5">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-xl font-extrabold text-slate-800">
                {summary.catalogBundle.products}
              </div>
              <div className="text-[11px] font-semibold text-slate-500">
                Products
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-xl font-extrabold text-slate-800">
                {summary.catalogBundle.categories}
              </div>
              <div className="text-[11px] font-semibold text-slate-500">
                Parent Categories
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-xl font-extrabold text-slate-800">
                {summary.catalogBundle.subCategories +
                  summary.catalogBundle.podiumSubCategories}
              </div>
              <div className="text-[11px] font-semibold text-slate-500">
                Subcategories
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-xl font-extrabold text-slate-800">
                {summary.catalogBundle.industries +
                  summary.catalogBundle.problemStatements}
              </div>
              <div className="text-[11px] font-semibold text-slate-500">
                Industries &amp; Needs
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleDownloadBundle("catalog-bundle")}
            className="w-full py-3 px-4 rounded-xl bg-[#0056b3] hover:bg-blue-700 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Products &amp; Categories JSON</span>
          </button>

          {renderUploadPanel(
            "catalog-bundle",
            "Merge & Update Catalog (Recommended)",
            "Updates matching categories, subcategories, and products by slug and adds new ones without deleting other existing products.",
            "Replace Entire Product Catalog",
            "Replaces all categories, subcategories, and products with this file. Site texts and site settings are not touched.",
            "bg-[#0056b3] hover:bg-blue-700"
          )}
        </div>

        {/* BUNDLE 2: SITE DATA BUNDLE */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold">
              No Products or Settings
            </span>
          </div>

          <h2 className="text-lg font-extrabold text-slate-800">
            2. Site Texts, Images &amp; Pages
          </h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Exports and imports all inline-edited page texts, headings, rich
            colors, and image overrides across every page, plus Team, Clients,
            Certificates, Resources, Gallery, Machinery, Press, and Locations.
          </p>

          {/* Live Counts */}
          <div className="grid grid-cols-2 gap-2.5 my-5">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-xl font-extrabold text-slate-800">
                {summary.siteData.siteContent}
              </div>
              <div className="text-[11px] font-semibold text-slate-500">
                Inline Text &amp; Image Edits
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-xl font-extrabold text-slate-800">
                {totalSiteShowcaseItems}
              </div>
              <div className="text-[11px] font-semibold text-slate-500">
                Clients, Team, Certs &amp; Media
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-xl font-extrabold text-slate-800">
                {summary.siteData.clients}
              </div>
              <div className="text-[11px] font-semibold text-slate-500">
                Client Logos
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-xl font-extrabold text-slate-800">
                {summary.siteData.certificates + summary.siteData.resources}
              </div>
              <div className="text-[11px] font-semibold text-slate-500">
                Certificates &amp; PDFs
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleDownloadBundle("site-data")}
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Site Data JSON</span>
          </button>

          {renderUploadPanel(
            "site-data",
            "Merge & Update Site Data (Recommended)",
            "Updates inline texts, images, and page items from this file while keeping any extra live edits already on this server.",
            "Replace All Site Data",
            "Replaces inline site texts, images, and showcase sections with this file. Products and Site Settings are not touched.",
            "bg-indigo-600 hover:bg-indigo-700"
          )}
        </div>

        {/* BUNDLE 3: SITE SETTINGS BUNDLE (COMPLETELY SEPARATE) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <Settings className="w-6 h-6" />
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold">
              Completely Separate
            </span>
          </div>

          <h2 className="text-lg font-extrabold text-slate-800">
            3. Site Settings Only
          </h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Exports and imports only global Site Settings (phones, WhatsApp,
            emails, factory address, UPI, Google Maps, analytics, SMTP, and
            ACRIO configuration) completely separate from products and page copy.
          </p>

          <div className="my-5 p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Primary Phone:</span>
              <span className="font-bold text-slate-800">
                {summary.siteSettings.phone1 || "Not set"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Primary Email:</span>
              <span className="font-bold text-slate-800 truncate max-w-[180px]">
                {summary.siteSettings.email || "Not set"}
              </span>
            </div>
            <label className="flex items-start gap-2 pt-2 border-t border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={includeSecretsOnExport}
                onChange={(e) => setIncludeSecretsOnExport(e.target.checked)}
                className="mt-0.5 rounded"
              />
              <span className="text-[11px] text-slate-600 leading-snug">
                Include secret ACRIO API keys &amp; SMTP password in exported
                file (leave unchecked for safe sharing; redacted keys never
                erase live keys on import).
              </span>
            </label>
          </div>

          <button
            type="button"
            onClick={() => handleDownloadBundle("site-settings")}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Site Settings JSON</span>
          </button>

          {renderUploadPanel(
            "site-settings",
            "Safe Update with Data Retention (Recommended)",
            "Updates non-empty settings from the file while retaining existing live values and API keys for any blank or redacted fields.",
            "Replace Site Settings",
            "Replaces global settings with this file (redacted API keys still keep your live server keys safe).",
            "bg-emerald-600 hover:bg-emerald-700"
          )}
        </div>
      </div>

      {/* Automatic Server Backups Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <HardDrive className="w-5 h-5 text-slate-700" />
            <div>
              <h3 className="text-base font-extrabold text-slate-800">
                Automatic Server Safety Backups
              </h3>
              <p className="text-xs text-slate-500">
                Saved automatically in <code className="text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">backups/</code> before every import and before every production deployment.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {summary.backups.length} snapshot(s) on server
          </span>
        </div>

        {summary.backups.length === 0 ? (
          <div className="text-xs text-slate-500 py-6 text-center bg-slate-50 rounded-xl border border-slate-100">
            No server snapshots created yet. Backups appear here automatically whenever you import a file or run a deployment update.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 pr-4">Backup File</th>
                  <th className="py-2.5 px-4">Bundle Type</th>
                  <th className="py-2.5 px-4">Size</th>
                  <th className="py-2.5 px-4">Saved At</th>
                  <th className="py-2.5 pl-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.backups.map((b) => (
                  <tr key={b.fileName} className="hover:bg-slate-50/80">
                    <td className="py-3 pr-4 font-mono text-[11px] text-slate-800">
                      {b.fileName}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                        {b.bundleType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {formatBytes(b.sizeBytes)}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(b.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 pl-4 text-right space-x-2 whitespace-nowrap">
                      <a
                        href={`/api/admin/import-export?backupFile=${encodeURIComponent(
                          b.fileName
                        )}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                      <button
                        type="button"
                        disabled={restoringFile === b.fileName}
                        onClick={() => handleRestoreServerBackup(b.fileName)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-semibold cursor-pointer"
                      >
                        {restoringFile === b.fileName ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5" />
                        )}
                        <span>Restore</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
