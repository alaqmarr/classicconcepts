export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect, notFound } from "next/navigation";
import { Package, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ProductForm } from "@/components/admin/ProductForm";
import slugify from "slugify";

interface Props {
  params: Promise<{ id: string }>;
}

async function updateProduct(id: string, formData: FormData) {
  "use server";
  
  const name = formData.get("name") as string;
  const categoryId = formData.get("categoryId") as string;
  const sku = formData.get("sku") as string || null;
  
  let podiumSubCategoryId = (formData.get("podiumSubCategoryId") as string)?.trim() || null;
  const newPodiumSubCategory = (formData.get("newPodiumSubCategory") as string)?.trim();
  if (newPodiumSubCategory) {
    const subSlug = slugify(newPodiumSubCategory, { lower: true, strict: true });
    const sub = await prisma.podiumSubCategory.upsert({
      where: { slug: subSlug },
      update: { name: newPodiumSubCategory },
      create: { name: newPodiumSubCategory, slug: subSlug }
    });
    podiumSubCategoryId = sub.id;
  }

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

  await prisma.$transaction([
    prisma.productFeature.deleteMany({ where: { productId: id } }),
    prisma.productSpecification.deleteMany({ where: { productId: id } }),
    prisma.productVariant.deleteMany({ where: { productId: id } }),
    prisma.productImage.deleteMany({ where: { productId: id } })
  ]);

  const updated = await prisma.product.update({
    where: { id },
    data: {
      name,
      categoryId,
      podiumSubCategoryId,
      sku,
      basePrice,
      discountPrice,
      stockStatus,
      discountBadge,
      videoUrl,
      description,
      descriptionHtml,
      importantNoteHtml,
      isPodium: true,
      
      features: {
        create: featureTexts.filter(t => t.trim() !== "").map(text => ({ text }))
      },
      
      specifications: {
        create: specNames.map((n, i) => {
          if (!n || n.trim() === "" || !specValues[i] || specValues[i].trim() === "") return null;
          return {
            name: n,
            value: specValues[i],
            type: specTypes[i] || "specification"
          };
        }).filter(Boolean) as any
      },

      images: imageCreates.length > 0 ? {
        create: imageCreates
      } : undefined
    }
  });

  for (let i = 0; i < variantNames.length; i++) {
    if (!variantNames[i] || !variantNames[i].trim()) continue;
    const vImg = formData.get(`variantImage_${i}`) as string || null;
    const parsedPrice = parseFloat(variantPrices[i]);
    const vPrice = !isNaN(parsedPrice) ? parsedPrice : null;
    const galleryUrls = (formData.getAll(`variantGallery_${i}[]`) as string[]).filter(u => u && u.trim() !== "");
    
    await prisma.productVariant.create({
      data: {
        name: variantNames[i],
        price: vPrice,
        imageUrl: vImg,
        productId: id,
        images: galleryUrls.length > 0 ? {
          create: galleryUrls.map(url => ({ url }))
        } : undefined
      }
    });
  }

  revalidatePath("/", "layout");
  revalidatePath("/podiums");
  revalidatePath("/shop");
  revalidatePath(`/shop/p/${updated.slug}`);
  revalidatePath("/admin/podiums");
  revalidatePath(`/admin/podiums/${id}`);
  redirect("/admin/podiums");
}

export default async function EditPodiumPage({ params }: Props) {
  const { id } = await params;
  const [categories, podiumSubCategories, product] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.podiumSubCategory.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], select: { id: true, name: true } }),
    prisma.product.findUnique({
      where: { id },
      include: {
        images: true,
        features: true,
        specifications: true,
        variants: {
          include: {
            images: true
          }
        }
      }
    })
  ]);

  if (!product || !product.isPodium) {
    notFound();
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
            Edit Podium
          </h1>
          <p className="text-sm text-slate-500 mt-1">Updating {product.name}</p>
        </div>
      </div>

      <ProductForm
        categories={categories}
        podiumSubCategories={podiumSubCategories}
        action={updateProduct.bind(null, id)}
        product={product}
        isPodiumForm={true}
      />
    </div>
  );
}
