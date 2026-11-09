"use client";

import { useState } from "react";
import Papa from "papaparse";
import {
  UploadCloud,
  Download,
  FileSpreadsheet,
  Loader2,
  ChevronDown,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { ProductForm, ProductActionResult } from "@/components/admin/ProductForm";

interface Category {
  id: string;
  name: string;
}

interface BulkUploadClientProps {
  categories: Category[];
  podiumSubCategories?: Category[];
  problemStatements: Category[];
  industries: Category[];
  saveDraftAction: (formData: FormData) => Promise<ProductActionResult>;
}

export function BulkUploadClient({
  categories,
  podiumSubCategories = [],
  problemStatements,
  industries,
  saveDraftAction,
}: BulkUploadClientProps) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(
    null
  );
  const [draftProducts, setDraftProducts] = useState<any[]>([]);
  const [openDraftIds, setOpenDraftIds] = useState<Record<string, boolean>>({});

  const toggleDraftOpen = (draftId: string) => {
    setOpenDraftIds((prev) => ({ ...prev, [draftId]: !prev[draftId] }));
  };

  const handleDownloadTemplate = () => {
    const headers = [
      "Name",
      "Category Name",
      "SKU",
      "Base Price",
      "Discount Price",
      "Stock Status",
      "Description",
      "Main Image",
      "Video URL",
      "Is Podium",
    ];

    const sampleRow = [
      "Premium Acrylic Podium",
      "Acrylic Podiums",
      "POD-AC-001",
      "45000",
      "42000",
      "In stock",
      "High quality acrylic podium with mic.",
      "",
      "",
      "TRUE",
    ];

    const csvContent = [headers.join(","), sampleRow.join(",")].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "classic_concepts_products_template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCsvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCsvFile(e.target.files[0]);
    }
  };

  const handleParseCsv = () => {
    if (!csvFile) {
      toast.error("Please select a CSV file first.");
      return;
    }

    setIsUploading(true);

    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as any[];
        if (data.length === 0) {
          toast.error("The CSV file appears to be empty.");
          setIsUploading(false);
          return;
        }

        const drafts = data.map((row, index) => {
          const catName = row["Category Name"]?.trim().toLowerCase();
          const matchedCategory = categories.find(
            (c) => c.name.toLowerCase() === catName
          );

          return {
            _draftId: `draft-${Date.now()}-${index}`,
            _error: null as string | null,
            name: (row["Name"] || "").trim(),
            categoryId: matchedCategory?.id || "",
            sku: (row["SKU"] || "").trim(),
            basePrice: (row["Base Price"] || "").trim(),
            discountPrice: (row["Discount Price"] || "").trim(),
            stockStatus: (row["Stock Status"] || "In stock").trim(),
            description: (row["Description"] || "").trim(),
            videoUrl: (row["Video URL"] || "").trim(),
            isPodium: String(row["Is Podium"] || "").trim().toLowerCase() === "true",
            images: row["Main Image"]?.trim()
              ? [{ url: row["Main Image"].trim(), isMain: true }]
              : [],
          };
        });

        setDraftProducts(drafts);
        setOpenDraftIds({});
        setIsUploading(false);
        toast.success(
          `Loaded ${drafts.length} drafts! Expand individual rows to customize, or click "Save All Valid Drafts".`
        );
      },
      error: (err) => {
        toast.error(`Error parsing CSV: ${err.message}`);
        setIsUploading(false);
      },
    });
  };

  const handleSaveAllValidDrafts = async () => {
    const validDrafts = draftProducts.filter(
      (d) => d.name && d.categoryId && !openDraftIds[d._draftId]
    );
    if (validDrafts.length === 0) {
      toast.error(
        "No closed drafts with both Name and Category matched. Check Missing Category badges or close open drafts."
      );
      return;
    }

    setIsBulkSaving(true);
    setBulkProgress({ done: 0, total: validDrafts.length });

    let savedCount = 0;
    let failedCount = 0;
    const savedIds = new Set<string>();
    const errorMap: Record<string, string> = {};

    for (let i = 0; i < validDrafts.length; i++) {
      const d = validDrafts[i];
      const fd = new FormData();
      fd.append("name", d.name);
      fd.append("categoryId", d.categoryId);
      if (d.sku) fd.append("sku", d.sku);
      if (d.basePrice) fd.append("basePrice", String(d.basePrice));
      if (d.discountPrice) fd.append("discountPrice", String(d.discountPrice));
      fd.append("stockStatus", d.stockStatus || "In stock");
      if (d.description) fd.append("description", d.description);
      if (d.videoUrl) fd.append("videoUrl", d.videoUrl);
      fd.append("isPodium", String(Boolean(d.isPodium)));
      if (d.images?.[0]?.url) fd.append("mainImage", d.images[0].url);

      try {
        const res = await saveDraftAction(fd);
        if (res?.error) {
          failedCount++;
          errorMap[d._draftId] = res.error;
        } else {
          savedCount++;
          savedIds.add(d._draftId);
        }
      } catch (err: any) {
        failedCount++;
        errorMap[d._draftId] = err?.message || "Failed to save";
      }

      setBulkProgress({ done: i + 1, total: validDrafts.length });
    }

    setDraftProducts((prev) =>
      prev
        .filter((p) => !savedIds.has(p._draftId))
        .map((p) =>
          errorMap[p._draftId] ? { ...p, _error: errorMap[p._draftId] } : p
        )
    );
    setIsBulkSaving(false);
    setBulkProgress(null);

    if (savedCount > 0) {
      toast.success(`Saved ${savedCount} products!`);
    }
    if (failedCount > 0) {
      toast.error(`${failedCount} drafts had errors and remain listed below.`);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Upload Pre-fill CSV</h2>
            <p className="text-slate-500 text-sm mt-1">
              Upload a CSV to generate editable draft forms instantly.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-colors"
          >
            <Download size={16} />
            Download Template
          </button>
        </div>

        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50 relative hover:bg-slate-100 transition-colors max-w-2xl mx-auto">
          <input
            type="file"
            accept=".csv"
            onChange={handleCsvChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isUploading || isBulkSaving}
          />

          <FileSpreadsheet
            className={`w-10 h-10 mb-3 ${csvFile ? "text-[#0056b3]" : "text-slate-400"}`}
          />

          <p className="text-slate-700 font-medium mb-1 text-center">
            {csvFile ? csvFile.name : "Select CSV File"}
          </p>
          <p className="text-slate-400 text-xs text-center">
            {csvFile ? `${(csvFile.size / 1024).toFixed(2)} KB` : "Supports .csv files only"}
          </p>
        </div>

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={handleParseCsv}
            disabled={!csvFile || isUploading || isBulkSaving}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-colors ${
              !csvFile || isUploading || isBulkSaving
                ? "bg-slate-400 cursor-not-allowed"
                : "bg-[#0056b3] hover:bg-blue-700"
            }`}
          >
            {isUploading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <UploadCloud size={20} />
            )}
            {isUploading ? "Parsing..." : "Generate Draft Forms"}
          </button>
        </div>
      </div>

      {draftProducts.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-xl font-bold text-slate-800">
                Draft Products ({draftProducts.length})
              </h3>
              <p className="text-sm text-slate-500">
                Expand any product to upload images & variants, or bulk-save all valid closed rows immediately.
              </p>
            </div>
            <button
              type="button"
              disabled={isBulkSaving}
              onClick={handleSaveAllValidDrafts}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-xs transition-colors disabled:opacity-50"
            >
              {isBulkSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving {bulkProgress?.done}/{bulkProgress?.total}...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  Save All Valid Drafts
                </>
              )}
            </button>
          </div>

          {draftProducts.map((draft, i) => {
            const isOpen = !!openDraftIds[draft._draftId];
            return (
              <div
                key={draft._draftId}
                className="border border-slate-200 bg-white rounded-xl shadow-sm overflow-hidden"
              >
                <div
                  onClick={() => toggleDraftOpen(draft._draftId)}
                  className="flex cursor-pointer items-center justify-between p-5 font-bold text-slate-800 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex items-center justify-center bg-[#0056b3] text-white rounded-full w-8 h-8 text-xs shrink-0">
                      {i + 1}
                    </span>
                    <span>{draft.name || "Unnamed Product"}</span>
                    {draft.isPodium && (
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-md font-semibold">
                        Podium
                      </span>
                    )}
                    {!draft.categoryId && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-md font-semibold">
                        Missing Category
                      </span>
                    )}
                    {draft._error && (
                      <span className="px-2.5 py-0.5 bg-red-100 text-red-700 text-xs rounded-md font-semibold">
                        {draft._error}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDraftProducts((prev) =>
                          prev.filter((p) => p._draftId !== draft._draftId)
                        );
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                      title="Discard draft"
                    >
                      <Trash2 size={16} />
                    </button>
                    <ChevronDown
                      className={`text-slate-400 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </div>

                {isOpen && (
                  <div className="p-6 border-t border-slate-200 bg-white">
                    <ProductForm
                      categories={categories}
                      podiumSubCategories={podiumSubCategories}
                      problemStatements={problemStatements}
                      industries={industries}
                      product={draft}
                      isPodiumForm={draft.isPodium}
                      successMessage={`Saved "${draft.name || "Product"}"!`}
                      onSuccess={() => {
                        setDraftProducts((prev) =>
                          prev.filter((p) => p._draftId !== draft._draftId)
                        );
                      }}
                      action={saveDraftAction}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
