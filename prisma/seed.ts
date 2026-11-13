import { prisma } from "../src/lib/db";

/**
 * Safe One-Time Database Seed
 * - Never overwrites existing SiteSetting values (`update: {}`).
 * - Never touches `SiteContent` (inline-edited page texts & image overrides).
 * - Only inserts starter Categories / Clients / Online Platforms on a brand-new empty database
 *   so running `prisma db seed` on production NEVER re-adds merged categories or placeholder logos.
 */
async function main() {
  await prisma.siteSetting.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      address:
        "M/s. Classic Concepts Acrylic Private Limited,\n1-6-44/2, Muthiyam Reddy Estate,\nYadamma Nagar, Alwal,\nSecunderabad - 500 015,\nTelangana, India.",
      phone1: "+917337222876",
      whatsappNumber: "+917337222876",
      email: "sales@classicconcepts.in",
      upiId: "classicconcepts@upi",
      upiName: "Classic Concepts",
      aiModel: "claude-haiku-5-5",
      aiEnabled: true,
      aiPopupEnabled: true,
      aiPopupDelaySeconds: 3,
    },
  });

  const [existingProductCount, existingCategoryCount] = await Promise.all([
    prisma.product.count(),
    prisma.category.count(),
  ]);

  if (existingProductCount > 0 || existingCategoryCount > 0) {
    console.log(
      `Database already contains ${existingCategoryCount} categories and ${existingProductCount} products. Skipping starter seed to preserve live data.`
    );
    return;
  }

  const platforms = [
    {
      name: "Amazon",
      storeUrl: "#",
      storeRegion: "US Store",
      iconName: "FaAmazon",
      colorClass: "text-black",
    },
    {
      name: "Amazon",
      storeUrl: "#",
      storeRegion: "IN Store",
      iconName: "FaAmazon",
      colorClass: "text-black",
    },
    {
      name: "Walmart",
      storeUrl: "#",
      storeRegion: "US Store",
      iconName: "SiWalmart",
      colorClass: "text-[#0071ce]",
    },
    {
      name: "Flipkart",
      storeUrl: "#",
      storeRegion: "IN Store",
      iconName: "SiFlipkart",
      colorClass: "text-[#2874f0]",
    },
  ];

  const existingPlatformCount = await prisma.onlinePlatform.count();
  if (existingPlatformCount === 0) {
    for (const p of platforms) {
      await prisma.onlinePlatform.create({ data: p });
    }
  }

  const starterCategories = [
    { name: "Acrylic Podiums", slug: "acrylic-podiums", sortOrder: 1 },
    { name: "Display Stands & Holders", slug: "display-units", sortOrder: 2 },
    { name: "Acrylic Furniture", slug: "acrylic-furniture", sortOrder: 3 },
  ];

  for (const cat of starterCategories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }

  console.log("Initial empty-database bootstrap complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
