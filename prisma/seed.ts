import { prisma } from '../src/lib/db';

async function main() {
  // Site Settings
  await prisma.siteSetting.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      address: 'M/s. Classic Concepts Acrylic Private Limited,\\n1-6-44/2, Muthiyam Reddy Estate,\\nYadamma Nagarm Alwal,\\nSecunderabad - 500 015,\\nTelangana, India.',
      phone1: '+91 7901 650 662',
      phone2: '+91 7901 650 663',
      email: 'info@classicconcepts.in',
      upiId: 'classicconcepts@upi',
      upiName: 'Classic Concepts',
    },
  });

  // Clients
  const clientNames = ["AVASA", "GMR", "facebook", "Google", "GreenPark", "ICICI Bank", "INDIAN"];
  for (const name of clientNames) {
    const exists = await prisma.client.findFirst({ where: { name } });
    if (!exists) {
      await prisma.client.create({
        data: { name, logoUrl: `https://via.placeholder.com/150x80?text=${name}` }
      });
    }
  }

  // Platforms
  const platforms = [
    { name: 'Amazon', storeUrl: '#', storeRegion: 'US Store', iconName: 'FaAmazon', colorClass: 'text-black' },
    { name: 'Amazon', storeUrl: '#', storeRegion: 'IN Store', iconName: 'FaAmazon', colorClass: 'text-black' },
    { name: 'Walmart', storeUrl: '#', storeRegion: 'US Store', iconName: 'SiWalmart', colorClass: 'text-[#0071ce]' },
    { name: 'Flipkart', storeUrl: '#', storeRegion: 'IN Store', iconName: 'SiFlipkart', colorClass: 'text-[#2874f0]' },
  ];

  for (const p of platforms) {
    const exists = await prisma.onlinePlatform.findFirst({ where: { storeRegion: p.storeRegion, name: p.name } });
    if (!exists) {
      await prisma.onlinePlatform.create({ data: p });
    }
  }

  // Categories
  const categories = [
    { name: 'Acrylic Podiums', slug: 'acrylic-podiums' },
    { name: 'Acrylic Furniture', slug: 'acrylic-furniture' },
    { name: 'Acrylic Interiors', slug: 'acrylic-interiors' },
    { name: 'Display Units', slug: 'display-units' },
    { name: 'Acrylic Lighting', slug: 'acrylic-lighting' },
    { name: 'Brochure Holder', slug: 'brochure-holder' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
