export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  Package,
  Award,
  FolderTree,
  Mail,
  ShoppingBag,
  Eye,
  Sparkles,
  Plus,
  Database,
  Pencil,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  Clock,
  Lightbulb,
  Building2,
  ShieldCheck,
  FileText,
  Globe,
  Cog,
  Images,
  Users,
  Newspaper,
  MapPin,
  TrendingUp,
} from "lucide-react";
import { getCacheHealthStats } from "@/lib/redis-cache";
import "@/lib/public-data";
import { RedisCacheStatusCard } from "@/components/admin/RedisCacheStatusCard";

export default async function AdminDashboardPage() {
  const [
    totalCatalogItems,
    regularProducts,
    podiumProducts,
    inStockCount,
    productsMissingImages,
    productsMissingUseCases,
    productsMissingFeatures,
    categories,
    subCategoriesCount,
    podiumSubCategoriesCount,
    useCasesCount,
    industriesCount,
    enquiries,
    newEnquiriesCount,
    repliedEnquiriesCount,
    orders,
    pendingOrdersCount,
    topOrderedItemsRaw,
    pageVisits,
    aiCacheStats,
    settings,
    siteContentCount,
    certificatesCount,
    resourcesCount,
    clientsCount,
    platformsCount,
    machineryCount,
    galleryCount,
    teamCount,
    pressCount,
    locationsCount,
    cacheHealthStats,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { isPodium: false } }),
    prisma.product.count({ where: { isPodium: true } }),
    prisma.product.count({ where: { stockStatus: "In stock" } }),
    prisma.product.count({ where: { images: { none: {} } } }),
    prisma.product.count({ where: { problemStatements: { none: {} } } }),
    prisma.product.count({ where: { features: { none: {} } } }),
    prisma.category.findMany({
      include: {
        _count: { select: { products: true, subCategories: true } },
      },
      orderBy: { products: { _count: "desc" } },
    }),
    prisma.subCategory.count(),
    prisma.podiumSubCategory.count(),
    prisma.problemStatement.count(),
    prisma.industry.count(),
    prisma.enquiry.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.enquiry.count({ where: { status: "New" } }),
    prisma.enquiry.count({ where: { status: { in: ["Replied", "Closed"] } } }),
    prisma.cartOrder.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { items: true },
    }),
    prisma.cartOrder.count({
      where: { status: { in: ["Pending", "Processing"] } },
    }),
    prisma.cartOrderItem.groupBy({
      by: ["productName", "productSlug"],
      _sum: { quantity: true },
      _count: { id: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    prisma.pageVisit.findMany({
      orderBy: { visits: "desc" },
    }),
    prisma.aiResponseCache.aggregate({
      _count: { cacheKey: true },
      _sum: { hits: true },
    }),
    prisma.siteSetting.findUnique({ where: { id: "default" } }),
    prisma.siteContent.count(),
    prisma.certificate.count(),
    prisma.resource.count(),
    prisma.client.count(),
    prisma.onlinePlatform.count(),
    prisma.machinery.count(),
    prisma.galleryImage.count(),
    prisma.teamMember.count(),
    prisma.pressArticle.count(),
    prisma.infrastructureLocation.count(),
    getCacheHealthStats(),
  ]);

  const totalEnquiries = await prisma.enquiry.count();
  const totalOrders = await prisma.cartOrder.count();
  const orderTotalsAgg = await prisma.cartOrder.aggregate({
    _sum: { total: true },
  });
  const totalOrderValue = orderTotalsAgg._sum.total || 0;

  const liveCategoriesCount = categories.filter(
    (c) => c._count.products > 0
  ).length;
  const emptyCategoriesCount = categories.length - liveCategoriesCount;
  const categoriesMissingDescriptions = categories.filter(
    (c) =>
      c._count.products > 0 &&
      !c.description?.trim() &&
      !c.descriptionHtml?.trim()
  ).length;

  const totalPageViews = pageVisits.reduce((sum, v) => sum + v.visits, 0);
  const topPages = pageVisits.slice(0, 7);

  const aiCacheCount = aiCacheStats._count.cacheKey || 0;
  const aiTotalHits = aiCacheStats._sum.hits || 0;
  const hasClientAiKey = Boolean(
    settings?.anthropicClientApiKey?.trim() ||
      settings?.anthropicApiKey?.trim() ||
      process.env.ANTHROPIC_CLIENT_API_KEY ||
      process.env.ANTHROPIC_API_KEY
  );
  const hasAdminAiKey = Boolean(
    settings?.anthropicAdminApiKey?.trim() ||
      settings?.anthropicApiKey?.trim() ||
      process.env.ANTHROPIC_ADMIN_API_KEY ||
      process.env.ANTHROPIC_API_KEY
  );

  // Compute Weighted Catalog Health Score (0 - 100)
  const photoRatio =
    totalCatalogItems > 0
      ? (totalCatalogItems - productsMissingImages) / totalCatalogItems
      : 1;
  const featureRatio =
    totalCatalogItems > 0
      ? (totalCatalogItems - productsMissingFeatures) / totalCatalogItems
      : 1;
  const useCaseRatio =
    totalCatalogItems > 0
      ? (totalCatalogItems - productsMissingUseCases) / totalCatalogItems
      : 1;
  const catDescRatio =
    liveCategoriesCount > 0
      ? (liveCategoriesCount - categoriesMissingDescriptions) /
        liveCategoriesCount
      : 1;

  const catalogHealthScore = Math.round(
    photoRatio * 35 + featureRatio * 25 + useCaseRatio * 20 + catDescRatio * 20
  );

  const enquiryReplyRate =
    totalEnquiries > 0
      ? Math.round((repliedEnquiriesCount / totalEnquiries) * 100)
      : 100;

  const topCategories = categories.slice(0, 8);
  const maxCategoryProducts = Math.max(
    1,
    ...topCategories.map((c) => c._count.products)
  );

  const healthChecks = [
    {
      label: "Unread Customer Enquiries",
      count: newEnquiriesCount,
      goodText: "Inbox caught up",
      warnText: `${newEnquiriesCount} waiting for reply`,
      href: "/admin/enquiries",
      cta: "Reply Now",
    },
    {
      label: "Products Missing Photos",
      count: productsMissingImages,
      goodText: "Every product has photos",
      warnText: `${productsMissingImages} items need photos`,
      href: "/admin/products",
      cta: "Review Products",
    },
    {
      label: "Products Without Use Cases",
      count: productsMissingUseCases,
      goodText: "All products tagged with use cases",
      warnText: `${productsMissingUseCases} items missing use cases`,
      href: "/admin/products",
      cta: "Tag Multi Use Cases",
    },
    {
      label: "Products Without Feature Bullets",
      count: productsMissingFeatures,
      goodText: "All products have feature bullets",
      warnText: `${productsMissingFeatures} items have 0 feature bullets`,
      href: "/admin/products",
      cta: "Draft & Approve Bullets",
    },
    {
      label: "Live Categories Without Descriptions",
      count: categoriesMissingDescriptions,
      goodText: "All live categories described",
      warnText: `${categoriesMissingDescriptions} live categories need summary`,
      href: "/admin/categories",
      cta: "Preview & Fill",
    },
    {
      label: "Empty Categories (Hidden on Site)",
      count: emptyCategoriesCount,
      goodText: "Zero empty categories",
      warnText: `${emptyCategoriesCount} empty categories hidden`,
      href: "/admin/categories",
      cta: "Clean Up / Merge",
    },
  ];

  const brandAssetTiles = [
    {
      label: "Certificates & IP Docs",
      value: certificatesCount,
      href: "/admin/certificates",
      icon: ShieldCheck,
    },
    {
      label: "Brochures & Resources",
      value: resourcesCount,
      href: "/admin/resources",
      icon: FileText,
    },
    {
      label: "Clients & Stores",
      value: `${clientsCount} + ${platformsCount}`,
      href: "/admin/clients",
      icon: Globe,
    },
    {
      label: "Factory Machinery",
      value: machineryCount,
      href: "/admin/machinery",
      icon: Cog,
    },
    {
      label: "Gallery Photos",
      value: galleryCount,
      href: "/admin/gallery",
      icon: Images,
    },
    {
      label: "Leadership & Team",
      value: teamCount,
      href: "/admin/team",
      icon: Users,
    },
    {
      label: "Press & Newsroom",
      value: pressCount,
      href: "/admin/press",
      icon: Newspaper,
    },
    {
      label: "Locations",
      value: locationsCount,
      href: "/admin/locations",
      icon: MapPin,
    },
  ];

  return (
    <div className="space-y-7 max-w-7xl mx-auto">
      {/* 1. Executive Command Header */}
      <section className="rounded-3xl bg-gradient-to-br from-[#0b1426] via-[#0f2347] to-[#0056b3] text-white p-6 sm:p-8 shadow-lg border border-slate-800/60">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/12 text-amber-300 text-xs font-extrabold border border-white/15">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Classic Concepts Operations &amp; Insights</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 text-xs font-bold border border-emerald-400/25">
                <span>{siteContentCount} Saved Live Text &amp; Image Overrides</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Factory &amp; Website Command Center
            </h1>
            <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
              Monitor live customer enquiries, quote requests, catalog health across {totalCatalogItems} items, category organization, and ACRIO smart search performance in one place.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/admin/products/new"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </Link>
            <Link
              href="/admin/podiums/new"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-bold transition-colors"
            >
              <Plus className="w-4 h-4 text-amber-300" />
              <span>Add Podium</span>
            </Link>
            <Link
              href="/admin/categories"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-bold transition-colors"
            >
              <FolderTree className="w-4 h-4 text-sky-300" />
              <span>Organize Categories</span>
            </Link>
            <Link
              href="/admin/import-export"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-bold transition-colors"
            >
              <Database className="w-4 h-4 text-emerald-300" />
              <span>Import / Export</span>
            </Link>
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-950/70 hover:bg-slate-950 border border-white/20 text-white text-xs font-bold transition-colors"
            >
              <Pencil className="w-3.5 h-3.5 text-emerald-300" />
              <span>Live Editor</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </Link>
          </div>
        </div>
      </section>

      {/* 2. 6 Live Executive KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
        {/* Card 1: Enquiries */}
        <Link
          href="/admin/enquiries"
          className="group bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-[#0056b3] group-hover:bg-[#0056b3] group-hover:text-white transition-colors">
              <Mail className="w-5 h-5" />
            </div>
            {newEnquiriesCount > 0 ? (
              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-extrabold">
                {newEnquiriesCount} New Unread
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                All Handled
              </span>
            )}
          </div>
          <div className="mt-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Customer Enquiries
            </div>
            <div className="flex items-baseline gap-2.5 mt-1">
              <span className="text-3xl font-extrabold text-slate-900">
                {totalEnquiries}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {enquiryReplyRate}% replied ({repliedEnquiriesCount} resolved)
              </span>
            </div>
          </div>
        </Link>

        {/* Card 2: Cart Quote Orders */}
        <Link
          href="/admin/orders"
          className="group bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <ShoppingBag className="w-5 h-5" />
            </div>
            {pendingOrdersCount > 0 ? (
              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-extrabold">
                {pendingOrdersCount} Open Requests
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                0 Pending
              </span>
            )}
          </div>
          <div className="mt-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Cart Orders &amp; Quote Lists
            </div>
            <div className="flex items-baseline gap-2.5 mt-1">
              <span className="text-3xl font-extrabold text-slate-900">
                {totalOrders}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {totalOrderValue > 0
                  ? `₹${totalOrderValue.toLocaleString("en-IN")} listed value`
                  : "Direct WhatsApp & Cart quotes"}
              </span>
            </div>
          </div>
        </Link>

        {/* Card 3: Catalog Inventory */}
        <Link
          href="/admin/products"
          className="group bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Package className="w-5 h-5" />
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
              {inStockCount} In Stock
            </span>
          </div>
          <div className="mt-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Catalog Inventory
            </div>
            <div className="flex items-baseline gap-2.5 mt-1">
              <span className="text-3xl font-extrabold text-slate-900">
                {totalCatalogItems}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {regularProducts} Products • {podiumProducts} Patented Podiums
              </span>
            </div>
          </div>
        </Link>

        {/* Card 4: Taxonomy & Multi-Select Use Cases */}
        <Link
          href="/admin/categories"
          className="group bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="p-2.5 rounded-xl bg-sky-50 text-sky-700 group-hover:bg-sky-600 group-hover:text-white transition-colors">
              <FolderTree className="w-5 h-5" />
            </div>
            <span className="px-2.5 py-1 rounded-full bg-sky-50 text-sky-800 border border-sky-200 text-xs font-bold">
              {subCategoriesCount + podiumSubCategoriesCount} Subcategories
            </span>
          </div>
          <div className="mt-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Taxonomy &amp; Use Cases
            </div>
            <div className="flex items-baseline gap-2.5 mt-1">
              <span className="text-3xl font-extrabold text-slate-900">
                {liveCategoriesCount}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Live Categories • {useCasesCount} Use Cases • {industriesCount} Industries
              </span>
            </div>
          </div>
        </Link>

        {/* Card 5: Traffic & Page Views */}
        <Link
          href="/admin/analytics"
          className="group bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="p-2.5 rounded-xl bg-violet-50 text-violet-700 group-hover:bg-violet-600 group-hover:text-white transition-colors">
              <Eye className="w-5 h-5" />
            </div>
            <span className="px-2.5 py-1 rounded-full bg-violet-50 text-violet-800 border border-violet-200 text-xs font-bold">
              {pageVisits.length} Pages Tracked
            </span>
          </div>
          <div className="mt-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Website Views
            </div>
            <div className="flex items-baseline gap-2.5 mt-1">
              <span className="text-3xl font-extrabold text-slate-900">
                {totalPageViews.toLocaleString("en-IN")}
              </span>
              <span className="text-xs font-semibold text-slate-500 truncate">
                Top: {pageVisits[0]?.path || "/"}
              </span>
            </div>
          </div>
        </Link>

        {/* Card 6: ACRIO Smart Assistant */}
        <Link
          href="/admin/settings#ai-settings"
          className="group bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${
                  hasClientAiKey
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-500 border-slate-200"
                }`}
              >
                Client Key {hasClientAiKey ? "Ready" : "Fallback"}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${
                  hasAdminAiKey
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-500 border-slate-200"
                }`}
              >
                Admin Key {hasAdminAiKey ? "Ready" : "Fallback"}
              </span>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              ACRIO Smart Cache (Claude Haiku 5.5)
            </div>
            <div className="flex items-baseline gap-2.5 mt-1">
              <span className="text-3xl font-extrabold text-slate-900">
                {aiTotalHits.toLocaleString("en-IN")}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                instant responses from {aiCacheCount} cached queries
              </span>
            </div>
          </div>
        </Link>
      </section>

      {/* 2B. Live 100MB In-Memory Redis Cache Control Panel */}
      <RedisCacheStatusCard initialStats={cacheHealthStats} />

      {/* 3. Actionable Catalog & Content Health Checklist */}
      <section className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              Catalog &amp; Operations Health Check
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live audit of photos, multi-select use cases, plain-English descriptions, and unread customer leads.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-200/80 shrink-0">
            <div>
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                Catalog Readiness
              </div>
              <div className="text-lg font-extrabold text-slate-900">
                {catalogHealthScore}% Complete
              </div>
            </div>
            <div className="w-24 h-2.5 rounded-full bg-slate-200 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  catalogHealthScore >= 80
                    ? "bg-emerald-500"
                    : catalogHealthScore >= 50
                    ? "bg-amber-500"
                    : "bg-blue-600"
                }`}
                style={{ width: `${Math.min(100, Math.max(6, catalogHealthScore))}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {healthChecks.map((item) => {
            const isHealthy = item.count === 0;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                  isHealthy
                    ? "bg-emerald-50/40 border-emerald-200/80 hover:bg-emerald-50"
                    : "bg-amber-50/45 border-amber-200/90 hover:bg-amber-50"
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  {isHealthy ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-slate-900">
                      {item.label}
                    </div>
                    <div
                      className={`text-xs mt-0.5 font-medium ${
                        isHealthy ? "text-emerald-700" : "text-amber-800"
                      }`}
                    >
                      {isHealthy ? item.goodText : item.warnText}
                    </div>
                  </div>
                </div>
                {!isHealthy && (
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-extrabold text-[#0056b3] shrink-0 mt-0.5">
                    <span>{item.cta}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      {/* 4. Live Customer Enquiries & Cart Orders Pipeline */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Recent Customer Enquiries (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#0056b3]" />
              <h2 className="text-base font-extrabold text-slate-900">
                Recent Customer Enquiries
              </h2>
            </div>
            <Link
              href="/admin/enquiries"
              className="text-xs font-bold text-[#0056b3] hover:underline inline-flex items-center gap-1"
            >
              <span>View All ({totalEnquiries})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {enquiries.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-sm">
              No customer enquiries received yet. Messages submitted from Contact and Product pages appear here immediately.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {enquiries.map((enq) => (
                <Link
                  key={enq.id}
                  href={`/admin/enquiries/${enq.id}`}
                  className="px-6 py-4 hover:bg-slate-50/90 transition-colors flex items-start justify-between gap-4 block"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900">
                        {enq.name}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                          enq.status === "New"
                            ? "bg-blue-100 text-blue-800"
                            : enq.status === "Replied"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {enq.status}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10.5px] font-semibold">
                        {enq.source}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2">
                      {enq.message}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                      <span>{enq.phone}</span>
                      <span>•</span>
                      <span>{enq.email}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0 space-y-1.5">
                    <div className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>
                        {new Date(enq.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-[#0056b3]">
                      Open &amp; Reply →
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right: Recent Quote Cart Orders + Most Requested Products (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                <h2 className="text-base font-extrabold text-slate-900">
                  Recent Cart Requests
                </h2>
              </div>
              <Link
                href="/admin/orders"
                className="text-xs font-bold text-[#0056b3] hover:underline inline-flex items-center gap-1"
              >
                <span>All Orders ({totalOrders})</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {orders.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs sm:text-sm">
                No cart checkout requests yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {orders.map((ord) => {
                  const qty = ord.items.reduce((s, it) => s + it.quantity, 0);
                  return (
                    <Link
                      key={ord.id}
                      href={`/admin/orders/${ord.id}`}
                      className="px-6 py-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 block"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 truncate">
                            {ord.name}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10.5px] font-bold">
                            {qty} items
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                          {[ord.city, ord.state].filter(Boolean).join(", ") ||
                            ord.phone}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-extrabold text-slate-900">
                          {ord.total
                            ? `₹${ord.total.toLocaleString("en-IN")}`
                            : "Quote"}
                        </div>
                        <span
                          className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                            ord.status === "Pending"
                              ? "bg-amber-100 text-amber-800"
                              : ord.status === "Completed"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {ord.status}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Most Requested Products in Cart Orders */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  Most Requested Products
                </h3>
              </div>
              <Link
                href="/admin/products"
                className="text-[11px] font-bold text-[#0056b3] hover:underline"
              >
                Catalog →
              </Link>
            </div>

            {topOrderedItemsRaw.length === 0 ? (
              <p className="text-xs text-slate-500 py-3">
                Top ordered products will rank here automatically as customers submit quote carts.
              </p>
            ) : (
              <div className="space-y-2">
                {topOrderedItemsRaw.map((item, idx) => (
                  <div
                    key={`${item.productSlug}-${idx}`}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                  >
                    <Link
                      href={`/shop/p/${item.productSlug}`}
                      target="_blank"
                      className="text-xs font-bold text-slate-800 hover:text-[#0056b3] truncate"
                    >
                      {idx + 1}. {item.productName}
                    </Link>
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#0056b3] text-[11px] font-extrabold shrink-0">
                      {item._sum.quantity || 0} units ({item._count.id} orders)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 5. Category Inventory Distribution & Top Visited Website Pages */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Categories Breakdown */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Products by Main Category
              </h2>
              <p className="text-xs text-slate-500">
                {liveCategoriesCount} active categories, {subCategoriesCount} subcategories
              </p>
            </div>
            <Link
              href="/admin/categories"
              className="text-xs font-bold text-[#0056b3] hover:underline inline-flex items-center gap-1"
            >
              <span>Manage Taxonomy</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {topCategories.map((cat) => {
              const pct = Math.round(
                (cat._count.products / maxCategoryProducts) * 100
              );
              return (
                <div key={cat.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <Link
                      href={`/admin/categories/${cat.id}`}
                      className="font-bold text-slate-800 hover:text-[#0056b3] truncate"
                    >
                      {cat.name}
                      {cat._count.subCategories > 0 && (
                        <span className="ml-1.5 text-[11px] font-medium text-slate-400">
                          ({cat._count.subCategories} subs)
                        </span>
                      )}
                    </Link>
                    <span className="font-extrabold text-slate-700 shrink-0">
                      {cat._count.products} items
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#0056b3] to-sky-400"
                      style={{ width: `${Math.max(pct, cat._count.products > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2">
            <Link
              href="/admin/problem-statements"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-[#0056b3] border border-slate-200 text-xs font-bold transition-colors"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              <span>Manage {useCasesCount} Use Cases</span>
            </Link>
            <Link
              href="/admin/industries"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-[#0056b3] border border-slate-200 text-xs font-bold transition-colors"
            >
              <Building2 className="w-3.5 h-3.5 text-sky-600" />
              <span>Manage {industriesCount} Industries</span>
            </Link>
          </div>
        </div>

        {/* Top Visited Website Pages */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-violet-600" />
                <span>Most Visited Website Pages</span>
              </h2>
              <p className="text-xs text-slate-500">
                {totalPageViews.toLocaleString("en-IN")} total recorded session visits
              </p>
            </div>
            <Link
              href="/admin/analytics"
              className="text-xs font-bold text-[#0056b3] hover:underline inline-flex items-center gap-1"
            >
              <span>Full Analytics</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {topPages.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">
              Visitor page views will appear here automatically as customers browse the website.
            </p>
          ) : (
            <div className="space-y-3">
              {topPages.map((visit, index) => {
                const share =
                  totalPageViews > 0
                    ? ((visit.visits / totalPageViews) * 100).toFixed(1)
                    : "0.0";
                return (
                  <div key={visit.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs gap-2">
                      <a
                        href={visit.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono font-semibold text-slate-700 hover:text-[#0056b3] truncate"
                      >
                        #{index + 1} {visit.path}
                      </a>
                      <span className="font-extrabold text-slate-800 shrink-0">
                        {visit.visits.toLocaleString("en-IN")}{" "}
                        <span className="text-slate-400 font-medium">
                          ({share}%)
                        </span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-400"
                        style={{
                          width: `${Math.max(4, Number(share))}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 6. Brand, Trust & Factory Content Footprint */}
      <section className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              Brand, Trust &amp; Factory Assets
            </h2>
            <p className="text-xs text-slate-500">
              Jump directly to any public trust section to add documents, client logos, machinery, or newsroom updates.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {brandAssetTiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <Link
                key={tile.label}
                href={tile.href}
                className="p-3.5 rounded-2xl bg-slate-50/80 hover:bg-blue-50 border border-slate-200/80 hover:border-blue-200 transition-all flex flex-col justify-between gap-2 group"
              >
                <Icon className="w-4 h-4 text-slate-500 group-hover:text-[#0056b3]" />
                <div>
                  <div className="text-lg font-extrabold text-slate-900">
                    {tile.value}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-500 leading-snug">
                    {tile.label}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
