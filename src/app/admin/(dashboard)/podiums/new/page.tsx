export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Package, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ProductForm } from "@/components/admin/ProductForm";
import slugify from "slugify";

export default async function NewPodiumPage() {
  const categories = await prisma.category.findMany({ select: { id: true, name: true } });

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

    const product = await prisma.product.create({
      data: {
        id: generatedSlug,
        name,
        slug: generatedSlug,
        categoryId,
        sku,
        basePrice,
        discountPrice,
        stockStatus,
        discountBadge,
        videoUrl,
        description,
        descriptionHtml,
        importantNoteHtml,
        isPodium: true, // Specific to podiums
        
        features: {
          create: featureTexts.filter(t => t.trim() !== "").map(text => ({ text }))
        },
        
        specifications: {
          create: specNames.map((name, i) => {
            if (name.trim() === "" || specValues[i].trim() === "") return null;
            return {
              name,
              value: specValues[i],
              type: specTypes[i]
            };
          }).filter(Boolean) as any
        },

        images: mainImage ? {
          create: [{ url: mainImage, isMain: true }]
        } : undefined
      }
    });

    // Handle Variants (need loop for dynamic image keys)
    for (let i = 0; i < variantNames.length; i++) {
      if (variantNames[i].trim() === "") continue;
      const vImg = formData.get(`variantImage_${i}`) as string || null;
      const vPrice = variantPrices[i] ? parseFloat(variantPrices[i]) : null;
      
      await prisma.productVariant.create({
        data: {
          name: variantNames[i],
          price: vPrice,
          imageUrl: vImg,
          productId: product.id
        }
      });
    }

    revalidatePath("/admin/podiums");
    redirect("/admin/podiums");
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <Link href="/admin/podiums" className="p-2 bg-white rounded-lg border border-slate-200 text-slate-500 hover:text-[#0056b3] transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="text-[#0056b3]" />
            Add New Podium
          </h1>
          <p className="text-sm text-slate-500 mt-1">Fill out the details for the new podium</p>
        </div>
      </div>

      <ProductForm categories={categories} action={createProduct} />
    </div>
  );
}

