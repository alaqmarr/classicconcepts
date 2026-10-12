"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function bulkSetPodiumStatus(ids: string[], isPodium: boolean) {
  if (!ids || ids.length === 0) return { count: 0 };

  const result = await prisma.product.updateMany({
    where: { id: { in: ids } },
    data: { isPodium },
  });

  revalidatePath("/admin/products");
  revalidatePath("/admin/podiums");
  revalidatePath("/podiums");
  revalidatePath("/shop");

  return { count: result.count };
}

export async function bulkDeleteProducts(ids: string[]) {
  if (!ids || ids.length === 0) return { count: 0 };

  const result = await prisma.product.deleteMany({
    where: { id: { in: ids } },
  });

  revalidatePath("/admin/products");
  revalidatePath("/admin/podiums");
  revalidatePath("/podiums");
  revalidatePath("/shop");

  return { count: result.count };
}
