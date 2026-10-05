"use client";

import { useState } from "react";
import Papa from "papaparse";
import { UploadCloud, Download, FileSpreadsheet, Loader2, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import { ProductForm } from "@/components/admin/ProductForm";

interface Category {
  id: string;
  name: string;
}

interface BulkUploadClientProps {
  categories: Category[];
  problemStatements: Category[];
  industries: Category[];
  saveDraftAction: (formData: FormData) => Promise<void>;
}

export function BulkUploadClient({ categories, problemStatements, industries, saveDraftAction }: BulkUploadClientProps) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [draftProducts, setDraftProducts] = useState<any[]>([]);

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
      "Is Podium"
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
      "TRUE"
    ];

    const csvContent = [headers.join(","), sampleRow.join(",")].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "classic_concepts_products_template.csv");
    link.style.visibility = 'hidden';
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
          // Attempt to map category name
          const catName = row["Category Name"]?.trim().toLowerCase();
          const matchedCategory = categories.find(c => c.name.toLowerCase() === catName);

          return {
            _draftId: `draft-${Date.now()}-${index}`,
            name: row["Name"] || "",
            categoryId: matchedCategory?.id || "",
            sku: row["SKU"] || "",
            basePrice: row["Base Price"] || "",
            discountPrice: row["Discount Price"] || "",
            stockStatus: row["Stock Status"] || "In stock",
            description: row["Description"] || "",
            videoUrl: row["Video URL"] || "",
            isPodium: String(row["Is Podium"]).toLowerCase() === 'true',
            images: row["Main Image"] ? [{ url: row["Main Image"], isMain: true }] : []
          };
        });

        setDraftProducts(drafts);
        setIsUploading(false);
        toast.success(`Loaded ${drafts.length} products as drafts! Expand them below to customize and save.`);
      },
      error: (err) => {
        toast.error(`Error parsing CSV: ${err.message}`);
        setIsUploading(false);
      }
    });
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Upload Pre-fill CSV</h2>
            <p className="text-slate-500 text-sm mt-1">Upload a CSV to generate editable draft forms instantly.</p>
          </div>
          <button 
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
            disabled={isUploading}
          />
          
          <FileSpreadsheet className={`w-10 h-10 mb-3 ${csvFile ? 'text-[#0056b3]' : 'text-slate-400'}`} />
          
          <p className="text-slate-700 font-medium mb-1 text-center">
            {csvFile ? csvFile.name : "Select CSV File"}
          </p>
          <p className="text-slate-400 text-xs text-center">
            {csvFile ? `${(csvFile.size / 1024).toFixed(2)} KB` : "Supports .csv files only"}
          </p>
        </div>

        <div className="mt-8 flex justify-center">
          <button 
            onClick={handleParseCsv}
            disabled={!csvFile || isUploading}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-colors ${
              !csvFile || isUploading ? 'bg-slate-400 cursor-not-allowed' : 'bg-[#0056b3] hover:bg-blue-700'
            }`}
          >
            {isUploading ? <Loader2 className="animate-spin" size={20} /> : <UploadCloud size={20} />}
            {isUploading ? 'Parsing...' : 'Generate Draft Forms'}
          </button>
        </div>
      </div>

      {draftProducts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-slate-800 border-b pb-2">Draft Products ({draftProducts.length})</h3>
          <p className="text-sm text-slate-500 mb-4">Click on each product to upload images, add variants, customize details, and save it to the store.</p>
          
          {draftProducts.map((draft, i) => (
            <details key={draft._draftId} className="group border border-slate-200 bg-white rounded-xl shadow-sm overflow-hidden">
              <summary className="flex cursor-pointer items-center justify-between p-5 font-bold text-slate-800 bg-slate-50 hover:bg-slate-100 transition-colors">
                <span className="flex items-center gap-3">
                  <span className="flex items-center justify-center bg-[#0056b3] text-white rounded-full w-8 h-8 text-xs">{i + 1}</span>
                  {draft.name || "Unnamed Product"} 
                  {draft.categoryId ? "" : <span className="ml-3 px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-md font-normal">Missing Category</span>}
                </span>
                <ChevronDown className="text-slate-400 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="p-6 border-t border-slate-200 bg-white">
                <ProductForm 
                  categories={categories}
                  problemStatements={problemStatements}
                  industries={industries}
                  product={draft}
                  action={async (formData) => {
                    try {
                      await saveDraftAction(formData);
                      toast.success(`Saved "${draft.name}" successfully!`);
                      setDraftProducts(prev => prev.filter(p => p._draftId !== draft._draftId));
                    } catch (err: any) {
                      toast.error(`Error saving product: ${err.message}`);
                    }
                  }}
                />
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
