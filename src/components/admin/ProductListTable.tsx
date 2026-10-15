"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Edit2, Trash2, CheckSquare, Square, Layers, Search, Loader2, ArrowRightLeft, FolderTree } from "lucide-react";
import { DeleteForm } from "@/components/admin/DeleteForm";
import {
  bulkSetPodiumStatus,
  bulkSetPodiumSubCategory,
  bulkDeleteProducts,
} from "@/app/admin/(dashboard)/products/bulk-actions";
import toast from "react-hot-toast";

interface ProductItem {
  id: string;
  name: string;
  sku?: string | null;
  basePrice?: number | null;
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

interface ProductListTableProps {
  products: ProductItem[];
  deleteAction: (formData: FormData) => Promise<void>;
  currentType: "products" | "podiums";
  podiumSubCategories?: SubCategoryOption[];
}

export function ProductListTable({
  products,
  deleteAction,
  currentType,
  podiumSubCategories = [],
}: ProductListTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSubCatId, setFilterSubCatId] = useState("");
  const [targetSubCatId, setTargetSubCatId] = useState("");
  const [isPending, startTransition] = useTransition();

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

  const handleBulkSetPodium = (targetIsPodium: boolean) => {
    if (selectedIds.length === 0) return;

    startTransition(async () => {
      try {
        const res = await bulkSetPodiumStatus(selectedIds, targetIsPodium);
        toast.success(
          `Successfully marked ${res.count} items as ${targetIsPodium ? "Podiums" : "Standard Products"}!`
        );
        setSelectedIds([]);
      } catch (err: any) {
        toast.error(`Bulk update failed: ${err.message}`);
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
        toast.error(`Failed to update sub-category: ${err.message}`);
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
        toast.error(`Bulk deletion failed: ${err.message}`);
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Bar with Search, Filter & Quick Selection summary */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${currentType} (A-Z)...`}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3]"
            />
          </div>

          {currentType === "podiums" && podiumSubCategories.length > 0 && (
            <select
              value={filterSubCatId}
              onChange={(e) => setFilterSubCatId(e.target.value)}
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
            {isAllSelected ? <CheckSquare size={14} className="text-[#0056b3]" /> : <Square size={14} />}
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
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <Layers size={14} />}
                Mark as Podiums
              </button>
            ) : (
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleBulkSetPodium(false)}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
              >
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <ArrowRightLeft size={14} />}
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
                    {isAllSelected ? <CheckSquare size={16} className="text-[#0056b3]" /> : <Square size={16} />}
                  </button>
                </th>
                <th className="p-4">{currentType === "podiums" ? "Podium Name (A-Z)" : "Product Name (A-Z)"}</th>
                <th className="p-4">{currentType === "podiums" ? "Category / Sub-Category" : "Category"}</th>
                <th className="p-4">SKU / Price</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((product) => {
                const isSelected = selectedIds.includes(product.id);
                const editHref =
                  currentType === "podiums"
                    ? `/admin/podiums/${product.id}`
                    : `/admin/products/${product.id}`;

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
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-800">{product.name}</span>
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
                        ₹{product.basePrice?.toLocaleString("en-IN") || "0"}
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
                        <DeleteForm action={deleteAction}>
                          <input type="hidden" name="id" value={product.id} />
                          <button
                            type="submit"
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </DeleteForm>
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
      </div>
    </div>
  );
}
