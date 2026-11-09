"use server";

import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";
import { revalidateCatalogPaths } from "@/lib/product-mutations";

export async function bulkSetPodiumStatus(ids: string[], isPodium: boolean) {
  await requireAdminSession();
  if (!ids || ids.length === 0) return { count: 0 };

  const result = await prisma.product.updateMany({
    where: { id: { in: ids } },
    data: { isPodium },
  });

  revalidateCatalogPaths();
  return { count: result.count };
}

export async function bulkSetPodiumSubCategory(
  ids: string[],
  podiumSubCategoryId: string | null
) {
  await requireAdminSession();
  if (!ids || ids.length === 0) return { count: 0 };

  const result = await prisma.product.updateMany({
    where: { id: { in: ids } },
    data: { podiumSubCategoryId: podiumSubCategoryId || null },
  });

  revalidateCatalogPaths();
  return { count: result.count };
}

export async function bulkDeleteProducts(ids: string[]) {
  await requireAdminSession();
  if (!ids || ids.length === 0) return { count: 0 };

  const result = await prisma.product.deleteMany({
    where: { id: { in: ids } },
  });

  revalidateCatalogPaths();
  return { count: result.count };
}
