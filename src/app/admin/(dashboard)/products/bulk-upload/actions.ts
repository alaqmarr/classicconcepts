"use server";

import { createCatalogItem } from "@/lib/product-mutations";

export async function saveDraftProduct(formData: FormData) {
  return createCatalogItem(formData, { isPodium: false });
}
