"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  Layers,
  GitMerge,
  Wand2,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Loader2,
  EyeOff,
  Check,
  X,
  ShieldCheck,
} from "lucide-react";

export interface SubCategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  descriptionHtml: string | null;
  imageUrl: string | null;
  sortOrder: number;
  productCount: number;
}

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  bgClass: string | null;
  description: string | null;
  descriptionHtml: string | null;
  productCount: number;
  subCategories: SubCategoryRow[];
}

interface MappingParentCandidate {
  key: string;
  name: string;
  slug: string;
  description: string;
  existingCategoryId: string | null;
}

interface MappingWorkbenchRow {
  categoryId: string;
  currentName: string;
  slug: string;
  productCount: number;
  autoMatched: boolean;
  approved: boolean;
  targetParentKey: string;
  proposedSubcategoryName: string;
  proposedDescription: string;
}

interface AlignmentTaxonomyRow {
  id: string;
  kind: "category" | "subCategory";
  parentName?: string;
  currentName: string;
  proposedName: string;
  hasRename: boolean;
  needsDescription: boolean;
  proposedDescription: string;
  approved: boolean;
}

interface AlignmentTeamRow {
  id: string;
  memberName: string;
  currentPosition: string;
  proposedPosition: string;
  approved: boolean;
}

interface ManualConvertRow {
  categoryId: string;
  currentName: string;
  productCount: number;
  approved: boolean;
  subcategoryName: string;
  subcategoryDescription: string;
}

export function CategorySmartManager({
  categories,
  deleteAction,
}: {
  categories: CategoryRow[];
  deleteAction: (id: string) => Promise<{ success?: boolean; error?: string }>;
}) {
  const router = useRouter();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedCatIds, setExpandedCatIds] = useState<Record<string, boolean>>({});
  const [filterTab, setFilterTab] = useState<"all" | "active" | "empty" | "parents">("all");
  const [searchText, setSearchText] = useState("");

  // Manual Convert Selected -> Subcategories Modal State (with per-row review & custom overrides)
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [parentMode, setParentMode] = useState<"existing" | "new">("existing");
  const [targetParentId, setTargetParentId] = useState("");
  const [newParentName, setNewParentName] = useState("");
  const [newParentDesc, setNewParentDesc] = useState("");
  const [manualConvertRows, setManualConvertRows] = useState<ManualConvertRow[]>([]);

  // Merge Categories Modal State
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState("");

  // Interactive 1-Time Smart Category -> Subcategory Mapping Workbench State
  const [mappingWorkbench, setMappingWorkbench] = useState<{
    parents: MappingParentCandidate[];
    rows: MappingWorkbenchRow[];
    tab: "matched" | "unmatched" | "all";
    search: string;
    newCustomParentName: string;
    newCustomParentDesc: string;
    showParentEditor: boolean;
  } | null>(null);

  // Interactive Alignment Review & Confirmation Modal State
  const [alignmentPreview, setAlignmentPreview] = useState<{
    taxonomyRows: AlignmentTaxonomyRow[];
    outOfSyncProductParentCount: number;
    syncProductParents: boolean;
    outOfSyncPodiumCount: number;
    syncPodiumFlags: boolean;
    teamRows: AlignmentTeamRow[];
  } | null>(null);

  // Inline Subcategory Add/Edit State
  const [addingSubForCatId, setAddingSubForCatId] = useState<string | null>(null);
  const [editingSub, setEditingSub] = useState<{
    id?: string;
    categoryId: string;
    parentName: string;
    name: string;
    slug: string;
    description: string;
  } | null>(null);

  // Mandatory ACRIO Description Preview State (Never overwrites text without confirmation)
  const [acrioDescLoading, setAcrioDescLoading] = useState(false);
  const [pendingAcrioDesc, setPendingAcrioDesc] = useState<{
    target: "sub" | "newParent";
    text: string;
  } | null>(null);

  const [busyMessage, setBusyMessage] = useState<string | null>(null);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  const filteredCategories = categories.filter((c) => {
    if (filterTab === "active" && c.productCount === 0) return false;
    if (filterTab === "empty" && c.productCount > 0) return false;
    if (filterTab === "parents" && c.subCategories.length === 0) return false;
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      const inCat =
        c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q);
      const inSub = c.subCategories.some((s) =>
        s.name.toLowerCase().includes(q)
      );
      return inCat || inSub;
    }
    return true;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllFiltered = () => {
    const visibleIds = filteredCategories.map((c) => c.id);
    const allSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedCatIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const callTaxonomyApi = async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/admin/taxonomy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      throw new Error(json.error || "Operation failed.");
    }
    return json;
  };

  // 1) Preview Smart Grouping (Dry-Run ONLY -> Opens Interactive Mapping Workbench)
  const handlePreviewAutoGroup = async () => {
    setBusyMessage("Scanning categories to prepare your interactive mapping review...");
    try {
      const json = await callTaxonomyApi({
        action: "auto_group_families",
        dryRun: true,
      });
      const res = json.result;
      const rows: MappingWorkbenchRow[] = Array.isArray(res.rows) ? res.rows : [];
      const parents: MappingParentCandidate[] = Array.isArray(res.parentCandidates)
        ? res.parentCandidates
        : [];
      const hasMatched = rows.some((r) => r.autoMatched);

      setMappingWorkbench({
        parents,
        rows,
        tab: hasMatched ? "matched" : "all",
        search: "",
        newCustomParentName: "",
        newCustomParentDesc: "",
        showParentEditor: false,
      });
    } catch (err: any) {
      alert(err?.message || "Could not preview category mapping.");
    } finally {
      setBusyMessage(null);
    }
  };

  const handleAddCustomParentInWorkbench = () => {
    if (!mappingWorkbench) return;
    const trimmedName = mappingWorkbench.newCustomParentName.trim();
    if (!trimmedName) {
      alert("Enter a name for the new Main Parent Category.");
      return;
    }
    const slug = trimmedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const customKey = `custom:${slug || Date.now()}`;
    if (
      mappingWorkbench.parents.some(
        (p) => p.name.toLowerCase() === trimmedName.toLowerCase()
      )
    ) {
      alert("A Main Parent Category with that name is already in the list.");
      return;
    }

    const nextParent: MappingParentCandidate = {
      key: customKey,
      name: trimmedName,
      slug,
      description:
        mappingWorkbench.newCustomParentDesc.trim() ||
        `Browse our ${trimmedName} range made in our Secunderabad workshop Since 2008 with thick clear acrylic and custom size options.`,
      existingCategoryId: null,
    };

    setMappingWorkbench({
      ...mappingWorkbench,
      parents: [...mappingWorkbench.parents, nextParent],
      newCustomParentName: "",
      newCustomParentDesc: "",
    });
  };

  // Confirm & Execute ONLY Admin-Approved & Admin-Edited Mapping Rows
  const handleExecuteCustomMappingWorkbench = async () => {
    if (!mappingWorkbench) return;
    const approvedRows = mappingWorkbench.rows.filter(
      (r) => r.approved && r.targetParentKey.trim() && r.proposedSubcategoryName.trim()
    );
    if (approvedRows.length === 0) {
      alert(
        "Please check at least one category row and choose its Target Main Parent Category before confirming."
      );
      return;
    }

    setBusyMessage(
      `Applying your confirmed mapping for ${approvedRows.length} categories & updating products...`
    );
    try {
      const json = await callTaxonomyApi({
        action: "execute_custom_mapping_plan",
        parents: mappingWorkbench.parents,
        items: approvedRows.map((r) => ({
          sourceCategoryId: r.categoryId,
          targetParentKey: r.targetParentKey,
          subcategoryName: r.proposedSubcategoryName.trim(),
          subcategoryDescription: r.proposedDescription.trim(),
        })),
      });
      const r = json.result;
      setMappingWorkbench(null);
      setSelectedIds([]);
      setBannerNotice(
        `Confirmed Mapping Applied: Converted ${r.totalCategoriesToConvert} approved categories into Subcategories across ${r.totalGroups} Main Categories and updated ${r.totalProductsAffected} products safely!`
      );
      router.refresh();
    } catch (err: any) {
      alert(err?.message || "Category mapping failed.");
    } finally {
      setBusyMessage(null);
    }
  };

  // 2) Preview Smart Alignment (Dry-Run ONLY -> Opens Interactive Review Modal)
  const handlePreviewSmartAlignAll = async () => {
    setBusyMessage("Scanning catalog names, descriptions & links (nothing saved yet)...");
    try {
      const json = await callTaxonomyApi({
        action: "smart_align_all",
        dryRun: true,
      });
      const r = json.result;
      const taxonomyRows: AlignmentTaxonomyRow[] = (
        r.proposedTaxonomyUpdates || []
      ).map((u: any) => ({
        ...u,
        approved: true,
      }));
      const teamRows: AlignmentTeamRow[] = (r.proposedTeamUpdates || []).map(
        (t: any) => ({
          ...t,
          approved: true,
        })
      );
      setAlignmentPreview({
        taxonomyRows,
        outOfSyncProductParentCount: Number(r.outOfSyncProductParentCount || 0),
        syncProductParents: Number(r.outOfSyncProductParentCount || 0) > 0,
        outOfSyncPodiumCount: Number(r.outOfSyncPodiumCount || 0),
        syncPodiumFlags: Number(r.outOfSyncPodiumCount || 0) > 0,
        teamRows,
      });
    } catch (err: any) {
      alert(err?.message || "Could not preview catalog alignment.");
    } finally {
      setBusyMessage(null);
    }
  };

  // Confirm & Execute ONLY Admin-Approved Alignment Changes
  const handleConfirmSmartAlignAll = async () => {
    if (!alignmentPreview) return;
    setBusyMessage("Saving your confirmed spelling, description & sync updates...");
    try {
      const approvedTaxonomyUpdates = alignmentPreview.taxonomyRows
        .filter((row) => row.approved && row.proposedName.trim())
        .map((row) => ({
          id: row.id,
          kind: row.kind,
          name: row.proposedName.trim(),
          description: row.proposedDescription.trim(),
        }));

      const approvedTeamUpdates = alignmentPreview.teamRows
        .filter((row) => row.approved && row.proposedPosition.trim())
        .map((row) => ({
          id: row.id,
          position: row.proposedPosition.trim(),
        }));

      const json = await callTaxonomyApi({
        action: "smart_align_all",
        dryRun: false,
        approvedTaxonomyUpdates,
        syncProductParents: alignmentPreview.syncProductParents,
        syncPodiumFlags: alignmentPreview.syncPodiumFlags,
        approvedTeamUpdates,
      });
      const r = json.result;
      setAlignmentPreview(null);
      setBannerNotice(
        `Confirmed Alignment Saved: Updated ${r.categoriesRenamed} names, added ${r.descriptionsFilled} plain-English descriptions, synced ${r.productParentSynced} subcategory-parent links, synced ${r.podiumFlagsSynced} podium flags, and formatted ${r.teamRolesFormatted} team titles.`
      );
      router.refresh();
    } catch (err: any) {
      alert(err?.message || "Saving alignment changes failed.");
    } finally {
      setBusyMessage(null);
    }
  };

  // Open Manual Convert Modal with editable per-category review rows
  const openManualConvertModal = () => {
    const defaultParent =
      categories.find((c) => !selectedIds.includes(c.id))?.id || "";
    setTargetParentId(defaultParent);
    setPendingAcrioDesc(null);
    const rows: ManualConvertRow[] = selectedIds
      .map((id) => categories.find((c) => c.id === id))
      .filter((c): c is CategoryRow => Boolean(c))
      .map((cat) => ({
        categoryId: cat.id,
        currentName: cat.name,
        productCount: cat.productCount,
        approved: true,
        subcategoryName: cat.name,
        subcategoryDescription:
          cat.description ||
          (cat.descriptionHtml
            ? cat.descriptionHtml.replace(/<[^>]+>/g, " ").trim()
            : ""),
      }));
    setManualConvertRows(rows);
    setShowConvertModal(true);
  };

  const handleConvertSelected = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeRows = manualConvertRows.filter(
      (r) =>
        r.approved &&
        (parentMode === "new" || r.categoryId !== targetParentId)
    );
    if (activeRows.length === 0) {
      alert("Please keep at least one category checked to convert into a subcategory.");
      return;
    }

    const customOverrides: Record<
      string,
      { subcategoryName?: string; subcategoryDescription?: string }
    > = {};
    for (const row of activeRows) {
      customOverrides[row.categoryId] = {
        subcategoryName: row.subcategoryName.trim() || row.currentName,
        subcategoryDescription: row.subcategoryDescription.trim() || undefined,
      };
    }

    setBusyMessage(
      "Converting your confirmed categories into subcategories & reassigning products..."
    );
    try {
      const json = await callTaxonomyApi({
        action: "convert_to_subcategories",
        sourceCategoryIds: activeRows.map((r) => r.categoryId),
        targetParentId: parentMode === "existing" ? targetParentId : undefined,
        newParentName: parentMode === "new" ? newParentName : undefined,
        newParentDescription: parentMode === "new" ? newParentDesc : undefined,
        customOverrides,
      });
      const r = json.result;
      setShowConvertModal(false);
      setSelectedIds([]);
      setNewParentName("");
      setNewParentDesc("");
      setManualConvertRows([]);
      setExpandedCatIds((prev) => ({ ...prev, [r.parentId]: true }));
      setBannerNotice(
        `Converted ${r.categoriesConverted} confirmed categories into Subcategories under "${r.parentName}" and updated ${r.productsUpdated} products automatically!`
      );
      router.refresh();
    } catch (err: any) {
      alert(err?.message || "Conversion failed.");
    } finally {
      setBusyMessage(null);
    }
  };

  const handleMergeSelected = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mergeTargetId) {
      alert("Please pick a target category.");
      return;
    }
    setBusyMessage("Merging categories & moving products...");
    try {
      const json = await callTaxonomyApi({
        action: "merge_categories",
        sourceCategoryIds: selectedIds,
        targetCategoryId: mergeTargetId,
      });
      const r = json.result;
      setShowMergeModal(false);
      setSelectedIds([]);
      setBannerNotice(
        `Merged ${r.mergedCategories} categories into "${r.targetName}" (${r.movedProducts} products moved).`
      );
      router.refresh();
    } catch (err: any) {
      alert(err?.message || "Merge failed.");
    } finally {
      setBusyMessage(null);
    }
  };

  const handleSaveSubCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSub || !editingSub.name.trim()) return;
    setBusyMessage("Saving subcategory...");
    try {
      await callTaxonomyApi({
        action: "upsert_subcategory",
        id: editingSub.id,
        categoryId: editingSub.categoryId,
        name: editingSub.name,
        slug: editingSub.slug || undefined,
        description: editingSub.description,
      });
      setEditingSub(null);
      setAddingSubForCatId(null);
      setPendingAcrioDesc(null);
      router.refresh();
    } catch (err: any) {
      alert(err?.message || "Could not save subcategory.");
    } finally {
      setBusyMessage(null);
    }
  };

  const handleDeleteSubCategory = async (sub: SubCategoryRow) => {
    const ok = window.confirm(
      `Delete subcategory "${sub.name}"? (${sub.productCount} products will stay safely inside the main parent category.)`
    );
    if (!ok) return;
    setBusyMessage("Removing subcategory...");
    try {
      await callTaxonomyApi({ action: "delete_subcategory", id: sub.id });
      router.refresh();
    } catch (err: any) {
      alert(err?.message || "Could not delete subcategory.");
    } finally {
      setBusyMessage(null);
    }
  };

  const handleDeleteCategory = async (cat: CategoryRow) => {
    if (cat.productCount > 0) {
      alert(
        `"${cat.name}" has ${cat.productCount} products. Select it and click "Convert Selected -> Subcategories" or "Merge Categories" so zero products are lost!`
      );
      return;
    }
    if (!window.confirm(`Delete empty category "${cat.name}"?`)) return;
    setBusyMessage("Deleting empty category...");
    try {
      const res = await deleteAction(cat.id);
      if (res?.error) {
        alert(res.error);
      } else {
        router.refresh();
      }
    } finally {
      setBusyMessage(null);
    }
  };

  // Ask ACRIO to draft a description -> ALWAYS stages into `pendingAcrioDesc` for review & confirmation!
  const askAcrioForDescription = async (
    name: string,
    parentName: string | undefined,
    target: "sub" | "newParent"
  ) => {
    if (!name.trim()) {
      alert("Enter the name first so ACRIO can draft a description for you to review.");
      return;
    }
    setAcrioDescLoading(true);
    try {
      const json = await callTaxonomyApi({
        action: "generate_description",
        name: name.trim(),
        parentName,
      });
      if (json.description) {
        setPendingAcrioDesc({
          target,
          text: String(json.description),
        });
      }
    } catch (err: any) {
      alert(err?.message || "Could not generate description.");
    } finally {
      setAcrioDescLoading(false);
    }
  };

  const emptyCategoriesCount = categories.filter((c) => c.productCount === 0).length;
  const activeCategoriesCount = categories.length - emptyCategoriesCount;

  // Filtered rows inside Mapping Workbench
  const visibleWorkbenchRows = mappingWorkbench
    ? mappingWorkbench.rows.filter((r) => {
        if (mappingWorkbench.tab === "matched" && !r.autoMatched) return false;
        if (mappingWorkbench.tab === "unmatched" && r.autoMatched) return false;
        if (mappingWorkbench.search.trim()) {
          const q = mappingWorkbench.search.toLowerCase();
          return (
            r.currentName.toLowerCase().includes(q) ||
            r.proposedSubcategoryName.toLowerCase().includes(q)
          );
        }
        return true;
      })
    : [];

  const approvedWorkbenchRows = mappingWorkbench
    ? mappingWorkbench.rows.filter(
        (r) => r.approved && r.targetParentKey.trim() && r.proposedSubcategoryName.trim()
      )
    : [];

  const approvedWorkbenchProductsCount = approvedWorkbenchRows.reduce(
    (sum, r) => sum + r.productCount,
    0
  );

  return (
    <div className="space-y-5">
      {/* Smart Production Alignment & Grouping Toolbar */}
      <div className="bg-gradient-to-r from-slate-900 via-[#002b5e] to-[#0056b3] rounded-2xl p-5 text-white shadow-md space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-amber-300 text-xs font-bold mb-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Review-First Category &amp; Subcategory Suite (Zero Direct Save)</span>
            </div>
            <h2 className="text-lg font-extrabold">
              Organize Main Categories, Subcategories &amp; Product Links Safely
            </h2>
            <p className="text-xs text-blue-100 mt-1 max-w-3xl leading-relaxed">
              Preview, edit, and confirm every category-to-subcategory mapping before anything is saved to the database. Once confirmed, product category and subcategory links update atomically and old URLs redirect cleanly.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={Boolean(busyMessage)}
              onClick={() => void handlePreviewAutoGroup()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <Layers className="w-4 h-4" />
              <span>Preview &amp; Map Subcategories into Main Categories</span>
            </button>

            <button
              type="button"
              disabled={Boolean(busyMessage)}
              onClick={() => void handlePreviewSmartAlignAll()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              <Wand2 className="w-4 h-4 text-amber-300" />
              <span>Preview Spelling, Descriptions &amp; Sync</span>
            </button>
          </div>
        </div>
      </div>

      {busyMessage && (
        <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs sm:text-sm font-semibold flex items-center gap-2.5">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
          <span>{busyMessage}</span>
        </div>
      )}

      {bannerNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-semibold flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{bannerNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerNotice(null)}
            className="text-emerald-700 hover:text-emerald-950"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Multi-select Quick Action Bar */}
      {selectedIds.length > 0 && (
        <div className="sticky top-2 z-20 p-3.5 rounded-2xl bg-slate-900 text-white shadow-xl border border-slate-700 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold">
            <span className="px-2.5 py-1 rounded-full bg-indigo-600 text-white">
              {selectedIds.length} Selected
            </span>
            <span className="text-slate-300">
              Choose how to organize selected categories &amp; review before saving:
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openManualConvertModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer transition-colors"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Review &amp; Convert Selected → Subcategories</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMergeTargetId(
                  categories.find((c) => !selectedIds.includes(c.id))?.id ||
                    selectedIds[0] ||
                    ""
                );
                setShowMergeModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold cursor-pointer transition-colors"
            >
              <GitMerge className="w-3.5 h-3.5" />
              <span>Merge Duplicates into One Category</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "all", label: `All (${categories.length})` },
            { id: "active", label: `Live on Site (${activeCategoriesCount})` },
            { id: "empty", label: `0 Products / Hidden (${emptyCategoriesCount})` },
            {
              id: "parents",
              label: `With Subcategories (${
                categories.filter((c) => c.subCategories.length > 0).length
              })`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterTab(tab.id as typeof filterTab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                filterTab === tab.id
                  ? "bg-[#0056b3] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Filter categories or subcategories..."
          className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3] sm:w-64"
        />
      </div>

      {/* Categories + Expandable Subcategories Table */}
      <div className="bg-white rounded-2xl shadow-soft border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={
                      filteredCategories.length > 0 &&
                      filteredCategories.every((c) => selectedIds.includes(c.id))
                    }
                    onChange={toggleSelectAllFiltered}
                    className="rounded border-slate-300"
                  />
                </th>
                <th className="p-4">Main Category &amp; Description</th>
                <th className="p-4">Subcategories</th>
                <th className="p-4">Products &amp; Visibility</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCategories.map((cat) => {
                const isExpanded = Boolean(expandedCatIds[cat.id]);
                const plainDesc =
                  cat.description ||
                  (cat.descriptionHtml
                    ? cat.descriptionHtml.replace(/<[^>]+>/g, " ").trim()
                    : "");
                return (
                  <React.Fragment key={cat.id}>
                    <tr className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 align-top pt-5">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(cat.id)}
                          onChange={() => toggleSelect(cat.id)}
                          className="rounded border-slate-300"
                        />
                      </td>
                      <td className="p-4 align-top">
                        <div className="flex items-start gap-3">
                          {cat.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={cat.imageUrl}
                              alt={cat.name}
                              className="w-11 h-11 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div
                              className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold shrink-0 ${
                                cat.bgClass || "bg-[#0056b3]"
                              }`}
                            >
                              {cat.name.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-slate-800 text-sm sm:text-base">
                                {cat.name}
                              </span>
                              <span className="text-[11px] font-mono text-slate-400">
                                /shop/c/{cat.slug}
                              </span>
                            </div>
                            {plainDesc ? (
                              <p className="text-xs text-slate-500 line-clamp-2 mt-1 max-w-xl">
                                {plainDesc}
                              </p>
                            ) : (
                              <p className="text-xs text-amber-600 mt-1">
                                No description yet (click Edit or Preview Spelling &amp; Descriptions above)
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-4 align-top">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleExpand(cat.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-[#0056b3] text-xs font-bold transition-colors cursor-pointer"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                            <span>{cat.subCategories.length} Subcategories</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setExpandedCatIds((prev) => ({
                                ...prev,
                                [cat.id]: true,
                              }));
                              setAddingSubForCatId(cat.id);
                              setPendingAcrioDesc(null);
                              setEditingSub({
                                categoryId: cat.id,
                                parentName: cat.name,
                                name: "",
                                slug: "",
                                description: "",
                              });
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-dashed border-slate-300 hover:border-[#0056b3] text-xs font-semibold text-slate-600 hover:text-[#0056b3] transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Sub</span>
                          </button>
                        </div>
                      </td>

                      <td className="p-4 align-top">
                        {cat.productCount > 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                            <span>{cat.productCount} products</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold">
                            <EyeOff className="w-3 h-3" />
                            <span>0 products (Hidden on site)</span>
                          </span>
                        )}
                      </td>

                      <td className="p-4 align-top text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <Link
                            href={`/admin/categories/${cat.id}`}
                            className="p-2 text-slate-500 hover:text-[#0056b3] hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Category & Description"
                          >
                            <Edit2 size={17} />
                          </Link>
                          <button
                            type="button"
                            onClick={() => void handleDeleteCategory(cat)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Category"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Subcategories Drawer Row */}
                    {isExpanded && (
                      <tr className="bg-slate-50/70">
                        <td colSpan={5} className="px-6 py-4 border-t border-slate-200/70">
                          <div className="pl-4 border-l-2 border-[#0056b3]/40 space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                                Subcategories under {cat.name} (
                                {cat.subCategories.length})
                              </h4>
                              {addingSubForCatId !== cat.id && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAddingSubForCatId(cat.id);
                                    setPendingAcrioDesc(null);
                                    setEditingSub({
                                      categoryId: cat.id,
                                      parentName: cat.name,
                                      name: "",
                                      slug: "",
                                      description: "",
                                    });
                                  }}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0056b3] text-white text-xs font-bold hover:bg-blue-700 cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>New Subcategory</span>
                                </button>
                              )}
                            </div>

                            {/* Inline Add / Edit Subcategory Form */}
                            {editingSub && editingSub.categoryId === cat.id && (
                              <form
                                onSubmit={handleSaveSubCategory}
                                className="p-4 rounded-xl bg-white border border-indigo-200 shadow-xs space-y-3"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-indigo-900">
                                    {editingSub.id
                                      ? `Edit Subcategory: ${editingSub.name}`
                                      : `Add Subcategory under ${cat.name}`}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingSub(null);
                                      setAddingSubForCatId(null);
                                      setPendingAcrioDesc(null);
                                    }}
                                    className="text-slate-400 hover:text-slate-700"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                                      Subcategory Name *
                                    </label>
                                    <input
                                      type="text"
                                      required
                                      value={editingSub.name}
                                      onChange={(e) =>
                                        setEditingSub({
                                          ...editingSub,
                                          name: e.target.value,
                                        })
                                      }
                                      placeholder="e.g. A4 T-Stands, Donation Boxes, Clear Podiums..."
                                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-[#0056b3]"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                                      URL Slug (Optional)
                                    </label>
                                    <input
                                      type="text"
                                      value={editingSub.slug}
                                      onChange={(e) =>
                                        setEditingSub({
                                          ...editingSub,
                                          slug: e.target.value,
                                        })
                                      }
                                      placeholder="Auto-generated from name"
                                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-[#0056b3]"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="text-[11px] font-bold uppercase text-slate-500">
                                      Subcategory Description (Plain Customer English)
                                    </label>
                                    <button
                                      type="button"
                                      disabled={acrioDescLoading}
                                      onClick={() =>
                                        void askAcrioForDescription(
                                          editingSub.name,
                                          cat.name,
                                          "sub"
                                        )
                                      }
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold border border-indigo-200 cursor-pointer"
                                    >
                                      {acrioDescLoading ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <Sparkles className="w-3 h-3" />
                                      )}
                                      <span>Draft with ACRIO</span>
                                    </button>
                                  </div>

                                  {pendingAcrioDesc?.target === "sub" && (
                                    <div className="mb-2 p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                                      <div className="text-[11px] font-extrabold uppercase text-amber-900">
                                        Review ACRIO Proposed Description (Edit if needed before using)
                                      </div>
                                      <textarea
                                        rows={2}
                                        value={pendingAcrioDesc.text}
                                        onChange={(e) =>
                                          setPendingAcrioDesc({
                                            target: "sub",
                                            text: e.target.value,
                                          })
                                        }
                                        className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-amber-300 text-xs text-slate-800"
                                      />
                                      <div className="flex justify-end gap-2">
                                        <button
                                          type="button"
                                          onClick={() => setPendingAcrioDesc(null)}
                                          className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 text-[11px] font-bold cursor-pointer"
                                        >
                                          Discard
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingSub((prev) =>
                                              prev
                                                ? {
                                                    ...prev,
                                                    description:
                                                      pendingAcrioDesc.text,
                                                  }
                                                : null
                                            );
                                            setPendingAcrioDesc(null);
                                          }}
                                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer"
                                        >
                                          Confirm &amp; Use Text
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  <textarea
                                    rows={2}
                                    value={editingSub.description}
                                    onChange={(e) =>
                                      setEditingSub({
                                        ...editingSub,
                                        description: e.target.value,
                                      })
                                    }
                                    placeholder="Short, easy-to-read description shown when customers filter by this subcategory..."
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-[#0056b3]"
                                  />
                                </div>
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingSub(null);
                                      setAddingSubForCatId(null);
                                      setPendingAcrioDesc(null);
                                    }}
                                    className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="submit"
                                    className="inline-flex items-center gap-1 px-4 py-1.5 rounded-lg bg-[#0056b3] hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Save Subcategory</span>
                                  </button>
                                </div>
                              </form>
                            )}

                            {cat.subCategories.length === 0 ? (
                              <p className="text-xs text-slate-500 italic">
                                No subcategories yet. Add one above or select existing categories in the table and click &ldquo;Review &amp; Convert Selected → Subcategories&rdquo;.
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                {cat.subCategories.map((sub) => (
                                  <div
                                    key={sub.id}
                                    className="p-3 rounded-xl bg-white border border-slate-200 flex items-start justify-between gap-3"
                                  >
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-800 text-sm">
                                          {sub.name}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#0056b3] text-[11px] font-bold">
                                          {sub.productCount} items
                                        </span>
                                      </div>
                                      <p className="text-[11px] font-mono text-slate-400">
                                        /shop/c/{cat.slug}?sub={sub.slug}
                                      </p>
                                      {sub.description && (
                                        <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                                          {sub.description}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setAddingSubForCatId(null);
                                          setPendingAcrioDesc(null);
                                          setEditingSub({
                                            id: sub.id,
                                            categoryId: cat.id,
                                            parentName: cat.name,
                                            name: sub.name,
                                            slug: sub.slug,
                                            description: sub.description || "",
                                          });
                                        }}
                                        className="p-1.5 rounded-lg text-slate-500 hover:text-[#0056b3] hover:bg-blue-50 cursor-pointer"
                                        title="Edit subcategory & description"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          void handleDeleteSubCategory(sub)
                                        }
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                        title="Delete subcategory"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {filteredCategories.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 text-sm">
                    No categories matched this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Manual Convert Selected Categories -> Subcategories (Interactive Review & Edit) */}
      {showConvertModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleConvertSelected}
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden"
          >
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Review &amp; Confirm Subcategory Conversion
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Check each category below, edit its target Subcategory name or description if needed, and choose its Main Parent Category before saving.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowConvertModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setParentMode("existing")}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                    parentMode === "existing"
                      ? "bg-[#0056b3] text-white border-[#0056b3]"
                      : "bg-slate-50 text-slate-700 border-slate-200"
                  }`}
                >
                  Pick Existing Main Category
                </button>
                <button
                  type="button"
                  onClick={() => setParentMode("new")}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                    parentMode === "new"
                      ? "bg-[#0056b3] text-white border-[#0056b3]"
                      : "bg-slate-50 text-slate-700 border-slate-200"
                  }`}
                >
                  + Create New Main Category
                </button>
              </div>

              {parentMode === "existing" ? (
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Select Main Parent Category *
                  </label>
                  <select
                    required
                    value={targetParentId}
                    onChange={(e) => setTargetParentId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  >
                    <option value="">Choose Main Parent Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.productCount} products)
                        {selectedIds.includes(c.id)
                          ? " [Will stay as Main Parent]"
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                      New Main Parent Category Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newParentName}
                      onChange={(e) => setNewParentName(e.target.value)}
                      placeholder="e.g. Retail & Countertop Displays"
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold uppercase text-slate-600">
                        Main Category Description
                      </label>
                      <button
                        type="button"
                        disabled={acrioDescLoading}
                        onClick={() =>
                          void askAcrioForDescription(
                            newParentName,
                            undefined,
                            "newParent"
                          )
                        }
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:underline cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Draft with ACRIO</span>
                      </button>
                    </div>

                    {pendingAcrioDesc?.target === "newParent" && (
                      <div className="mb-2 p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                        <div className="text-[11px] font-extrabold uppercase text-amber-900">
                          Review ACRIO Draft Before Applying
                        </div>
                        <textarea
                          rows={2}
                          value={pendingAcrioDesc.text}
                          onChange={(e) =>
                            setPendingAcrioDesc({
                              target: "newParent",
                              text: e.target.value,
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-amber-300 text-xs text-slate-800"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setPendingAcrioDesc(null)}
                            className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 text-[11px] font-bold cursor-pointer"
                          >
                            Discard
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setNewParentDesc(pendingAcrioDesc.text);
                              setPendingAcrioDesc(null);
                            }}
                            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer"
                          >
                            Confirm &amp; Use Text
                          </button>
                        </div>
                      </div>
                    )}

                    <textarea
                      rows={2}
                      value={newParentDesc}
                      onChange={(e) => setNewParentDesc(e.target.value)}
                      placeholder="Plain-English description for this main category..."
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-sm"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2.5">
                <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Categories to Convert ({manualConvertRows.filter((r) => r.approved).length} checked)
                </div>
                {manualConvertRows.map((row, idx) => {
                  const isChosenParent =
                    parentMode === "existing" && row.categoryId === targetParentId;
                  return (
                    <div
                      key={row.categoryId}
                      className={`p-3 rounded-2xl border space-y-2 ${
                        isChosenParent
                          ? "bg-blue-50/60 border-blue-200"
                          : row.approved
                          ? "bg-slate-50 border-slate-200"
                          : "bg-slate-50/40 border-slate-200 opacity-60"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                          <input
                            type="checkbox"
                            disabled={isChosenParent}
                            checked={!isChosenParent && row.approved}
                            onChange={(e) =>
                              setManualConvertRows((prev) =>
                                prev.map((r, i) =>
                                  i === idx
                                    ? { ...r, approved: e.target.checked }
                                    : r
                                )
                              )
                            }
                            className="rounded border-slate-300"
                          />
                          <span>
                            {row.currentName} ({row.productCount} products)
                          </span>
                        </label>
                        {isChosenParent && (
                          <span className="text-[11px] font-bold text-[#0056b3]">
                            Selected as Main Parent (Kept as Parent)
                          </span>
                        )}
                      </div>

                      {!isChosenParent && row.approved && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-6">
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                              Resulting Subcategory Name
                            </label>
                            <input
                              type="text"
                              value={row.subcategoryName}
                              onChange={(e) =>
                                setManualConvertRows((prev) =>
                                  prev.map((r, i) =>
                                    i === idx
                                      ? { ...r, subcategoryName: e.target.value }
                                      : r
                                  )
                                )
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                              Subcategory Description (Optional)
                            </label>
                            <input
                              type="text"
                              value={row.subcategoryDescription}
                              onChange={(e) =>
                                setManualConvertRows((prev) =>
                                  prev.map((r, i) =>
                                    i === idx
                                      ? {
                                          ...r,
                                          subcategoryDescription: e.target.value,
                                        }
                                      : r
                                  )
                                )
                              }
                              placeholder="Auto-filled in plain English if left blank"
                              className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-xs"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConvertModal(false)}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#0056b3] hover:bg-blue-700 text-white text-xs font-extrabold cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Confirm &amp; Convert Checked Categories</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal 2: Merge Duplicate Categories */}
      {showMergeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleMergeSelected}
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900">
                Confirm Merging Duplicate Categories
              </h3>
              <button
                type="button"
                onClick={() => setShowMergeModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              All products and subcategories inside the selected categories will move directly into the target category below when you confirm.
            </p>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Keep / Merge Into Target Category *
              </label>
              <select
                required
                value={mergeTargetId}
                onChange={(e) => setMergeTargetId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              >
                <option value="">Select Target Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.productCount} products)
                  </option>
                ))}
              </select>
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowMergeModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold cursor-pointer"
              >
                Confirm &amp; Merge Categories
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal 3: Interactive 1-Time Subcategory & Main Category Mapping Workbench */}
      {mappingWorkbench && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-extrabold mb-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Preview Mode: Nothing is saved until you confirm below</span>
                </div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Review, Edit &amp; Confirm Main Category ↔ Subcategory Mapping
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Inspect each category below. You can uncheck any row to leave it untouched, change its Target Main Parent Category, rename the resulting Subcategory, or add your own custom Main Parent Category.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMappingWorkbench(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Workbench Controls & Custom Parent Creator */}
            <div className="px-5 py-3.5 border-b border-slate-200 bg-white space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    {
                      id: "matched",
                      label: `Auto-Suggested (${
                        mappingWorkbench.rows.filter((r) => r.autoMatched).length
                      })`,
                    },
                    {
                      id: "unmatched",
                      label: `Unmatched Flat Categories (${
                        mappingWorkbench.rows.filter((r) => !r.autoMatched).length
                      })`,
                    },
                    {
                      id: "all",
                      label: `All Flat Categories (${mappingWorkbench.rows.length})`,
                    },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() =>
                        setMappingWorkbench({
                          ...mappingWorkbench,
                          tab: t.id as "matched" | "unmatched" | "all",
                        })
                      }
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                        mappingWorkbench.tab === t.id
                          ? "bg-[#0056b3] text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setMappingWorkbench({
                        ...mappingWorkbench,
                        showParentEditor: !mappingWorkbench.showParentEditor,
                      })
                    }
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-bold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>
                      {mappingWorkbench.showParentEditor
                        ? "Hide Main Parent Categories Editor"
                        : `Manage / Add Main Parent Categories (${mappingWorkbench.parents.length})`}
                    </span>
                  </button>

                  <input
                    type="text"
                    value={mappingWorkbench.search}
                    onChange={(e) =>
                      setMappingWorkbench({
                        ...mappingWorkbench,
                        search: e.target.value,
                      })
                    }
                    placeholder="Search category rows..."
                    className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs w-48"
                  />
                </div>
              </div>

              {mappingWorkbench.showParentEditor && (
                <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={mappingWorkbench.newCustomParentName}
                      onChange={(e) =>
                        setMappingWorkbench({
                          ...mappingWorkbench,
                          newCustomParentName: e.target.value,
                        })
                      }
                      placeholder="New Main Parent Category name (e.g. Hospital & Clinic Acrylic)..."
                      className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs"
                    />
                    <input
                      type="text"
                      value={mappingWorkbench.newCustomParentDesc}
                      onChange={(e) =>
                        setMappingWorkbench({
                          ...mappingWorkbench,
                          newCustomParentDesc: e.target.value,
                        })
                      }
                      placeholder="Optional plain-English parent description..."
                      className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomParentInWorkbench}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shrink-0 cursor-pointer"
                    >
                      + Add Main Parent
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                    {mappingWorkbench.parents.map((p, pIdx) => (
                      <div
                        key={p.key}
                        className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center gap-2"
                      >
                        <input
                          type="text"
                          value={p.name}
                          onChange={(e) =>
                            setMappingWorkbench({
                              ...mappingWorkbench,
                              parents: mappingWorkbench.parents.map((item, i) =>
                                i === pIdx ? { ...item, name: e.target.value } : item
                              ),
                            })
                          }
                          className="flex-1 px-2 py-1 rounded border border-slate-200 text-xs font-bold text-slate-800"
                        />
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
                          {p.existingCategoryId ? "Existing" : "Will Create"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const visibleIds = new Set(
                        visibleWorkbenchRows.map((r) => r.categoryId)
                      );
                      setMappingWorkbench({
                        ...mappingWorkbench,
                        rows: mappingWorkbench.rows.map((r) =>
                          visibleIds.has(r.categoryId) && r.targetParentKey
                            ? { ...r, approved: true }
                            : r
                        ),
                      });
                    }}
                    className="font-bold text-[#0056b3] hover:underline cursor-pointer"
                  >
                    Check All Assigned in View
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const visibleIds = new Set(
                        visibleWorkbenchRows.map((r) => r.categoryId)
                      );
                      setMappingWorkbench({
                        ...mappingWorkbench,
                        rows: mappingWorkbench.rows.map((r) =>
                          visibleIds.has(r.categoryId)
                            ? { ...r, approved: false }
                            : r
                        ),
                      });
                    }}
                    className="font-bold text-slate-500 hover:underline cursor-pointer"
                  >
                    Uncheck All in View
                  </button>
                </div>
                <span className="font-bold text-slate-800">
                  {approvedWorkbenchRows.length} categories approved ({approvedWorkbenchProductsCount} products)
                </span>
              </div>
            </div>

            {/* Interactive Mapping Rows */}
            <div className="p-5 overflow-y-auto space-y-2.5 flex-1 bg-slate-50/50">
              {visibleWorkbenchRows.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-500">
                  No flat categories in this tab. Switch tabs above or close if your categories are already organized.
                </div>
              ) : (
                visibleWorkbenchRows.map((row) => (
                  <div
                    key={row.categoryId}
                    className={`p-3.5 rounded-2xl border transition-colors ${
                      row.approved && row.targetParentKey
                        ? "bg-white border-blue-200 shadow-2xs"
                        : "bg-white/70 border-slate-200"
                    }`}
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
                      {/* Checkbox + Source Category Info */}
                      <div className="lg:col-span-3 flex items-start gap-2.5 pt-1">
                        <input
                          type="checkbox"
                          checked={row.approved}
                          onChange={(e) =>
                            setMappingWorkbench({
                              ...mappingWorkbench,
                              rows: mappingWorkbench.rows.map((r) =>
                                r.categoryId === row.categoryId
                                  ? { ...r, approved: e.target.checked }
                                  : r
                              ),
                            })
                          }
                          className="mt-1 rounded border-slate-300"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-xs sm:text-sm text-slate-900 break-words">
                            {row.currentName}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {row.productCount} products • /{row.slug}
                          </div>
                        </div>
                      </div>

                      {/* Target Main Parent Category Selector */}
                      <div className="lg:col-span-4">
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                          Target Main Parent Category
                        </label>
                        <select
                          value={row.targetParentKey}
                          onChange={(e) => {
                            const nextParentKey = e.target.value;
                            setMappingWorkbench({
                              ...mappingWorkbench,
                              rows: mappingWorkbench.rows.map((r) =>
                                r.categoryId === row.categoryId
                                  ? {
                                      ...r,
                                      targetParentKey: nextParentKey,
                                      approved: Boolean(nextParentKey),
                                    }
                                  : r
                              ),
                            });
                          }}
                          className="w-full px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-800"
                        >
                          <option value="">Keep as Standalone Category (Do Not Convert)</option>
                          {mappingWorkbench.parents.map((p) => (
                            <option key={p.key} value={p.key}>
                              {p.name} {p.existingCategoryId ? "(Existing)" : "(New Main)"}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Editable Resulting Subcategory Name & Description */}
                      <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                            New Subcategory Name
                          </label>
                          <input
                            type="text"
                            value={row.proposedSubcategoryName}
                            onChange={(e) =>
                              setMappingWorkbench({
                                ...mappingWorkbench,
                                rows: mappingWorkbench.rows.map((r) =>
                                  r.categoryId === row.categoryId
                                    ? {
                                        ...r,
                                        proposedSubcategoryName: e.target.value,
                                      }
                                    : r
                                ),
                              })
                            }
                            className="w-full px-2.5 py-2 rounded-xl bg-white border border-slate-300 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                            Subcategory Description
                          </label>
                          <input
                            type="text"
                            value={row.proposedDescription}
                            onChange={(e) =>
                              setMappingWorkbench({
                                ...mappingWorkbench,
                                rows: mappingWorkbench.rows.map((r) =>
                                  r.categoryId === row.categoryId
                                    ? {
                                        ...r,
                                        proposedDescription: e.target.value,
                                      }
                                    : r
                                ),
                              })
                            }
                            className="w-full px-2.5 py-2 rounded-xl bg-white border border-slate-300 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Confirmation */}
            <div className="p-4 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                Unchecked rows stay untouched as standalone categories. Only checked rows with a chosen Main Parent Category will be converted.
              </p>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setMappingWorkbench(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Cancel (Save Nothing)
                </button>
                <button
                  type="button"
                  disabled={approvedWorkbenchRows.length === 0 || Boolean(busyMessage)}
                  onClick={() => void handleExecuteCustomMappingWorkbench()}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    Confirm &amp; Save {approvedWorkbenchRows.length} Mappings ({approvedWorkbenchProductsCount} Products)
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Interactive Alignment, Spelling, Descriptions & Sync Review Modal */}
      {alignmentPreview && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-extrabold mb-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Review Mode: Approve or edit each proposed fix before saving</span>
                </div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Confirm Spelling, Plain-English Descriptions &amp; Sync Updates
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAlignmentPreview(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {/* Integrity Sync Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={alignmentPreview.syncProductParents}
                    onChange={(e) =>
                      setAlignmentPreview({
                        ...alignmentPreview,
                        syncProductParents: e.target.checked,
                      })
                    }
                    className="mt-0.5 rounded border-slate-300"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Sync Subcategory → Parent Product Links ({alignmentPreview.outOfSyncProductParentCount})
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Ensures every product&apos;s main category matches its assigned subcategory&apos;s parent.
                    </div>
                  </div>
                </label>

                <label className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={alignmentPreview.syncPodiumFlags}
                    onChange={(e) =>
                      setAlignmentPreview({
                        ...alignmentPreview,
                        syncPodiumFlags: e.target.checked,
                      })
                    }
                    className="mt-0.5 rounded border-slate-300"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Sync Podium Flags ({alignmentPreview.outOfSyncPodiumCount})
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Marks products inside Podium categories as Podiums so patent info badges work uniformly.
                    </div>
                  </div>
                </label>
              </div>

              {/* Category & Subcategory Name / Description Updates */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                    Proposed Category &amp; Subcategory Updates ({alignmentPreview.taxonomyRows.filter((r) => r.approved).length} of {alignmentPreview.taxonomyRows.length} checked)
                  </h4>
                  {alignmentPreview.taxonomyRows.length > 0 && (
                    <div className="flex gap-3 text-xs">
                      <button
                        type="button"
                        onClick={() =>
                          setAlignmentPreview({
                            ...alignmentPreview,
                            taxonomyRows: alignmentPreview.taxonomyRows.map((r) => ({
                              ...r,
                              approved: true,
                            })),
                          })
                        }
                        className="font-bold text-[#0056b3] hover:underline cursor-pointer"
                      >
                        Check All
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setAlignmentPreview({
                            ...alignmentPreview,
                            taxonomyRows: alignmentPreview.taxonomyRows.map((r) => ({
                              ...r,
                              approved: false,
                            })),
                          })
                        }
                        className="font-bold text-slate-500 hover:underline cursor-pointer"
                      >
                        Uncheck All
                      </button>
                    </div>
                  )}
                </div>

                {alignmentPreview.taxonomyRows.length === 0 ? (
                  <p className="text-xs text-slate-500 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                    All categories and subcategories already have clean spelling and descriptions!
                  </p>
                ) : (
                  alignmentPreview.taxonomyRows.map((row, idx) => (
                    <div
                      key={`${row.kind}-${row.id}`}
                      className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={row.approved}
                            onChange={(e) =>
                              setAlignmentPreview({
                                ...alignmentPreview,
                                taxonomyRows: alignmentPreview.taxonomyRows.map(
                                  (r, i) =>
                                    i === idx
                                      ? { ...r, approved: e.target.checked }
                                      : r
                                ),
                              })
                            }
                            className="rounded border-slate-300"
                          />
                          <span>
                            {row.kind === "subCategory"
                              ? `Subcategory (${row.parentName}): `
                              : "Main Category: "}
                            {row.currentName}
                          </span>
                        </label>
                        <div className="flex gap-1.5">
                          {row.hasRename && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                              Spelling Fix
                            </span>
                          )}
                          {row.needsDescription && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#0056b3] text-[10px] font-bold">
                              New Plain Description
                            </span>
                          )}
                        </div>
                      </div>

                      {row.approved && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pl-6">
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                              Updated Name
                            </label>
                            <input
                              type="text"
                              value={row.proposedName}
                              onChange={(e) =>
                                setAlignmentPreview({
                                  ...alignmentPreview,
                                  taxonomyRows: alignmentPreview.taxonomyRows.map(
                                    (r, i) =>
                                      i === idx
                                        ? { ...r, proposedName: e.target.value }
                                        : r
                                  ),
                                })
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                              Plain-English Description
                            </label>
                            <input
                              type="text"
                              value={row.proposedDescription}
                              onChange={(e) =>
                                setAlignmentPreview({
                                  ...alignmentPreview,
                                  taxonomyRows: alignmentPreview.taxonomyRows.map(
                                    (r, i) =>
                                      i === idx
                                        ? {
                                            ...r,
                                            proposedDescription: e.target.value,
                                          }
                                        : r
                                  ),
                                })
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Team Role Title Formatting */}
              {alignmentPreview.teamRows.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                    Proposed Team Title Case Fixes ({alignmentPreview.teamRows.filter((t) => t.approved).length})
                  </h4>
                  {alignmentPreview.teamRows.map((t, idx) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2"
                    >
                      <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={t.approved}
                          onChange={(e) =>
                            setAlignmentPreview({
                              ...alignmentPreview,
                              teamRows: alignmentPreview.teamRows.map((row, i) =>
                                i === idx
                                  ? { ...row, approved: e.target.checked }
                                  : row
                              ),
                            })
                          }
                          className="rounded border-slate-300"
                        />
                        <span>
                          {t.memberName}: {t.currentPosition} →
                        </span>
                      </label>
                      <input
                        type="text"
                        value={t.proposedPosition}
                        onChange={(e) =>
                          setAlignmentPreview({
                            ...alignmentPreview,
                            teamRows: alignmentPreview.teamRows.map((row, i) =>
                              i === idx
                                ? { ...row, proposedPosition: e.target.value }
                                : row
                            ),
                          })
                        }
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-xs font-semibold"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setAlignmentPreview(null)}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancel (Save Nothing)
              </button>
              <button
                type="button"
                disabled={Boolean(busyMessage)}
                onClick={() => void handleConfirmSmartAlignAll()}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>Confirm &amp; Save Approved Alignment Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
