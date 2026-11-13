export type SiteContentMap = Record<string, string>;

export function getContentValue(
  map: SiteContentMap | undefined | null,
  key: string,
  fallback: string
): string {
  if (!map) return fallback;
  const val = map[key];
  return val !== undefined && val !== null && val !== "" ? val : fallback;
}

export function hasContentOverride(
  map: SiteContentMap | undefined | null,
  key: string
): boolean {
  if (!map) return false;
  const val = map[key];
  return val !== undefined && val !== null && val !== "";
}
