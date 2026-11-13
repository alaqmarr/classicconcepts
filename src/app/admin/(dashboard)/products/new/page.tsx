export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { Package, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ProductForm } from "@/components/admin/ProductForm";
import { createCatalogItem } from "@/lib/product-mutations";

export default async function NewProductPage() {
  const [categories, problemStatements, industries] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        subCategories: {
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { id: true, name: true },
        },
      },
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

  async function createProduct(formData: FormData) {
    "use server";
    return createCatalogItem(formData, { isPodium: false });
  }

  return (
    <div className="space-y-6 w-full mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/products"
            className="p-2 bg-white rounded-lg shadow-sm border border-slate-100 text-slate-500 hover:text-[#0056b3] transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Package className="text-[#0056b3]" />
              Add New Product
            </h1>
          </div>
        </div>
      </div>

      <ProductForm
        categories={categories}
        problemStatements={problemStatements}
        industries={industries}
        action={createProduct}
        redirectTo="/admin/products"
        successMessage="Product created successfully!"
      />
    </div>
  );
}
