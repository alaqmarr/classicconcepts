"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Pencil,
  Sparkles,
  Plus,
  LayoutDashboard,
  Eye,
  ChevronDown,
  Database,
} from "lucide-react";
import type { InlineEditorRequest } from "./types";
import type { SiteContentMap } from "@/lib/site-content-shared";

const LazyInlineEditorModal = dynamic(() => import("./InlineEditorModal"), {
  ssr: false,
});

interface InlineEditContextValue {
  isAdmin: boolean;
  adminEmail: string | null;
  editMode: boolean;
  setEditMode: (enabled: boolean) => void;
  aiConfigured: boolean;
  clientAiConfigured: boolean;
  aiModel: string;
  aiEnabled: boolean;
  popupEnabled: boolean;
  popupDelaySeconds: number;
  statusLoaded: boolean;
  siteContent: SiteContentMap;
  siteSettings: Record<string, unknown>;
  recordSiteContentSave: (key: string, value: string) => void;
  recordSiteContentReset: (key: string) => void;
  recordSiteSettingSave: (field: string, value: string) => void;
  openEditor: (req: InlineEditorRequest) => void;
}

const InlineEditContext = createContext<InlineEditContextValue>({
  isAdmin: false,
  adminEmail: null,
  editMode: false,
  setEditMode: () => {},
  aiConfigured: false,
  clientAiConfigured: false,
  aiModel: "claude-haiku-5-5",
  aiEnabled: true,
  popupEnabled: true,
  popupDelaySeconds: 3,
  statusLoaded: false,
  siteContent: {},
  siteSettings: {},
  recordSiteContentSave: () => {},
  recordSiteContentReset: () => {},
  recordSiteSettingSave: () => {},
  openEditor: () => {},
});

export function useInlineEdit() {
  return useContext(InlineEditContext);
}

export function InlineEditProvider({
  children,
  initialSiteContent = {},
  initialSiteSettings = null,
}: {
  children: React.ReactNode;
  initialSiteContent?: SiteContentMap;
  initialSiteSettings?: Record<string, unknown> | null;
}) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [editMode, setEditModeState] = useState(true);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [clientAiConfigured, setClientAiConfigured] = useState(false);
  const [aiModel, setAiModel] = useState("claude-haiku-5-5");
  const [aiEnabled, setAiEnabled] = useState(true);
  const [popupEnabled, setPopupEnabled] = useState(true);
  const [popupDelaySeconds, setPopupDelaySeconds] = useState(3);
  const [statusLoaded, setStatusLoaded] = useState(false);
  const [dockMinimized, setDockMinimized] = useState(false);

  const [siteContent, setSiteContent] = useState<SiteContentMap>(
    () => initialSiteContent || {}
  );
  const [siteSettings, setSiteSettings] = useState<Record<string, unknown>>(
    () => (initialSiteSettings ? { ...initialSiteSettings } : {})
  );

  useEffect(() => {
    if (initialSiteContent) {
      setSiteContent(initialSiteContent);
    }
  }, [initialSiteContent]);

  useEffect(() => {
    if (initialSiteSettings) {
      setSiteSettings({ ...initialSiteSettings });
    }
  }, [initialSiteSettings]);

  const [activeRequest, setActiveRequest] =
    useState<InlineEditorRequest | null>(null);

  useEffect(() => {
    let cancelled = false;
    try {
      const savedMode = sessionStorage.getItem("cc_inline_edit_mode");
      if (savedMode === "off") {
        setEditModeState(false);
      }
    } catch {
      // Ignore storage errors
    }

    fetch("/api/ai/status", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setIsAdmin(Boolean(data.isAdmin));
        setAdminEmail(data.email || null);
        setAiConfigured(Boolean(data.aiConfigured));
        setClientAiConfigured(Boolean(data.clientAiConfigured));
        if (typeof data.model === "string" && data.model) {
          setAiModel(data.model);
        }
        setAiEnabled(data.aiEnabled !== false);
        setPopupEnabled(data.popupEnabled !== false);
        if (typeof data.popupDelaySeconds === "number") {
          setPopupDelaySeconds(data.popupDelaySeconds);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setStatusLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const setEditMode = useCallback((enabled: boolean) => {
    setEditModeState(enabled);
    try {
      sessionStorage.setItem("cc_inline_edit_mode", enabled ? "on" : "off");
    } catch {
      // Ignore storage errors
    }
  }, []);

  const recordSiteContentSave = useCallback((key: string, value: string) => {
    setSiteContent((prev) => ({ ...prev, [key]: value }));
  }, []);

  const recordSiteContentReset = useCallback((key: string) => {
    setSiteContent((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const recordSiteSettingSave = useCallback((field: string, value: string) => {
    setSiteSettings((prev) => ({ ...prev, [field]: value }));
  }, []);

  const openEditor = useCallback((req: InlineEditorRequest) => {
    setActiveRequest(req);
  }, []);

  const ctx = useMemo<InlineEditContextValue>(
    () => ({
      isAdmin,
      adminEmail,
      editMode: isAdmin && editMode,
      setEditMode,
      aiConfigured,
      clientAiConfigured,
      aiModel,
      aiEnabled,
      popupEnabled,
      popupDelaySeconds,
      statusLoaded,
      siteContent,
      siteSettings,
      recordSiteContentSave,
      recordSiteContentReset,
      recordSiteSettingSave,
      openEditor,
    }),
    [
      isAdmin,
      adminEmail,
      editMode,
      setEditMode,
      aiConfigured,
      clientAiConfigured,
      aiModel,
      aiEnabled,
      popupEnabled,
      popupDelaySeconds,
      statusLoaded,
      siteContent,
      siteSettings,
      recordSiteContentSave,
      recordSiteContentReset,
      recordSiteSettingSave,
      openEditor,
    ]
  );

  return (
    <InlineEditContext.Provider value={ctx}>
      {children}

      {/* Floating Admin Live-Edit Dock (Only visible when Admin is signed in) */}
      {isAdmin && (
        <div className="fixed bottom-4 left-4 z-[95] print:hidden">
          {dockMinimized ? (
            <button
              type="button"
              onClick={() => setDockMinimized(false)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-900 text-white text-xs font-semibold shadow-xl border border-slate-700 hover:bg-indigo-600 transition-colors"
              title="Expand Admin Live Editor Dock"
            >
              <Pencil className="w-3.5 h-3.5 text-indigo-300" />
              <span>Admin Edit</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  editMode ? "bg-emerald-400" : "bg-slate-500"
                }`}
              />
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-900/95 backdrop-blur-md text-white shadow-2xl border border-slate-700/80 text-xs">
              <button
                type="button"
                onClick={() => setEditMode(!editMode)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-colors ${
                  editMode
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-800 text-slate-300 hover:text-white"
                }`}
                title="Toggle hover pencil icons across the site"
              >
                {editMode ? (
                  <>
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Inline Edit: ON</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview Mode</span>
                  </>
                )}
              </button>

              <Link
                href="/admin/products/new"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">New Product</span>
              </Link>

              <Link
                href="/admin/import-export"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
                title="Import & Export Product Data, Site Data, or Site Settings"
              >
                <Database className="w-3.5 h-3.5 text-cyan-300" />
                <span className="hidden md:inline">Backup / Sync</span>
              </Link>

              <Link
                href="/admin/settings#ai-settings"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
                title={
                  aiConfigured
                    ? "ACRIO (Claude Haiku 5.5) Connected"
                    : "Click to configure ACRIO API Key"
                }
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden md:inline">ACRIO</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    aiConfigured ? "bg-emerald-400" : "bg-amber-400"
                  }`}
                />
              </Link>

              <Link
                href="/admin"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-sky-300" />
                <span className="hidden sm:inline">Admin</span>
              </Link>

              <button
                type="button"
                onClick={() => setDockMinimized(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                title="Minimize bar"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Lazy-Loaded Editor Modal */}
      {activeRequest && (
        <LazyInlineEditorModal
          request={activeRequest}
          aiConfigured={aiConfigured}
          onClose={() => setActiveRequest(null)}
        />
      )}
    </InlineEditContext.Provider>
  );
}
