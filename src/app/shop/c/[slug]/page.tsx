import {
  getPublicSiteSettings,
  lookupCategoryOrConvertedSubBySlug,
} from "@/lib/public-data";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProductGridWithSearch } from "@/components/shop/ProductGridWithSearch";
import {
  getSiteContentMap,
  getContentValue,
  hasContentOverride,
} from "@/lib/site-content";
import { EditableText } from "@/components/inline-edit/EditableText";
import Link from "next/link";
import { Filter, Layers } from "lucide-react";
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
    typeof resolvedSearch.sub === "string" ? resolvedSearch.sub.trim() : undefined;

  const { category, convertedSub } = await lookupCategoryOrConvertedSubBySlug(slug);

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

  const displayName = activeSub ? `${activeSub.name} (${category.name})` : category.name;
  const title = `${displayName} | Buy Acrylic ${activeSub ? activeSub.name : category.name} | Classic Concepts`;
  const description =
    activeSub?.description ||
    category.description ||
    `Browse our collection of durable clear cast acrylic ${category.name.toLowerCase()} made by Classic Concepts Since 2008. Custom logo printing and pan-India safe delivery.`;
  const mainImage = activeSub?.imageUrl || category.imageUrl || "/short-logo.png";
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
    typeof resolvedSearch.sub === "string" ? resolvedSearch.sub.trim() : undefined;

  const [{ category, convertedSub, catalog }, settings, content] =
    await Promise.all([
      lookupCategoryOrConvertedSubBySlug(slug),
      getPublicSiteSettings(),
      getSiteContentMap(),
    ]);

  if (!category) {
    // Automatic Legacy Category -> SubCategory Redirect so zero live production URLs 404!
    if (convertedSub?.categorySlug) {
      redirect(`/shop/c/${convertedSub.categorySlug}?sub=${convertedSub.slug}`);
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

      <section className="py-12 container mx-auto px-6 relative z-20 flex flex-col md:flex-row gap-8">
        {/* Sidebar Filters */}
        <aside className="w-full md:w-64 flex-shrink-0 space-y-6">
          {visibleSubCategories.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4 text-sm">
                <Layers size={17} className="text-[#0056b3]" />
                <span>{category.name} Types</span>
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href={`/shop/c/${category.slug}`}
                    className={`${
                      !activeSubCategory
                        ? "text-[#0056b3] font-bold bg-blue-50/70"
                        : "text-slate-600 hover:text-[#0056b3] font-medium"
                    } px-3 py-2 rounded-xl text-sm flex items-center justify-between transition-colors`}
                  >
                    <span>All {category.name}</span>
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">
                      {category._count.products}
                    </span>
                  </Link>
                </li>
                {visibleSubCategories.map((sub) => {
                  const isActive = activeSubCategory?.id === sub.id;
                  return (
                    <li key={sub.id}>
                      <Link
                        href={`/shop/c/${category.slug}?sub=${sub.slug}`}
                        className={`${
                          isActive
                            ? "text-[#0056b3] font-bold bg-blue-50/70"
                            : "text-slate-600 hover:text-[#0056b3] font-medium"
                        } px-3 py-2 rounded-xl text-sm flex items-center justify-between transition-colors gap-2`}
                      >
                        <EditableText
                          entity={{
                            model: "subCategory",
                            id: sub.id,
                            field: "name",
                          }}
                          value={sub.name}
                          label={`Subcategory Name: ${sub.name}`}
                        />
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs shrink-0">
                          {Math.max(sub._count.products, sub._count.multiProducts)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Filter size={18} className="text-[#0056b3]" />
              <EditableText
                contentKey="shop.sidebar.categories_title"
                value={getContentValue(
                  content,
                  "shop.sidebar.categories_title",
                  "Categories"
                )}
                hasCustomValue={hasContentOverride(
                  content,
                  "shop.sidebar.categories_title"
                )}
                label="Sidebar Categories Heading"
              />
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/shop"
                  className="text-slate-600 hover:text-[#0056b3] font-medium text-sm flex items-center justify-between group transition-colors"
                >
                  <span>All Products</span>
                  <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-xs group-hover:bg-blue-50 group-hover:text-[#0056b3] transition-colors">
                    {totalProductsOverall}
                  </span>
                </Link>
              </li>
              {allCategories.map((cat) => {
                const isActive = cat.id === category.id;
                return (
                  <li key={cat.id}>
                    <Link
                      href={`/shop/c/${cat.slug}`}
                      className={`${
                        isActive
                          ? "text-[#0056b3] font-bold"
                          : "text-slate-600 hover:text-[#0056b3] font-medium"
                      } text-sm flex items-center justify-between transition-colors gap-2`}
                    >
                      <EditableText
                        entity={{
                          model: "category",
                          id: cat.id,
                          field: "name",
                        }}
                        value={cat.name}
                        label={`Category Name: ${cat.name}`}
                      />
                      <span
                        className={`${
                          isActive
                            ? "bg-blue-50 text-[#0056b3]"
                            : "bg-slate-100 text-slate-500"
                        } px-2 py-0.5 rounded-full text-xs shrink-0`}
                      >
                        {cat._count.products}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 space-y-6 min-w-0">
          {/* Subcategory Horizontal Filter Pills */}
          {visibleSubCategories.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/shop/c/${category.slug}`}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  !activeSubCategory
                    ? "bg-[#0056b3] text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:border-[#0056b3] hover:text-[#0056b3]"
                }`}
              >
                All {category.name} ({category._count.products})
              </Link>
              {visibleSubCategories.map((sub) => {
                const isActive = activeSubCategory?.id === sub.id;
                return (
                  <Link
                    key={sub.id}
                    href={`/shop/c/${category.slug}?sub=${sub.slug}`}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                      isActive
                        ? "bg-[#0056b3] text-white shadow-sm"
                        : "bg-white text-slate-600 border border-slate-200 hover:border-[#0056b3] hover:text-[#0056b3]"
                    }`}
                  >
                    {sub.name} ({sub._count.products})
                  </Link>
                );
              })}
            </div>
          )}

          {/* Category / Active Subcategory Description Card */}
          {activeSubCategory ? (
            <div className="bg-white rounded-2xl p-5 shadow-2xs border border-blue-200/80">
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
                  className="text-lg font-bold text-slate-900 block"
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
                className="text-sm text-slate-600 leading-relaxed block"
              />
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-5 shadow-2xs border border-slate-200/80">
              <EditableText
                as="h2"
                entity={{
                  model: "category",
                  id: category.id,
                  field: "name",
                }}
                value={category.name}
                label={`Category Title: ${category.name}`}
                className="text-lg font-bold text-slate-900 mb-1 block"
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
                className="text-sm text-slate-600 leading-relaxed block"
              />
            </div>
          )}

          <ProductGridWithSearch
            products={products}
            phone={settings?.whatsappNumber || "+917337222876"}
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
          />
        </div>
      </section>
    </main>
  );
}
