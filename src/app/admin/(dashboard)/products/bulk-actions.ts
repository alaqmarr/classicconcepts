"use server";

import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";
import { revalidateCatalogPaths } from "@/lib/product-mutations";
import { invalidateCacheTags } from "@/lib/redis-cache";

export async function bulkSetPodiumStatus(ids: string[], isPodium: boolean) {
  await requireAdminSession();
  if (!ids || ids.length === 0) return { count: 0 };

  const result = await prisma.product.updateMany({
    where: { id: { in: ids } },
    data: { isPodium },
  });

  await invalidateCacheTags(["catalog", "taxonomy", "ai-snapshot", "ai-responses"]);
  revalidateCatalogPaths();
  return { count: result.count };
}

export async function bulkSetPodiumSubCategory(
  ids: string[],
  podiumSubCategoryId: string | null,
  additionalIds?: string[]
) {
  await requireAdminSession();
  if (!ids || ids.length === 0) return { count: 0 };

  const allSubIds = Array.from(
    new Set(
      [podiumSubCategoryId, ...(additionalIds || [])].filter(
        (x): x is string => Boolean(x)
      )
    )
  );
  const primaryId = allSubIds[0] || null;

  await prisma.$transaction(
    ids.map((id) =>
      prisma.product.update({
        where: { id },
        data: {
          podiumSubCategoryId: primaryId,
          podiumSubCategories: {
            set: allSubIds.map((subId) => ({ id: subId })),
          },
        },
      })
    )
  );

  await invalidateCacheTags(["catalog", "taxonomy", "ai-snapshot", "ai-responses"]);
  revalidateCatalogPaths();
  return { count: ids.length };
}

export async function bulkDeleteProducts(ids: string[]) {
  await requireAdminSession();
  if (!ids || ids.length === 0) return { count: 0 };

  const result = await prisma.product.deleteMany({
    where: { id: { in: ids } },
  });

  await invalidateCacheTags(["catalog", "taxonomy", "ai-snapshot", "ai-responses"]);
  revalidateCatalogPaths();
  return { count: result.count };
}
