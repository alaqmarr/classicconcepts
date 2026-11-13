"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Edit2,
  Trash2,
  CheckSquare,
  Square,
  Layers,
  Search,
  Loader2,
  ArrowRightLeft,
  FolderTree,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Check,
  X,
  Plus,
} from "lucide-react";
import { DeleteForm } from "@/components/admin/DeleteForm";
import {
  bulkSetPodiumStatus,
  bulkSetPodiumSubCategory,
  bulkDeleteProducts,
} from "@/app/admin/(dashboard)/products/bulk-actions";
import toast from "react-hot-toast";

interface ProductItem {
  id: string;
  slug?: string;
  name: string;
  sku?: string | null;
  basePrice?: number | null;
  discountPrice?: number | null;
  stockStatus?: string;
  isPodium: boolean;
  category: {
    name: string;
  };
  podiumSubCategory?: {
    id: string;
    name: string;
  } | null;
}

interface SubCategoryOption {
  id: string;
  name: string;
}

interface BulletReviewItem {
  id: string;
  name: string;
  sku: string | null;
  categoryName: string;
  currentBullets: string[];
  proposedBullets: string[];
  usedAi: boolean;
  approved: boolean;
  saved: boolean;
  savingOne?: boolean;
  showCurrent?: boolean;
}

interface ProductListTableProps {
  products: ProductItem[];
  deleteAction: (formData: FormData) => Promise<any>;
  currentType: "products" | "podiums";
  podiumSubCategories?: SubCategoryOption[];
}

const PAGE_SIZE = 50;

export function ProductListTable({
  products,
  deleteAction,
  currentType,
  podiumSubCategories = [],
}: ProductListTableProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSubCatId, setFilterSubCatId] = useState("");
  const [targetSubCatId, setTargetSubCatId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [aiBulkLoading, setAiBulkLoading] = useState(false);
  const [aiBulkProgress, setAiBulkProgress] = useState("");
  const [bulletReviewItems, setBulletReviewItems] = useState<
    BulletReviewItem[] | null
  >(null);
  const [reviewFilter, setReviewFilter] = useState("");
  const [applyingBulkBullets, setApplyingBulkBullets] = useState(false);

  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      p.category.name.toLowerCase().includes(q) ||
      (p.podiumSubCategory && p.podiumSubCategory.name.toLowerCase().includes(q));

    if (!matchesSearch) return false;
    if (filterSubCatId === "unassigned") {
      return !p.podiumSubCategory;
    }
    if (filterSubCatId) {
      return p.podiumSubCategory?.id === filterSubCatId;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedProducts = filteredProducts.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const isAllSelected =
    filteredProducts.length > 0 && selectedIds.length === filteredProducts.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map((p) => p.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Step 1: Prepare bullet previews ONLY (Zero direct database writes!)
  const handleBulkBulletize = async () => {
    if (selectedIds.length === 0) return;
    setAiBulkLoading(true);
    setAiBulkProgress(`0 / ${selectedIds.length}`);

    try {
      const collected: BulletReviewItem[] = [];
      for (let i = 0; i < selectedIds.length; i += 10) {
        const chunk = selectedIds.slice(i, i + 10);
        setAiBulkProgress(
          `${Math.min(i + chunk.length, selectedIds.length)} / ${selectedIds.length}`
        );
        const res = await fetch("/api/admin/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "preview_bulletize_products",
            productIds: chunk,
          }),
        });
        const json = await res.json();
        if (!json?.ok || !Array.isArray(json.items)) {
          throw new Error(json?.error || "Failed to prepare bullet preview batch");
        }
        for (const item of json.items) {
          collected.push({
            id: item.id,
            name: item.name,
            sku: item.sku || null,
            categoryName: item.categoryName || "Products",
            currentBullets: Array.isArray(item.currentBullets)
              ? item.currentBullets
              : [],
            proposedBullets: Array.isArray(item.proposedBullets)
              ? item.proposedBullets
              : [],
            usedAi: Boolean(item.usedAi),
            approved: true,
            saved: false,
            showCurrent: false,
          });
        }
      }

      setReviewFilter("");
      setBulletReviewItems(collected);
      toast(
        `Prepared ${collected.length} product previews. Check & approve each product before saving!`,
        { icon: "✨" }
      );
    } catch (err: any) {
      toast.error(err?.message || "Bulk bullet preview failed.");
    } finally {
      setAiBulkLoading(false);
      setAiBulkProgress("");
    }
  };

  // Save a single product right inside the review dialog when admin explicitly clicks "Approve & Save This Product"
  const handleSaveSingleReviewedProduct = async (productId: string) => {
    if (!bulletReviewItems) return;
    const target = bulletReviewItems.find((x) => x.id === productId);
    if (!target) return;
    const cleanBullets = target.proposedBullets.map((b) => b.trim()).filter(Boolean);
    if (cleanBullets.length === 0) {
      toast.error("Please keep at least one bullet point before saving.");
      return;
    }

    setBulletReviewItems((prev) =>
      prev
        ? prev.map((x) => (x.id === productId ? { ...x, savingOne: true } : x))
        : null
    );
    try {
      const res = await fetch("/api/admin/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "apply_approved_bullets",
          updates: [{ productId, bullets: cleanBullets }],
        }),
      });
      const json = await res.json();
      if (!json?.ok) {
        throw new Error(json?.error || "Could not save product bullets.");
      }
      setBulletReviewItems((prev) =>
        prev
          ? prev.map((x) =>
              x.id === productId
                ? { ...x, savingOne: false, saved: true, approved: true }
                : x
            )
          : null
      );
      toast.success(`Saved approved bullets for "${target.name}"!`);
      router.refresh();
    } catch (err: any) {
      setBulletReviewItems((prev) =>
        prev
          ? prev.map((x) => (x.id === productId ? { ...x, savingOne: false } : x))
          : null
      );
      toast.error(err?.message || "Failed to save product.");
    }
  };

  // Step 2: Save ONLY the admin-checked & approved products!
  const handleConfirmSaveApprovedBullets = async () => {
    if (!bulletReviewItems) return;
    const toSave = bulletReviewItems
      .filter((x) => x.approved && !x.saved)
      .map((x) => ({
        productId: x.id,
        bullets: x.proposedBullets.map((b) => b.trim()).filter(Boolean),
      }))
      .filter((u) => u.bullets.length > 0);

    if (toSave.length === 0) {
      toast.error("Please check at least one unsaved product to approve and save.");
      return;
    }

    setApplyingBulkBullets(true);
    try {
      let totalSaved = 0;
      for (let i = 0; i < toSave.length; i += 25) {
        const chunk = toSave.slice(i, i + 25);
        const res = await fetch("/api/admin/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "apply_approved_bullets",
            updates: chunk,
          }),
        });
        const json = await res.json();
        if (!json?.ok) {
          throw new Error(json?.error || "Failed to save approved updates.");
        }
        totalSaved += json.updatedCount || chunk.length;
      }

      toast.success(`Saved approved bullet points for ${totalSaved} products!`);
      setBulletReviewItems(null);
      setSelectedIds([]);
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save approved bullet points.");
    } finally {
      setApplyingBulkBullets(false);
    }
  };

  const handleBulkSetPodium = (targetIsPodium: boolean) => {
    if (selectedIds.length === 0) return;

    startTransition(async () => {
      try {
        const res = await bulkSetPodiumStatus(selectedIds, targetIsPodium);
        toast.success(
          `Successfully marked ${res.count} items as ${
            targetIsPodium ? "Podiums" : "Standard Products"
          }!`
        );
        setSelectedIds([]);
      } catch (err: any) {
        toast.error(`Bulk update failed: ${err?.message || "Unknown error"}`);
      }
    });
  };

  const handleBulkAssignSubCategory = () => {
    if (selectedIds.length === 0) return;

    startTransition(async () => {
      try {
        const subId = targetSubCatId === "__none__" ? null : targetSubCatId;
        if (!targetSubCatId) {
          toast.error("Please select a sub-category first");
          return;
        }
        const res = await bulkSetPodiumSubCategory(selectedIds, subId);
        toast.success(`Updated sub-category for ${res.count} podiums!`);
        setSelectedIds([]);
      } catch (err: any) {
        toast.error(`Failed to update sub-category: ${err?.message || "Unknown error"}`);
      }
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to permanently delete ${selectedIds.length} items?`)) {
      return;
    }

    startTransition(async () => {
      try {
        const res = await bulkDeleteProducts(selectedIds);
        toast.success(`Successfully deleted ${res.count} items!`);
        setSelectedIds([]);
      } catch (err: any) {
        toast.error(`Bulk deletion failed: ${err?.message || "Unknown error"}`);
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Bar with Search, Filter & Quick Selection summary */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={`Search ${currentType} (A-Z, SKU, category)...`}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3]"
            />
          </div>

          {currentType === "podiums" && podiumSubCategories.length > 0 && (
            <select
              value={filterSubCatId}
              onChange={(e) => {
                setFilterSubCatId(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:w-56 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0056b3]"
            >
              <option value="">All Sub-Categories</option>
              <option value="unassigned">Unassigned Only</option>
              {podiumSubCategories.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <button
            type="button"
            onClick={toggleSelectAll}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            {isAllSelected ? (
              <CheckSquare size={14} className="text-[#0056b3]" />
            ) : (
              <Square size={14} />
            )}
            {isAllSelected ? "Deselect All" : `Select All (${filteredProducts.length})`}
          </button>
          <span className="text-xs text-slate-500 font-medium">
            Total: {filteredProducts.length}
          </span>
        </div>
      </div>

      {/* Floating Bulk Actions Bar when items are selected */}
      {selectedIds.length > 0 && (
        <div className="sticky top-4 z-30 bg-[#0c1a40] text-white p-4 rounded-xl shadow-xl flex flex-wrap items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <span className="bg-white/20 text-white font-bold text-xs px-2.5 py-1 rounded-full">
              {selectedIds.length} Selected
            </span>
            <span className="text-xs text-white/80 hidden sm:inline">
              Choose bulk action:
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={isPending || aiBulkLoading}
              onClick={handleBulkBulletize}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-50"
            >
              {aiBulkLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              {aiBulkLoading
                ? `ACRIO Preparing Previews (${aiBulkProgress})...`
                : "ACRIO Convert to Bullets (Review & Approve)"}
            </button>

            {currentType === "podiums" && podiumSubCategories.length > 0 && (
              <div className="flex items-center gap-1.5 bg-white/10 p-1 rounded-lg border border-white/15">
                <select
                  value={targetSubCatId}
                  onChange={(e) => setTargetSubCatId(e.target.value)}
                  className="bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-md border border-white/10 focus:outline-none"
                >
                  <option value="">Select Sub-Category...</option>
                  {podiumSubCategories.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                  <option value="__none__">-- Remove Sub-Category --</option>
                </select>
                <button
                  type="button"
                  disabled={isPending || !targetSubCatId}
                  onClick={handleBulkAssignSubCategory}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-bold transition-colors disabled:opacity-50"
                >
                  <FolderTree size={13} />
                  Assign
                </button>
              </div>
            )}

            {currentType === "products" ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleBulkSetPodium(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Layers size={14} />
                )}
                Mark as Podiums
              </button>
            ) : (
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleBulkSetPodium(false)}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <ArrowRightLeft size={14} />
                )}
                Move to Standard Products
              </button>
            )}

            <button
              type="button"
              disabled={isPending}
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
            >
              <Trash2 size={14} />
              Delete Selected
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-xs text-white/70 hover:text-white px-2 py-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
                <th className="p-4 w-12 text-center">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-slate-400 hover:text-slate-700"
                  >
                    {isAllSelected ? (
                      <CheckSquare size={16} className="text-[#0056b3]" />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>
                </th>
                <th className="p-4">
                  {currentType === "podiums" ? "Podium Name (A-Z)" : "Product Name (A-Z)"}
                </th>
                <th className="p-4">
                  {currentType === "podiums" ? "Category / Sub-Category" : "Category"}
                </th>
                <th className="p-4">SKU / Price</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedProducts.map((product) => {
                const isSelected = selectedIds.includes(product.id);
                const editHref =
                  currentType === "podiums"
                    ? `/admin/podiums/${product.id}`
                    : `/admin/products/${product.id}`;

                const displayPrice = product.discountPrice ?? product.basePrice;

                return (
                  <tr
                    key={product.id}
                    className={`transition-colors ${
                      isSelected ? "bg-blue-50/50 hover:bg-blue-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={() => toggleSelectOne(product.id)}
                        className="text-slate-400 hover:text-slate-700"
                      >
                        {isSelected ? (
                          <CheckSquare size={16} className="text-[#0056b3]" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{product.name}</span>
                        {product.slug && (
                          <Link
                            href={`/shop/p/${product.slug}`}
                            target="_blank"
                            title="Open live page to inline-edit directly"
                            className="text-slate-400 hover:text-indigo-600 transition-colors"
                          >
                            <ExternalLink size={14} />
                          </Link>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-slate-500 text-sm">
                      <div>{product.category?.name || "Uncategorized"}</div>
                      {product.podiumSubCategory && (
                        <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-[#0056b3] border border-blue-200/60">
                          {product.podiumSubCategory.name}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-slate-500 text-sm">
                      <div>{product.sku || "No SKU"}</div>
                      <div className="font-bold text-slate-700">
                        {displayPrice != null
                          ? `₹${displayPrice.toLocaleString("en-IN")}`
                          : "Price on request"}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={editHref}
                          className="p-2 text-slate-400 hover:text-[#0056b3] hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={18} />
                        </Link>
                        <DeleteForm action={deleteAction} id={product.id} />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No {currentType} found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>
              Showing {(safePage - 1) * PAGE_SIZE + 1} to{" "}
              {Math.min(safePage * PAGE_SIZE, filteredProducts.length)} of{" "}
              {filteredProducts.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="font-bold px-2">
                Page {safePage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Per-Product Review & Individual Approval Dialog for Bulk Bullet Updates */}
      {bulletReviewItems && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            {/* Dialog Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-[#0c1a40] via-indigo-950 to-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base md:text-lg font-extrabold flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-300" />
                  <span>
                    Review &amp; Approve Individual Product Bullet Updates (
                    {bulletReviewItems.length} Products)
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Nothing is saved automatically. Check, edit, or uncheck each product individually, save one by one, or save all approved items below.
                </p>
              </div>
              <button
                type="button"
                disabled={applyingBulkBullets}
                onClick={() => setBulletReviewItems(null)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            {/* Filter & Batch Check Controls */}
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={reviewFilter}
                  onChange={(e) => setReviewFilter(e.target.value)}
                  placeholder="Filter products in review list..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() =>
                    setBulletReviewItems((prev) =>
                      prev ? prev.map((x) => ({ ...x, approved: true })) : null
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-bold text-slate-700 hover:bg-slate-100"
                >
                  Check All ({bulletReviewItems.length})
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setBulletReviewItems((prev) =>
                      prev
                        ? prev.map((x) =>
                            x.saved ? x : { ...x, approved: false }
                          )
                        : null
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-bold text-slate-700 hover:bg-slate-100"
                >
                  Uncheck Unsaved
                </button>
              </div>
            </div>

            {/* Individual Product Cards */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-slate-100/60">
              {bulletReviewItems
                .filter((item) => {
                  if (!reviewFilter.trim()) return true;
                  const q = reviewFilter.toLowerCase();
                  return (
                    item.name.toLowerCase().includes(q) ||
                    (item.sku && item.sku.toLowerCase().includes(q)) ||
                    item.categoryName.toLowerCase().includes(q)
                  );
                })
                .map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-2xl border p-4 bg-white shadow-2xs transition-all space-y-3 ${
                      item.saved
                        ? "border-emerald-300 bg-emerald-50/20"
                        : item.approved
                        ? "border-indigo-300"
                        : "border-slate-200 opacity-70"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          disabled={item.saved}
                          checked={item.approved}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setBulletReviewItems((prev) =>
                              prev
                                ? prev.map((x) =>
                                    x.id === item.id
                                      ? { ...x, approved: checked }
                                      : x
                                  )
                                : null
                            );
                          }}
                          className="mt-1 w-4 h-4 rounded text-indigo-600"
                        />
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-900">
                              {item.name}
                            </span>
                            {item.sku && (
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-mono">
                                SKU: {item.sku}
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#0056b3] text-[11px] font-semibold">
                              {item.categoryName}
                            </span>
                            {item.saved && (
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-extrabold">
                                Saved ✓
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {item.saved
                              ? "This product update has been confirmed and saved."
                              : item.approved
                              ? "Approved for update (you can edit any bullet below before saving)"
                              : "Unchecked (will be skipped and left untouched)"}
                          </p>
                        </div>
                      </label>

                      <div className="flex flex-wrap items-center gap-2">
                        {item.currentBullets.length > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setBulletReviewItems((prev) =>
                                prev
                                  ? prev.map((x) =>
                                      x.id === item.id
                                        ? { ...x, showCurrent: !x.showCurrent }
                                        : x
                                    )
                                  : null
                              )
                            }
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                          >
                            {item.showCurrent
                              ? "Hide Current Text"
                              : "Compare Current Text"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setBulletReviewItems((prev) =>
                              prev
                                ? prev.map((x) =>
                                    x.id === item.id
                                      ? {
                                          ...x,
                                          saved: false,
                                          proposedBullets: [
                                            ...x.proposedBullets,
                                            "",
                                          ],
                                        }
                                      : x
                                  )
                                : null
                            )
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold"
                        >
                          <Plus size={12} />
                          Add Bullet
                        </button>
                        {!item.saved && (
                          <button
                            type="button"
                            disabled={Boolean(item.savingOne)}
                            onClick={() =>
                              void handleSaveSingleReviewedProduct(item.id)
                            }
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50"
                          >
                            {item.savingOne ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Check size={12} />
                            )}
                            Approve &amp; Save This Product
                          </button>
                        )}
                      </div>
                    </div>

                    {item.showCurrent && item.currentBullets.length > 0 && (
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                        <span className="font-bold text-[11px] uppercase text-slate-500 block">
                          Current Description:
                        </span>
                        <ul className="list-disc pl-4 space-y-0.5">
                          {item.currentBullets.map((cb, cIdx) => (
                            <li key={cIdx}>{cb}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Editable Proposed Bullets for This Product */}
                    <div className="space-y-2 pl-0 sm:pl-7">
                      {item.proposedBullets.map((bText, bIdx) => (
                        <div key={bIdx} className="flex items-center gap-2">
                          <span className="w-5 text-xs font-bold text-slate-400 shrink-0">
                            {bIdx + 1}.
                          </span>
                          <input
                            type="text"
                            value={bText}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBulletReviewItems((prev) =>
                                prev
                                  ? prev.map((x) =>
                                      x.id === item.id
                                        ? {
                                            ...x,
                                            saved: false,
                                            proposedBullets:
                                              x.proposedBullets.map((oldB, i) =>
                                                i === bIdx ? val : oldB
                                              ),
                                          }
                                        : x
                                    )
                                  : null
                              );
                            }}
                            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setBulletReviewItems((prev) =>
                                prev
                                  ? prev.map((x) =>
                                      x.id === item.id
                                        ? {
                                            ...x,
                                            saved: false,
                                            proposedBullets:
                                              x.proposedBullets.filter(
                                                (_, i) => i !== bIdx
                                              ),
                                          }
                                        : x
                                    )
                                  : null
                              )
                            }
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg shrink-0"
                            title="Remove bullet"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>

            {/* Dialog Footer */}
            <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-600 font-medium">
                <strong>
                  {bulletReviewItems.filter((x) => x.approved && !x.saved).length}
                </strong>{" "}
                unsaved products checked for approval •{" "}
                <strong>{bulletReviewItems.filter((x) => x.saved).length}</strong>{" "}
                already saved individually
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={applyingBulkBullets}
                  onClick={() => setBulletReviewItems(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  Close / Cancel Unsaved
                </button>
                <button
                  type="button"
                  disabled={
                    applyingBulkBullets ||
                    bulletReviewItems.filter((x) => x.approved && !x.saved)
                      .length === 0
                  }
                  onClick={() => void handleConfirmSaveApprovedBullets()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-sm disabled:opacity-50"
                >
                  {applyingBulkBullets ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Check size={15} />
                  )}
                  <span>
                    Confirm &amp; Save Approved Products (
                    {
                      bulletReviewItems.filter((x) => x.approved && !x.saved)
                        .length
                    }
                    )
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
