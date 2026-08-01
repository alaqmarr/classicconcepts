export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Package, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ProductForm } from "@/components/admin/ProductForm";
import slugify from "slugify";

export default async function NewProductPage() {
  const categories = await prisma.category.findMany({ select: { id: true, name: true } });
  const problemStatements = await prisma.problemStatement.findMany({ select: { id: true, name: true } });
  const industries = await prisma.industry.findMany({ select: { id: true, name: true } });

  async function createProduct(formData: FormData) {
    "use server";
    
    const name = formData.get("name") as string;
    const generatedSlug = slugify(name, { lower: true, strict: true });
    
    const categoryId = formData.get("categoryId") as string;
    const sku = formData.get("sku") as string || null;
    
    const basePrice = formData.get("basePrice") ? parseFloat(formData.get("basePrice") as string) : null;
    const discountPrice = formData.get("discountPrice") ? parseFloat(formData.get("discountPrice") as string) : null;
    const stockStatus = formData.get("stockStatus") as string || "In stock";
    const discountBadge = formData.get("discountBadge") as string || null;
    
    const videoUrl = formData.get("videoUrl") as string || null;
    const description = formData.get("description") as string || null;
    const descriptionHtml = formData.get("descriptionHtml") as string || null;
    const importantNoteHtml = formData.get("importantNoteHtml") as string || null;
    
    const mainImage = formData.get("mainImage") as string || null;

    const featureTexts = formData.getAll("featureText[]") as string[];
    const specNames = formData.getAll("specName[]") as string[];
    const specValues = formData.getAll("specValue[]") as string[];
    const specTypes = formData.getAll("specType[]") as string[];
    const variantNames = formData.getAll("variantName[]") as string[];
    const variantPrices = formData.getAll("variantPrice[]") as string[];
    
    const problemStatementIds = formData.getAll("problemStatements[]") as string[];
    const industryIds = formData.getAll("industries[]") as string[];

    const imageCreates = [];
    if (mainImage) {
      imageCreates.push({ url: mainImage, isMain: true });
    }
    
    const galleryImages = formData.getAll("galleryImages[]") as string[];
    galleryImages.forEach(gImg => {
      if (gImg && gImg.trim() !== "") {
        imageCreates.push({ url: gImg, isMain: false });
      }
    });

    const product = await prisma.product.create({
      data: {
        id: generatedSlug,
        name, 
        slug: generatedSlug, 
        sku: sku || null,
        description: description || null,
        descriptionHtml: descriptionHtml || null,
        importantNoteHtml: importantNoteHtml || null,
        categoryId,
        basePrice: basePrice,
        discountPrice: discountPrice,
        discountBadge: discountBadge || null,
        stockStatus,
        videoUrl: videoUrl || null,
        isPodium: false,

        features: {
          create: featureTexts.map((text) => ({ text }))
        },
        
        specifications: {
          create: specNames.map((name, i) => {
            if (!name) return null;
            return {
              name,
              value: specValues[i],
              type: specTypes[i]
            };
          }).filter(Boolean) as any
        },

        images: imageCreates.length > 0 ? {
          create: imageCreates
        } : undefined,

        variants: {
          create: variantNames.map((name, i) => {
            if (!name.trim()) return null;
            return {
              name,
              price: variantPrices[i] ? parseFloat(variantPrices[i]) : null,
              imageUrl: formData.get(`variantImage_${i}`) as string || null
            };
          }).filter(Boolean) as any
        },

        problemStatements: { connect: problemStatementIds.map(id => ({ id })) },
        industries: { connect: industryIds.map(id => ({ id })) },
      }
    });

    revalidatePath("/admin/products");
    redirect("/admin/products");
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/products" className="p-2 bg-white rounded-lg shadow-sm border border-slate-100 text-slate-500 hover:text-[#0056b3] transition-colors">
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
      />
    </div>
  );
}
