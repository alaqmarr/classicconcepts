import { prisma } from "@/lib/db";
import { invalidateCacheTags, rememberCached } from "@/lib/redis-cache";
import {
  getContentValue,
  hasContentOverride,
  type SiteContentMap,
} from "./site-content-shared";

export { getContentValue, hasContentOverride, type SiteContentMap };

const SITE_CONTENT_TTL_SECONDS = 3600; // 1 hour TTL + instant on-demand tag invalidation

/**
 * Invalidates the 100MB Redis / LRU `site-content` tag immediately so page reloads
 * after inline edits or imports reflect every text, HTML, and image change right away.
 */
export async function invalidateSiteContentCache(extraPaths?: string[]): Promise<void> {
  await invalidateCacheTags(["site-content"], { paths: extraPaths });
}

/**
 * Reads the complete inline-edited `SiteContent` map from the 100MB Redis cache.
 * Zero SQLite queries on warm client page loads; zero stale reads on admin edits
 * because `invalidateCacheTags(["site-content"])` bumps the tag version atomically.
 */
export async function getSiteContentMap(): Promise<SiteContentMap> {
  return rememberCached<SiteContentMap>(
    "site-content:all",
    ["site-content"],
    SITE_CONTENT_TTL_SECONDS,
    async () => {
      try {
        const rows = await prisma.siteContent.findMany({
          select: { key: true, value: true },
        });
        const map: SiteContentMap = {};
        for (const row of rows) {
          map[row.key] = row.value;
        }
        return map;
      } catch (err) {
        console.error("Failed to read SiteContent from DB:", err);
        return {};
      }
    }
  );
}
