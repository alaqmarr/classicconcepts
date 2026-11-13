"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  CheckCircle2,
  Tag,
  Plus,
  Trash2,
  Pencil,
  Sparkles,
  Loader2,
  Ruler,
  SlidersHorizontal,
  Check,
  X,
  AlertCircle,
} from "lucide-react";
import { useInlineEdit } from "@/components/inline-edit/InlineEditProvider";
import { EditableText } from "@/components/inline-edit/EditableText";
import {
  extractBulletsFromContent,
  formatBulletItemHtml,
} from "@/lib/bullet-formatter";

export interface SpecItem {
  id?: string;
  name: string;
  value: string;
  type: "specification" | "dimension";
}

interface ProductDetailSectionsProps {
  productId: string;
  productName: string;
  categoryName: string;
  sku?: string | null;
  description?: string | null;
  descriptionHtml?: string | null;
  importantNoteHtml?: string | null;
  initialFeatures: { id: string; text: string }[];
  initialSpecifications: {
    id: string;
    name: string;
    value: string;
    type: string;
  }[];
}

const DIMENSION_PRESETS = [
  "Height",
  "Width",
  "Depth",
  "Top Reading Surface",
  "Base Size",
  "Acrylic Thickness",
  "Weight",
];

const SPEC_PRESETS = [
  "Material",
  "Finish",
  "Color / Tint",
  "Logo Customization",
  "LED Lighting",
  "Mobility / Castors",
  "Packaging",
];

function renderFormattedBulletText(bullet: string) {
  return (
    <span
      dangerouslySetInnerHTML={{ __html: formatBulletItemHtml(bullet) }}
    />
  );
}

export function ProductDetailSections({
  productId,
  productName,
  categoryName,
  sku,
  description,
  descriptionHtml,
  importantNoteHtml,
  initialFeatures,
  initialSpecifications,
}: ProductDetailSectionsProps) {
  const { editMode, openEditor } = useInlineEdit();
  const router = useRouter();
  const pathname = usePathname();

  const [bullets, setBullets] = useState<string[]>(() =>
    extractBulletsFromContent(descriptionHtml, description)
  );
  const [features, setFeatures] = useState<string[]>(() =>
    initialFeatures.map((f) => f.text)
  );
  const [specs, setSpecs] = useState<SpecItem[]>(() =>
    initialSpecifications.map((s) => ({
      id: s.id,
      name: s.name,
      value: s.value,
      type: s.type === "dimension" ? "dimension" : "specification",
    }))
  );

  useEffect(() => {
    setBullets(extractBulletsFromContent(descriptionHtml, description));
  }, [descriptionHtml, description]);

  useEffect(() => {
    setFeatures(initialFeatures.map((f) => f.text));
  }, [initialFeatures]);

  useEffect(() => {
    setSpecs(
      initialSpecifications.map((s) => ({
        id: s.id,
        name: s.name,
        value: s.value,
        type: s.type === "dimension" ? "dimension" : "specification",
      }))
    );
  }, [initialSpecifications]);

  // Inline quick-add states
  const [newBullet, setNewBullet] = useState("");
  const [editingBulletIdx, setEditingBulletIdx] = useState<number | null>(null);
  const [editingBulletText, setEditingBulletText] = useState("");

  const [newFeature, setNewFeature] = useState("");
  const [editingFeatureIdx, setEditingFeatureIdx] = useState<number | null>(
    null
  );
  const [editingFeatureText, setEditingFeatureText] = useState("");

  const [newDimName, setNewDimName] = useState("");
  const [newDimValue, setNewDimValue] = useState("");
  const [newSpecName, setNewSpecName] = useState("");
  const [newSpecValue, setNewSpecValue] = useState("");
  const [editingSpecIdx, setEditingSpecIdx] = useState<number | null>(null);
  const [editingSpecName, setEditingSpecName] = useState("");
  const [editingSpecValue, setEditingSpecValue] = useState("");

  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [aiLoadingSection, setAiLoadingSection] = useState<string | null>(null);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  // Pending ACRIO review state — NEVER saved to DB until Admin confirms!
  const [pendingSectionReview, setPendingSectionReview] = useState<{
    section: "bullets" | "features" | "specs";
    bulletItems?: { text: string; approved: boolean }[];
    featureItems?: { text: string; approved: boolean }[];
    specItems?: {
      name: string;
      value: string;
      type: "dimension" | "specification";
      approved: boolean;
    }[];
  } | null>(null);

  const showToast = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => {
      setStatusToast((curr) => (curr === msg ? null : curr));
    }, 3000);
  };

  const patchProduct = async (
    sectionKey: string,
    patch: Record<string, unknown>,
    successMsg: string
  ) => {
    setSavingSection(sectionKey);
    try {
      const res = await fetch("/api/admin/inline-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "product_patch",
          productId,
          patch,
          pathname,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to save.");
      }
      showToast(successMsg);
      router.refresh();
      return true;
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save changes.");
      return false;
    } finally {
      setSavingSection(null);
    }
  };

  // ACRIO Suggest helper -> Prepares proposals in pendingSectionReview (NEVER saves directly!)
  const handleAiSuggest = async (
    section: "bullets" | "features" | "specs"
  ) => {
    setAiLoadingSection(section);
    try {
      const res = await fetch("/api/admin/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "product_autofill",
          name: productName,
          categoryName,
          sku: sku || undefined,
          existingDescription: bullets.join("\n"),
          existingFeatures: features,
          existingSpecs: specs,
        }),
      });
      const rawJson = await res.json();
      if (!res.ok) {
        throw new Error(rawJson?.error || "ACRIO suggestion failed.");
      }
      const payload = rawJson?.data || rawJson;

      if (section === "bullets") {
        const suggestedBullets: string[] =
          Array.isArray(payload?.bullets) && payload.bullets.length > 0
            ? payload.bullets
            : [
                `Product: ${productName} made directly by Classic Concepts (${categoryName}).`,
                "Material: Made from thick, glass-clear imported cast acrylic that stays strong and never turns yellow.",
                "Build & Finish: Smooth diamond-polished edges crafted Since 2008 at our ISO 9001:2015 factory.",
                "Custom Logo & Size: Custom dimensions and color-printed or laser-engraved logos available.",
              ];
        setPendingSectionReview({
          section: "bullets",
          bulletItems: suggestedBullets.map((text) => ({
            text,
            approved: true,
          })),
        });
      } else if (section === "features") {
        const suggestedFeatures: string[] =
          Array.isArray(payload?.features) && payload.features.length > 0
            ? payload.features
            : [
                "100% imported non-yellowing clear cast acrylic",
                "Smooth diamond-polished edges for safe handling",
                "Custom front company or institution logo printing",
                "Safe foam-lined packaging for pan-India delivery",
              ];
        setPendingSectionReview({
          section: "features",
          featureItems: suggestedFeatures.map((text) => ({
            text,
            approved: true,
          })),
        });
      } else if (section === "specs") {
        const existingKeys = new Set(
          specs.map((s) => `${s.type}:${s.name.toLowerCase()}`)
        );
        const combinedRaw = [
          ...(Array.isArray(payload?.dimensions)
            ? payload.dimensions.map((d: any) => ({ ...d, type: "dimension" }))
            : []),
          ...(Array.isArray(payload?.specifications)
            ? payload.specifications.map((s: any) => ({
                ...s,
                type: s?.type === "dimension" ? "dimension" : "specification",
              }))
            : []),
        ];
        const incoming = combinedRaw
          .map((s: { name?: string; value?: string; type?: string }) => ({
            name: String(s?.name || "").trim(),
            value: String(s?.value || "").trim(),
            type:
              s?.type === "dimension"
                ? ("dimension" as const)
                : ("specification" as const),
            approved: true,
          }))
          .filter(
            (s) =>
              s.name &&
              s.value &&
              !existingKeys.has(`${s.type}:${s.name.toLowerCase()}`)
          );

        if (incoming.length === 0) {
          showToast("All standard specs & dimensions are already present.");
        } else {
          setPendingSectionReview({
            section: "specs",
            specItems: incoming,
          });
        }
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not generate suggestions.");
    } finally {
      setAiLoadingSection(null);
    }
  };

  const handleConfirmPendingSectionReview = async () => {
    if (!pendingSectionReview) return;
    if (pendingSectionReview.section === "bullets") {
      const approvedBullets = (pendingSectionReview.bulletItems || [])
        .filter((b) => b.approved && b.text.trim())
        .map((b) => b.text.trim());
      if (approvedBullets.length === 0) {
        alert("Check at least one bullet point to save.");
        return;
      }
      setBullets(approvedBullets);
      const ok = await patchProduct(
        "bullets",
        { bullets: approvedBullets },
        "Confirmed ACRIO bullet points saved!"
      );
      if (ok) setPendingSectionReview(null);
    } else if (pendingSectionReview.section === "features") {
      const approvedFeatures = (pendingSectionReview.featureItems || [])
        .filter((f) => f.approved && f.text.trim())
        .map((f) => f.text.trim());
      if (approvedFeatures.length === 0) {
        alert("Check at least one feature to save.");
        return;
      }
      const merged = Array.from(new Set([...features, ...approvedFeatures]));
      setFeatures(merged);
      const ok = await patchProduct(
        "features",
        { features: merged },
        "Confirmed ACRIO features saved!"
      );
      if (ok) setPendingSectionReview(null);
    } else if (pendingSectionReview.section === "specs") {
      const approvedSpecs: SpecItem[] = (pendingSectionReview.specItems || [])
        .filter((s) => s.approved && s.name.trim() && s.value.trim())
        .map((s) => ({
          name: s.name.trim(),
          value: s.value.trim(),
          type: s.type,
        }));
      if (approvedSpecs.length === 0) {
        alert("Check at least one specification or dimension to save.");
        return;
      }
      const nextSpecs = [...specs, ...approvedSpecs];
      setSpecs(nextSpecs);
      const ok = await patchProduct(
        "specs",
        { specifications: nextSpecs },
        `Confirmed & added ${approvedSpecs.length} specs/dimensions!`
      );
      if (ok) setPendingSectionReview(null);
    }
  };

  // Bullet CRUD handlers
  const handleAddBullet = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newBullet.trim();
    if (!clean) return;
    const next = [...bullets, clean];
    setBullets(next);
    setNewBullet("");
    await patchProduct("bullets", { bullets: next }, "Bullet point added");
  };

  const handleSaveBulletEdit = async (idx: number) => {
    const clean = editingBulletText.trim();
    const next = clean
      ? bullets.map((b, i) => (i === idx ? clean : b))
      : bullets.filter((_, i) => i !== idx);
    setBullets(next);
    setEditingBulletIdx(null);
    await patchProduct("bullets", { bullets: next }, "Bullet point saved");
  };

  const handleDeleteBullet = async (idx: number) => {
    const next = bullets.filter((_, i) => i !== idx);
    setBullets(next);
    await patchProduct("bullets", { bullets: next }, "Bullet point removed");
  };

  // Feature CRUD handlers
  const handleAddFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newFeature.trim();
    if (!clean) return;
    const next = [...features, clean];
    setFeatures(next);
    setNewFeature("");
    await patchProduct("features", { features: next }, "Key feature added");
  };

  const handleSaveFeatureEdit = async (idx: number) => {
    const clean = editingFeatureText.trim();
    const next = clean
      ? features.map((f, i) => (i === idx ? clean : f))
      : features.filter((_, i) => i !== idx);
    setFeatures(next);
    setEditingFeatureIdx(null);
    await patchProduct("features", { features: next }, "Key feature updated");
  };

  const handleDeleteFeature = async (idx: number) => {
    const next = features.filter((_, i) => i !== idx);
    setFeatures(next);
    await patchProduct("features", { features: next }, "Key feature removed");
  };

  // Specification & Dimension CRUD handlers
  const handleAddSpecItem = async (
    e: React.FormEvent,
    type: "dimension" | "specification"
  ) => {
    e.preventDefault();
    const name = (type === "dimension" ? newDimName : newSpecName).trim();
    const value = (type === "dimension" ? newDimValue : newSpecValue).trim();
    if (!name || !value) return;

    const next: SpecItem[] = [...specs, { name, value, type }];
    setSpecs(next);
    if (type === "dimension") {
      setNewDimName("");
      setNewDimValue("");
    } else {
      setNewSpecName("");
      setNewSpecValue("");
    }
    await patchProduct(
      "specs",
      { specifications: next },
      type === "dimension" ? "Dimension added" : "Specification added"
    );
  };

  const handleSaveSpecEdit = async (globalIdx: number) => {
    const n = editingSpecName.trim();
    const v = editingSpecValue.trim();
    const next =
      n && v
        ? specs.map((item, i) =>
            i === globalIdx ? { ...item, name: n, value: v } : item
          )
        : specs.filter((_, i) => i !== globalIdx);
    setSpecs(next);
    setEditingSpecIdx(null);
    await patchProduct("specs", { specifications: next }, "Specification saved");
  };

  const handleDeleteSpec = async (globalIdx: number) => {
    const next = specs.filter((_, i) => i !== globalIdx);
    setSpecs(next);
    await patchProduct(
      "specs",
      { specifications: next },
      "Specification removed"
    );
  };

  const dimensionsWithIndex = specs
    .map((item, idx) => ({ item, idx }))
    .filter((x) => x.item.type === "dimension");

  const generalSpecsWithIndex = specs
    .map((item, idx) => ({ item, idx }))
    .filter((x) => x.item.type !== "dimension");

  const showDescriptionCard = bullets.length > 0 || editMode;
  const showFeaturesCard = features.length > 0 || editMode;
  const showSpecsCard = specs.length > 0 || editMode;
  const showNoteCard = Boolean(importantNoteHtml) || editMode;

  return (
    <section className="container mx-auto px-6 space-y-8 relative">
      {statusToast && (
        <div className="fixed top-24 right-6 z-[90] px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs sm:text-sm font-semibold shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4" />
          <span>{statusToast}</span>
        </div>
      )}

      {/* Mandatory ACRIO Review & Confirmation Modal for On-Page Suggestions */}
      {pendingSectionReview && (
        <div className="fixed inset-0 z-[120] bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Review &amp; Confirm ACRIO Suggestions</span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Nothing is saved yet. Check/uncheck or edit any item below, then click Confirm &amp; Save.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPendingSectionReview(null)}
                className="p-1 text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-2.5 flex-1">
              {pendingSectionReview.bulletItems?.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200"
                >
                  <input
                    type="checkbox"
                    checked={item.approved}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setPendingSectionReview((prev) =>
                        prev && prev.bulletItems
                          ? {
                              ...prev,
                              bulletItems: prev.bulletItems.map((b, i) =>
                                i === idx ? { ...b, approved: checked } : b
                              ),
                            }
                          : null
                      );
                    }}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <input
                    type="text"
                    value={item.text}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPendingSectionReview((prev) =>
                        prev && prev.bulletItems
                          ? {
                              ...prev,
                              bulletItems: prev.bulletItems.map((b, i) =>
                                i === idx ? { ...b, text: val } : b
                              ),
                            }
                          : null
                      );
                    }}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800"
                  />
                </div>
              ))}

              {pendingSectionReview.featureItems?.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200"
                >
                  <input
                    type="checkbox"
                    checked={item.approved}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setPendingSectionReview((prev) =>
                        prev && prev.featureItems
                          ? {
                              ...prev,
                              featureItems: prev.featureItems.map((f, i) =>
                                i === idx ? { ...f, approved: checked } : f
                              ),
                            }
                          : null
                      );
                    }}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <input
                    type="text"
                    value={item.text}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPendingSectionReview((prev) =>
                        prev && prev.featureItems
                          ? {
                              ...prev,
                              featureItems: prev.featureItems.map((f, i) =>
                                i === idx ? { ...f, text: val } : f
                              ),
                            }
                          : null
                      );
                    }}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800"
                  />
                </div>
              ))}

              {pendingSectionReview.specItems?.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200"
                >
                  <input
                    type="checkbox"
                    checked={item.approved}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setPendingSectionReview((prev) =>
                        prev && prev.specItems
                          ? {
                              ...prev,
                              specItems: prev.specItems.map((s, i) =>
                                i === idx ? { ...s, approved: checked } : s
                              ),
                            }
                          : null
                      );
                    }}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPendingSectionReview((prev) =>
                        prev && prev.specItems
                          ? {
                              ...prev,
                              specItems: prev.specItems.map((s, i) =>
                                i === idx ? { ...s, name: val } : s
                              ),
                            }
                          : null
                      );
                    }}
                    className="w-1/3 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800"
                  />
                  <input
                    type="text"
                    value={item.value}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPendingSectionReview((prev) =>
                        prev && prev.specItems
                          ? {
                              ...prev,
                              specItems: prev.specItems.map((s, i) =>
                                i === idx ? { ...s, value: val } : s
                              ),
                            }
                          : null
                      );
                    }}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800"
                  />
                </div>
              ))}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPendingSectionReview(null)}
                className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-700"
              >
                Discard
              </button>
              <button
                type="button"
                disabled={Boolean(savingSection)}
                onClick={() => void handleConfirmPendingSectionReview()}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold disabled:opacity-50"
              >
                {savingSection ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Confirm &amp; Save Approved Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Bullet-Point Description & Key Features */}
        <div className="lg:col-span-2 space-y-8 min-w-0">
          {/* 1. Bullet-Point Product Description */}
          {showDescriptionCard && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 relative group/desc">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                  <Tag className="text-[#0056b3] shrink-0" />
                  <span>Product Highlights &amp; Description</span>
                </h2>

                {editMode && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={aiLoadingSection === "bullets"}
                      onClick={() => void handleAiSuggest("bullets")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      {aiLoadingSection === "bullets" ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      <span>ACRIO Generate Bullets</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        openEditor({
                          title: `Edit Bullet Description: ${productName}`,
                          mode: "bullets",
                          initialValue: bullets.join("\n"),
                          initialBullets: bullets,
                          contextHint: `${productName} (${categoryName})`,
                          target: {
                            kind: "product_patch",
                            productId,
                            field: "bullets",
                          },
                          onSaved: (_val, nextBullets) => {
                            if (nextBullets) setBullets(nextBullets);
                          },
                        })
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-900 hover:bg-indigo-600 text-white text-xs font-semibold transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Bulk / ACRIO Editor</span>
                    </button>
                  </div>
                )}
              </div>

              {bullets.length > 0 ? (
                <ul className="space-y-3.5">
                  {bullets.map((bullet, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3.5 text-slate-700 leading-relaxed group/bitem"
                    >
                      <span className="mt-2 w-2 h-2 rounded-full bg-[#0056b3] shrink-0" />
                      {editingBulletIdx === idx ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={editingBulletText}
                            onChange={(e) => setEditingBulletText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                void handleSaveBulletEdit(idx);
                              } else if (e.key === "Escape") {
                                setEditingBulletIdx(null);
                              }
                            }}
                            className="flex-1 px-3 py-1.5 rounded-lg border border-indigo-300 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => void handleSaveBulletEdit(idx)}
                            className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                            title="Save"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingBulletIdx(null)}
                            className="p-1.5 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 text-[15px] sm:text-base break-words">
                            {renderFormattedBulletText(bullet)}
                          </div>
                          {editMode && (
                            <div className="opacity-0 group-hover/bitem:opacity-100 flex items-center gap-1 shrink-0 transition-opacity">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingBulletIdx(idx);
                                  setEditingBulletText(bullet);
                                }}
                                className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                title="Edit bullet"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteBullet(idx)}
                                className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                                title="Remove bullet"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400 italic">
                  No bullet description added yet. Use the input below or click &ldquo;AI Generate Bullets&rdquo;.
                </p>
              )}

              {editMode && (
                <form
                  onSubmit={handleAddBullet}
                  className="mt-6 pt-4 border-t border-dashed border-slate-200 flex gap-2"
                >
                  <input
                    type="text"
                    value={newBullet}
                    onChange={(e) => setNewBullet(e.target.value)}
                    placeholder="Add bullet point (e.g., Material: Heavy-duty 12mm cast clear acrylic)..."
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={!newBullet.trim() || savingSection === "bullets"}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0056b3] hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold disabled:opacity-50 shrink-0 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Bullet</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* 2. Key Features Card (Direct On-Page Add / Edit / AI Suggest) */}
          {showFeaturesCard && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                  <CheckCircle2 className="text-[#0056b3] shrink-0" />
                  <span>Key Features</span>
                </h2>

                {editMode && (
                  <button
                    type="button"
                    disabled={aiLoadingSection === "features"}
                    onClick={() => void handleAiSuggest("features")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {aiLoadingSection === "features" ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>ACRIO Suggest Features</span>
                  </button>
                )}
              </div>

              {features.length > 0 ? (
                <ul className="space-y-3.5">
                  {features.map((featureText, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 group/fitem"
                    >
                      <CheckCircle2
                        size={20}
                        className="text-emerald-500 shrink-0 mt-0.5"
                      />
                      {editingFeatureIdx === idx ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={editingFeatureText}
                            onChange={(e) =>
                              setEditingFeatureText(e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                void handleSaveFeatureEdit(idx);
                              } else if (e.key === "Escape") {
                                setEditingFeatureIdx(null);
                              }
                            }}
                            className="flex-1 px-3 py-1.5 rounded-lg border border-indigo-300 text-sm text-slate-900"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => void handleSaveFeatureEdit(idx)}
                            className="p-1.5 rounded-lg bg-emerald-600 text-white"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingFeatureIdx(null)}
                            className="p-1.5 rounded-lg bg-slate-200 text-slate-700"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="flex-1 text-slate-700">
                            {featureText}
                          </span>
                          {editMode && (
                            <div className="opacity-0 group-hover/fitem:opacity-100 flex items-center gap-1 shrink-0 transition-opacity">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingFeatureIdx(idx);
                                  setEditingFeatureText(featureText);
                                }}
                                className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                title="Edit feature"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteFeature(idx)}
                                className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                                title="Delete feature"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400 italic">
                  No key features added yet. Add features directly below or click &ldquo;AI Suggest Features&rdquo;.
                </p>
              )}

              {editMode && (
                <form
                  onSubmit={handleAddFeature}
                  className="mt-6 pt-4 border-t border-dashed border-slate-200 flex gap-2"
                >
                  <input
                    type="text"
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    placeholder="Add a key feature directly (e.g., Custom UV-printed front logo panel included)..."
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={!newFeature.trim() || savingSection === "features"}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold disabled:opacity-50 shrink-0 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Feature</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Dimensions, Specifications & Important Note */}
        <div className="space-y-8 min-w-0">
          {showSpecsCard && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-[#0056b3]" />
                  <span>Specifications &amp; Dimensions</span>
                </h2>

                {editMode && (
                  <button
                    type="button"
                    disabled={aiLoadingSection === "specs"}
                    onClick={() => void handleAiSuggest("specs")}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {aiLoadingSection === "specs" ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    <span>ACRIO Suggest</span>
                  </button>
                )}
              </div>

              {/* A. Dimensions Sub-section */}
              {(dimensionsWithIndex.length > 0 || editMode) && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Ruler className="w-3.5 h-3.5 text-[#0056b3]" />
                    <span>Dimensions</span>
                  </h3>

                  {dimensionsWithIndex.length > 0 ? (
                    <div className="space-y-2.5">
                      {dimensionsWithIndex.map(({ item, idx }) => (
                        <div
                          key={idx}
                          className="py-2 border-b border-slate-100 last:border-0 group/srow"
                        >
                          {editingSpecIdx === idx ? (
                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  value={editingSpecName}
                                  onChange={(e) =>
                                    setEditingSpecName(e.target.value)
                                  }
                                  className="px-2.5 py-1.5 rounded-lg border border-indigo-300 text-xs text-slate-900"
                                  placeholder="Dimension"
                                />
                                <input
                                  type="text"
                                  value={editingSpecValue}
                                  onChange={(e) =>
                                    setEditingSpecValue(e.target.value)
                                  }
                                  className="px-2.5 py-1.5 rounded-lg border border-indigo-300 text-xs text-slate-900"
                                  placeholder="Value"
                                />
                              </div>
                              <div className="flex justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => void handleSaveSpecEdit(idx)}
                                  className="px-2.5 py-1 rounded bg-emerald-600 text-white text-xs font-semibold"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingSpecIdx(null)}
                                  className="px-2.5 py-1 rounded bg-slate-200 text-slate-700 text-xs"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center gap-3">
                              <span className="text-slate-600 font-medium text-sm">
                                {item.name}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-900 font-bold text-sm text-right">
                                  {item.value}
                                </span>
                                {editMode && (
                                  <div className="opacity-0 group-hover/srow:opacity-100 flex items-center gap-0.5 transition-opacity">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingSpecIdx(idx);
                                        setEditingSpecName(item.name);
                                        setEditingSpecValue(item.value);
                                      }}
                                      className="p-1 text-slate-400 hover:text-indigo-600"
                                      title="Edit dimension"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void handleDeleteSpec(idx)}
                                      className="p-1 text-slate-400 hover:text-red-600"
                                      title="Delete dimension"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic mb-2">
                      No dimensions added yet.
                    </p>
                  )}

                  {editMode && (
                    <form
                      onSubmit={(e) => void handleAddSpecItem(e, "dimension")}
                      className="mt-3 p-3 rounded-2xl bg-slate-50 border border-dashed border-slate-300 space-y-2"
                    >
                      <div className="flex flex-wrap gap-1">
                        {DIMENSION_PRESETS.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setNewDimName(preset)}
                            className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                              newDimName === preset
                                ? "bg-indigo-600 text-white"
                                : "bg-white text-slate-600 border border-slate-200 hover:border-indigo-300"
                            }`}
                          >
                            + {preset}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={newDimName}
                          onChange={(e) => setNewDimName(e.target.value)}
                          placeholder="Label (e.g. Height)"
                          className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900"
                        />
                        <input
                          type="text"
                          value={newDimValue}
                          onChange={(e) => setNewDimValue(e.target.value)}
                          placeholder='Value (e.g. 44")'
                          className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={
                          !newDimName.trim() ||
                          !newDimValue.trim() ||
                          savingSection === "specs"
                        }
                        className="w-full inline-flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[#0056b3] hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-50"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Dimension</span>
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* B. General Specifications Sub-section */}
              {(generalSpecsWithIndex.length > 0 || editMode) && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    General Specifications
                  </h3>

                  {generalSpecsWithIndex.length > 0 ? (
                    <div className="space-y-2.5">
                      {generalSpecsWithIndex.map(({ item, idx }) => (
                        <div
                          key={idx}
                          className="py-2 border-b border-slate-100 last:border-0 group/srow"
                        >
                          {editingSpecIdx === idx ? (
                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  value={editingSpecName}
                                  onChange={(e) =>
                                    setEditingSpecName(e.target.value)
                                  }
                                  className="px-2.5 py-1.5 rounded-lg border border-indigo-300 text-xs text-slate-900"
                                />
                                <input
                                  type="text"
                                  value={editingSpecValue}
                                  onChange={(e) =>
                                    setEditingSpecValue(e.target.value)
                                  }
                                  className="px-2.5 py-1.5 rounded-lg border border-indigo-300 text-xs text-slate-900"
                                />
                              </div>
                              <div className="flex justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => void handleSaveSpecEdit(idx)}
                                  className="px-2.5 py-1 rounded bg-emerald-600 text-white text-xs font-semibold"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingSpecIdx(null)}
                                  className="px-2.5 py-1 rounded bg-slate-200 text-slate-700 text-xs"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center gap-3">
                              <span className="text-slate-600 font-medium text-sm">
                                {item.name}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-900 font-bold text-sm text-right">
                                  {item.value}
                                </span>
                                {editMode && (
                                  <div className="opacity-0 group-hover/srow:opacity-100 flex items-center gap-0.5 transition-opacity">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingSpecIdx(idx);
                                        setEditingSpecName(item.name);
                                        setEditingSpecValue(item.value);
                                      }}
                                      className="p-1 text-slate-400 hover:text-indigo-600"
                                      title="Edit spec"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void handleDeleteSpec(idx)}
                                      className="p-1 text-slate-400 hover:text-red-600"
                                      title="Delete spec"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic mb-2">
                      No general specifications added yet.
                    </p>
                  )}

                  {editMode && (
                    <form
                      onSubmit={(e) =>
                        void handleAddSpecItem(e, "specification")
                      }
                      className="mt-3 p-3 rounded-2xl bg-slate-50 border border-dashed border-slate-300 space-y-2"
                    >
                      <div className="flex flex-wrap gap-1">
                        {SPEC_PRESETS.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setNewSpecName(preset)}
                            className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                              newSpecName === preset
                                ? "bg-indigo-600 text-white"
                                : "bg-white text-slate-600 border border-slate-200 hover:border-indigo-300"
                            }`}
                          >
                            + {preset}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={newSpecName}
                          onChange={(e) => setNewSpecName(e.target.value)}
                          placeholder="Spec (e.g. Material)"
                          className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900"
                        />
                        <input
                          type="text"
                          value={newSpecValue}
                          onChange={(e) => setNewSpecValue(e.target.value)}
                          placeholder="Value (e.g. Cast Acrylic)"
                          className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={
                          !newSpecName.trim() ||
                          !newSpecValue.trim() ||
                          savingSection === "specs"
                        }
                        className="w-full inline-flex items-center justify-center gap-1 py-1.5 rounded-lg bg-slate-900 hover:bg-indigo-600 text-white text-xs font-semibold disabled:opacity-50"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Specification</span>
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 3. Important Note Card */}
          {showNoteCard && (
            <div className="bg-amber-50 rounded-3xl p-6 sm:p-8 shadow-sm border border-amber-200">
              <h2 className="text-xl font-bold text-amber-900 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <span>Important Note</span>
              </h2>
              <EditableText
                as="div"
                mode="html"
                label={`Important Note — ${productName}`}
                productPatch={{
                  productId,
                  field: "importantNoteHtml",
                }}
                value={
                  importantNoteHtml ||
                  (editMode
                    ? "<p>Click Edit to add custom delivery, GST, or customization notes for this product.</p>"
                    : "")
                }
                contextHint={`Important customer note for ${productName}`}
                className="prose prose-sm prose-amber max-w-none text-amber-800 break-words"
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
