export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { Package, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ProductForm } from "@/components/admin/ProductForm";
import { createCatalogItem } from "@/lib/product-mutations";

export default async function NewPodiumPage() {
  const [categories, podiumSubCategories, problemStatements, industries] =
    await Promise.all([
      prisma.category.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.podiumSubCategory.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true },
      }),
      prisma.problemStatement.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.industry.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
    ]);

  async function createPodium(formData: FormData) {
    "use server";
    return createCatalogItem(formData, { isPodium: true });
  }

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/podiums"
          className="p-2 bg-white rounded-lg border border-slate-200 text-slate-500 hover:text-[#0056b3] transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="text-[#0056b3]" />
            Add New Podium
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Fill out the details for the new podium
          </p>
        </div>
      </div>

      <ProductForm
        categories={categories}
        podiumSubCategories={podiumSubCategories}
        problemStatements={problemStatements}
        industries={industries}
        action={createPodium}
        isPodiumForm={true}
        redirectTo="/admin/podiums"
        successMessage="Podium created successfully!"
      />
    </div>
  );
}
