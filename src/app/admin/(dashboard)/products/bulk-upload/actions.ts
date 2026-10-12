"use server";

import { prisma } from "@/lib/db";
import slugify from "slugify";
import { revalidatePath } from "next/cache";

export async function saveDraftProduct(formData: FormData) {
  const name = formData.get("name") as string;
  let generatedSlug = slugify(name, { lower: true, strict: true });
  
  // ensure unique
  const existing = await prisma.product.findUnique({ where: { slug: generatedSlug } });
  if (existing) {
    generatedSlug = `${generatedSlug}-${Math.random().toString(36).substring(2, 6)}`;
  }
  
  const categoryId = formData.get("categoryId") as string;
  const sku = formData.get("sku") as string || null;
  
  const bpParsed = parseFloat(formData.get("basePrice") as string);
  const basePrice = !isNaN(bpParsed) ? bpParsed : null;
  const dpParsed = parseFloat(formData.get("discountPrice") as string);
  const discountPrice = !isNaN(dpParsed) ? dpParsed : null;
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

  await prisma.product.create({
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
          if (!name || name.trim() === "" || !specValues[i] || specValues[i].trim() === "") return null;
          return {
            name,
            value: specValues[i],
            type: specTypes[i] || "specification"
          };
        }).filter(Boolean) as any
      },

      images: imageCreates.length > 0 ? {
        create: imageCreates
      } : undefined,

      variants: {
        create: variantNames.map((name, i) => {
          if (!name || !name.trim()) return null;
          const parsedPrice = parseFloat(variantPrices[i]);
          const galleryUrls = (formData.getAll(`variantGallery_${i}[]`) as string[]).filter(u => u && u.trim() !== "");
          return {
            name,
            price: !isNaN(parsedPrice) ? parsedPrice : null,
            imageUrl: formData.get(`variantImage_${i}`) as string || null,
            images: galleryUrls.length > 0 ? {
              create: galleryUrls.map(url => ({ url }))
            } : undefined
          };
        }).filter(Boolean) as any
      },

      problemStatements: problemStatementIds.length > 0 ? { connect: problemStatementIds.map(id => ({ id })) } : undefined,
      industries: industryIds.length > 0 ? { connect: industryIds.map(id => ({ id })) } : undefined,
    }
  });

  // Revalidate but NO redirect
  revalidatePath("/admin/products");
  revalidatePath("/admin/podiums");
}
