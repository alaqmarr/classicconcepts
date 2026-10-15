import { FileSpreadsheet, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { BulkUploadClient } from "@/components/admin/BulkUploadClient";
import { saveDraftProduct } from "./actions";
import { prisma } from "@/lib/db";

export default async function BulkUploadPage() {
  const categories = await prisma.category.findMany({ select: { id: true, name: true } });
  const problemStatements = await prisma.problemStatement.findMany({ select: { id: true, name: true } });
  const industries = await prisma.industry.findMany({ select: { id: true, name: true } });

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center gap-4">
        <Link href="/admin/products" className="p-2 bg-white rounded-lg border border-slate-200 text-slate-500 hover:text-[#0056b3] transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2 mb-1">
            <FileSpreadsheet className="text-[#0056b3]" /> Bulk Pre-fill Forms
          </h1>
          <p className="text-slate-500 text-sm">Upload a CSV to instantly generate customizable product forms for each row.</p>
        </div>
      </div>

      <BulkUploadClient 
        categories={categories}
        problemStatements={problemStatements}
        industries={industries}
        saveDraftAction={saveDraftProduct} 
      />
    </div>
  );
}
