import {
  getPublicSiteSettings,
  lookupCategoryOrConvertedSubBySlug,
} from "@/lib/public-data";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProductGridWithSearch } from "@/components/shop/ProductGridWithSearch";
import { ShopSmartSearchBar } from "@/components/ai/ShopSmartSearchBar";
import { EditableText } from "@/components/inline-edit/EditableText";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { slug } = await params;
  const resolvedSearch = await searchParams;
  const subQuery =
    typeof resolvedSearch.sub === "string"
      ? resolvedSearch.sub.trim()
      : undefined;

  const { category, convertedSub } =
    await lookupCategoryOrConvertedSubBySlug(slug);

  if (!category) {
    if (convertedSub) {
      return {
        title: `${convertedSub.name} (${convertedSub.categoryName}) | Classic Concepts`,
        description:
          convertedSub.description ||
          `Browse clear cast acrylic ${convertedSub.name.toLowerCase()} made by Classic Concepts Since 2008.`,
      };
    }
    return { title: "Category Not Found - Classic Concepts" };
  }

  const activeSub = subQuery
    ? category.subCategories.find((s) => s.slug === subQuery)
    : null;

  const displayName = activeSub
    ? `${activeSub.name} (${category.name})`
    : category.name;
  const title = `${displayName} | Buy Acrylic ${activeSub ? activeSub.name : category.name} | Classic Concepts`;
  const description =
    activeSub?.description ||
    category.description ||
    `Browse our collection of durable clear cast acrylic ${category.name.toLowerCase()} made by Classic Concepts Since 2008. Custom logo printing and pan-India safe delivery.`;
  const mainImage =
    activeSub?.imageUrl || category.imageUrl || "/short-logo.png";
  const canonicalUrl = activeSub
    ? `https://classicconcepts.in/shop/c/${category.slug}?sub=${activeSub.slug}`
    : `https://classicconcepts.in/shop/c/${category.slug}`;

  return {
    title,
    description,
    keywords: [
      category.name,
      ...(activeSub ? [activeSub.name] : []),
      `Acrylic ${category.name}`,
      "Classic Concepts",
      "Acrylic Manufacturer India",
    ],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "Classic Concepts",
      images: [
        {
          url: mainImage,
          width: 800,
          height: 800,
          alt: displayName,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [mainImage],
    },
  };
}

export default async function CategoryShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { slug } = await params;
  const resolvedSearch = await searchParams;
  const subSlug =
    typeof resolvedSearch.sub === "string"
      ? resolvedSearch.sub.trim()
      : undefined;

  const [{ category, convertedSub, catalog }, settings] = await Promise.all([
    lookupCategoryOrConvertedSubBySlug(slug),
    getPublicSiteSettings(),
  ]);

  if (!category) {
    // Automatic Legacy Category -> SubCategory Redirect so zero live production URLs 404!
    if (convertedSub?.categorySlug) {
      redirect(
        `/shop/c/${convertedSub.categorySlug}?sub=${convertedSub.slug}`
      );
    }
    notFound();
  }

  const activeSubCategory = subSlug
    ? category.subCategories.find((s) => s.slug === subSlug) || null
    : null;

  // Show subcategories that have products (or the currently active one)
  const visibleSubCategories = category.subCategories.filter(
    (s) =>
      s._count.products > 0 ||
      s._count.multiProducts > 0 ||
      s.id === activeSubCategory?.id
  );

  const products = catalog.products.filter((p) => {
    if (p.categoryId !== category.id) return false;
    if (activeSubCategory) {
      return p.subCategoryIds.includes(activeSubCategory.id);
    }
    return true;
  });

  const allCategories = catalog.categories.filter(
    (c) => c._count.products > 0 || c.id === category.id
  );
  const totalProductsOverall = catalog.totalProductsOverall;

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: activeSubCategory
      ? `${activeSubCategory.name} - ${category.name} - Classic Concepts`
      : `${category.name} - Classic Concepts`,
    url: activeSubCategory
      ? `https://classicconcepts.in/shop/c/${category.slug}?sub=${activeSubCategory.slug}`
      : `https://classicconcepts.in/shop/c/${category.slug}`,
    description:
      activeSubCategory?.description ||
      category.description ||
      `Browse clear acrylic ${category.name.toLowerCase()} by Classic Concepts.`,
  };

  const defaultCatDescription =
    category.descriptionHtml ||
    (category.description ? `<p>${category.description}</p>` : null) ||
    `<p>Browse our range of durable cast acrylic ${category.name.toLowerCase()} made in our 16,000 sq. ft. factory Since 2008, with custom size and logo options available.</p>`;

  const defaultSubDescription = activeSubCategory
    ? activeSubCategory.descriptionHtml ||
      (activeSubCategory.description
        ? `<p>${activeSubCategory.description}</p>`
        : `<p>Explore ${activeSubCategory.name.toLowerCase()} under ${category.name.toLowerCase()}, made from strong non-yellowing cast acrylic with custom logo branding options.</p>`)
    : "";

  const quickPills =
    visibleSubCategories.length > 0
      ? [
          {
            label: `All ${category.name}`,
            href: `/shop/c/${category.slug}`,
            count: category._count.products,
            active: !activeSubCategory,
          },
          ...visibleSubCategories.map((sub) => ({
            label: sub.name,
            href: `/shop/c/${category.slug}?sub=${sub.slug}`,
            count: Math.max(sub._count.products, sub._count.multiProducts),
            active: activeSubCategory?.id === sub.id,
          })),
        ]
      : [
          {
            label: "All Products",
            href: "/shop",
            count: totalProductsOverall,
            active: false,
          },
          ...allCategories.map((cat) => ({
            label: cat.name,
            href: `/shop/c/${cat.slug}`,
            count: cat._count.products,
            active: cat.id === category.id,
          })),
        ];

  const filterGroups = [
    ...(visibleSubCategories.length > 0
      ? [
          {
            title: `${category.name} Types`,
            items: [
              {
                label: `All ${category.name}`,
                href: `/shop/c/${category.slug}`,
                count: category._count.products,
                active: !activeSubCategory,
              },
              ...visibleSubCategories.map((sub) => ({
                label: sub.name,
                href: `/shop/c/${category.slug}?sub=${sub.slug}`,
                count: Math.max(sub._count.products, sub._count.multiProducts),
                active: activeSubCategory?.id === sub.id,
              })),
            ],
          },
        ]
      : []),
    {
      title: "All Categories",
      items: [
        {
          label: "All Products",
          href: "/shop",
          count: totalProductsOverall,
          active: false,
        },
        ...allCategories.map((cat) => ({
          label: cat.name,
          href: `/shop/c/${cat.slug}`,
          count: cat._count.products,
          active: cat.id === category.id,
        })),
      ],
    },
    ...(catalog.problemStatements.length > 0
      ? [
          {
            title: "Shop by Requirement",
            items: catalog.problemStatements.map((ps) => ({
              label: ps.name,
              href: `/shop/problem/${ps.slug}`,
              active: false,
            })),
          },
        ]
      : []),
    ...(catalog.industries.length > 0
      ? [
          {
            title: "Shop by Industry",
            items: catalog.industries.map((ind) => ({
              label: ind.name,
              href: `/shop/industry/${ind.slug}`,
              active: false,
            })),
          },
        ]
      : []),
  ];

  return (
    <main className="min-h-screen bg-[#fafbfc] flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(collectionJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <PageHeader
        contentKeyPrefix={`shop.category.${category.slug}`}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          { label: "Categories", href: "/shop/c" },
          ...(activeSubCategory
            ? [
                { label: category.name, href: `/shop/c/${category.slug}` },
                { label: activeSubCategory.name },
              ]
            : [{ label: category.name }]),
        ]}
        title={
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
            {activeSubCategory ? activeSubCategory.name : category.name}
          </span>
        }
        description={
          activeSubCategory?.description ||
          category.description ||
          `Browse our collection of ${category.name.toLowerCase()} made in our 16,000 sq. ft. factory Since 2008.`
        }
      />

      <section className="py-8 sm:py-10 container mx-auto px-4 sm:px-6 relative z-20 space-y-6">
        <ShopSmartSearchBar
          onlyPodiums={false}
          whatsappNumber={settings?.whatsappNumber || "+917337220568"}
          defaultCategoryHint={
            activeSubCategory ? activeSubCategory.name : category.name
          }
          placeholder={`Search inside ${
            activeSubCategory ? activeSubCategory.name : category.name
          }, SKU, or describe what you need...`}
        />

        {/* Category / Active Subcategory Description Card */}
        {activeSubCategory ? (
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-2xs border border-blue-200/80">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
              <EditableText
                as="h2"
                entity={{
                  model: "subCategory",
                  id: activeSubCategory.id,
                  field: "name",
                }}
                value={activeSubCategory.name}
                label={`Subcategory Title: ${activeSubCategory.name}`}
                className="text-base sm:text-lg font-bold text-slate-900 block"
              />
              <Link
                href={`/shop/c/${category.slug}`}
                className="text-xs font-bold text-[#0056b3] hover:underline"
              >
                ← View All {category.name}
              </Link>
            </div>
            <EditableText
              as="div"
              mode="html"
              entity={{
                model: "subCategory",
                id: activeSubCategory.id,
                field: "descriptionHtml",
              }}
              value={defaultSubDescription}
              label={`Subcategory Description: ${activeSubCategory.name}`}
              className="text-xs sm:text-sm text-slate-600 leading-relaxed block"
            />
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200/80">
            <EditableText
              as="h2"
              entity={{
                model: "category",
                id: category.id,
                field: "name",
              }}
              value={category.name}
              label={`Category Title: ${category.name}`}
              className="text-base sm:text-lg font-bold text-slate-900 mb-1 block"
            />
            <EditableText
              as="div"
              mode="html"
              entity={{
                model: "category",
                id: category.id,
                field: "descriptionHtml",
              }}
              value={defaultCatDescription}
              label={`Category Description: ${category.name}`}
              className="text-xs sm:text-sm text-slate-600 leading-relaxed block"
            />
          </div>
        )}

        <ProductGridWithSearch
          products={products}
          phone={settings?.whatsappNumber || "+917337220568"}
          contextLabel={
            activeSubCategory ? activeSubCategory.name : category.name
          }
          itemLabel="products"
          clearHref={
            activeSubCategory ? `/shop/c/${category.slug}` : "/shop"
          }
          clearText={
            activeSubCategory
              ? `All ${category.name}`
              : "Browse All Products"
          }
          quickPills={quickPills}
          filterGroups={filterGroups}
        />
      </section>
    </main>
  );
}
