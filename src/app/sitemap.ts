import { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://classicconcepts.in';

  // Fetch dynamic routes
  const [products, categories, industries, problems] = await Promise.all([
    prisma.product.findMany({ select: { slug: true, updatedAt: true } }),
    prisma.category.findMany({ select: { slug: true, updatedAt: true } }),
    prisma.industry.findMany({ select: { slug: true, updatedAt: true } }),
    prisma.problemStatement.findMany({ select: { slug: true, updatedAt: true } })
  ]);

  const productUrls = products.map((product) => ({
    url: `${baseUrl}/shop/p/${product.slug}`,
    lastModified: product.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const categoryUrls = categories.map((category) => ({
    url: `${baseUrl}/shop/c/${category.slug}`,
    lastModified: category.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }));

  const industryUrls = industries.map((industry) => ({
    url: `${baseUrl}/shop/industry/${industry.slug}`,
    lastModified: industry.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const problemUrls = problems.map((problem) => ({
    url: `${baseUrl}/shop/problem/${problem.slug}`,
    lastModified: problem.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Static routes
  const staticRoutes = [
    '',
    '/about',
    '/about/infrastructure',
    '/about/press',
    '/about/clients',
    '/about/certificates',
    '/shop',
    '/podiums',
    '/resources',
    '/contact',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1.0 : 0.8,
  }));

  return [...staticRoutes, ...categoryUrls, ...productUrls, ...industryUrls, ...problemUrls];
}
