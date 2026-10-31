import type { Prisma } from "../generated/prisma/client";

/**
 * Lightweight projection for product listing / grid cards.
 * Avoids loading large rich-text HTML fields (`descriptionHtml`, `importantNoteHtml`)
 * and limits gallery images to the primary thumbnail per card, drastically reducing
 * Node.js heap allocation and RSC payload size on catalog pages.
 */
export const PRODUCT_CARD_SELECT = {
  id: true,
  name: true,
  slug: true,
  sku: true,
  description: true,
  basePrice: true,
  discountPrice: true,
  discountBadge: true,
  stockStatus: true,
  isPodium: true,
  images: {
    select: {
      url: true,
      isMain: true,
    },
    orderBy: [{ isMain: "desc" as const }, { createdAt: "asc" as const }],
    take: 1,
  },
  category: {
    select: {
      name: true,
      slug: true,
    },
  },
  podiumSubCategory: {
    select: {
      name: true,
      slug: true,
    },
  },
} satisfies Prisma.ProductSelect;
