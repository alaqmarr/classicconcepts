export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Package, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ProductForm } from "@/components/admin/ProductForm";
import { updateCatalogItem } from "@/lib/product-mutations";

interface Props {
  params: Promise<{ id: string }>;
}

async function updateProduct(id: string, formData: FormData) {
  "use server";
  return updateCatalogItem(id, formData);
}

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  const [categories, podiumSubCategories, problemStatements, industries, product] =
    await Promise.all([
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
      prisma.product.findUnique({
        where: { id },
        include: {
          images: true,
          features: true,
          specifications: true,
          variants: {
            include: {
              images: true,
            },
          },
          problemStatements: { select: { id: true } },
          industries: { select: { id: true } },
          subCategories: { select: { id: true } },
          podiumSubCategories: { select: { id: true } },
        },
      }),
    ]);

  if (!product) {
    notFound();
  }

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/products"
          className="p-2 bg-white rounded-lg border border-slate-200 text-slate-500 hover:text-[#0056b3] transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="text-[#0056b3]" />
            Edit Product
          </h1>
          <p className="text-sm text-slate-500 mt-1">Updating {product.name}</p>
        </div>
      </div>

      <ProductForm
        categories={categories}
        podiumSubCategories={product.isPodium ? podiumSubCategories : []}
        problemStatements={problemStatements}
        industries={industries}
        action={updateProduct.bind(null, id)}
        product={product}
        redirectTo="/admin/products"
        successMessage="Product updated successfully!"
      />
    </div>
  );
}
