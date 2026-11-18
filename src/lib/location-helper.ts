export interface VerifiedLocationDetails {
  placeName: string;
  address: string;
  mapsUrl: string;
  latitude: number | null;
  longitude: number | null;
}

const DEFAULT_FACTORY_ADDRESS =
  "1-6-44/2 Muthyam Reddy Estate, Yadamma Nagar, Kanajiguda, Alwal, Secunderabad, Telangana 500015";
const DEFAULT_PLACE_NAME = "Classic Concepts Acrylic Private Limited";
const DEFAULT_LATITUDE = 17.4947378;
const DEFAULT_LONGITUDE = 78.496725;
const DEFAULT_MAPS_URL = `https://maps.google.com/?q=${DEFAULT_LATITUDE},${DEFAULT_LONGITUDE}`;

export function isTrustedGoogleMapsUrl(rawUrl: string | null | undefined): boolean {
  const clean = String(rawUrl || "").trim();
  if (!/^https:\/\//i.test(clean)) return false;
  return (
    clean.startsWith("https://maps.google.com/") ||
    clean.startsWith("https://www.google.com/maps") ||
    clean.startsWith("https://maps.app.goo.gl/") ||
    clean.startsWith("https://goo.gl/maps/")
  );
}

/**
 * Extracts a direct clickable Google Maps link and coordinates from saved branch mapUrl
 * or an embedded Google Maps iframe/URL stored in SiteSetting.
 */
export function resolveVerifiedGoogleMapsData(params: {
  address?: string | null;
  mapEmbedUrl?: string | null;
  explicitMapUrl?: string | null;
}): VerifiedLocationDetails {
  const cleanAddress =
    String(params.address || DEFAULT_FACTORY_ADDRESS)
      .replace(/\\n|\r?\n/g, ", ")
      .replace(/\s{2,}/g, " ")
      .trim() || DEFAULT_FACTORY_ADDRESS;

  const rawEmbed = String(params.mapEmbedUrl || "").trim();
  const srcMatch = rawEmbed.match(/src=["']([^"']+)["']/i);
  const embedSrc = srcMatch?.[1] || rawEmbed;

  const latMatch = embedSrc.match(/!3d(-?\d+(?:\.\d+)?)/);
  const lngMatch = embedSrc.match(/!2d(-?\d+(?:\.\d+)?)/);
  const placeMatch = embedSrc.match(/!2s([^!&]+)/);

  const parsedLat = latMatch ? Number(latMatch[1]) : NaN;
  const parsedLng = lngMatch ? Number(lngMatch[1]) : NaN;
  const hasCoords = Number.isFinite(parsedLat) && Number.isFinite(parsedLng);

  const latitude = hasCoords ? parsedLat : DEFAULT_LATITUDE;
  const longitude = hasCoords ? parsedLng : DEFAULT_LONGITUDE;

  let placeName = DEFAULT_PLACE_NAME;
  if (placeMatch?.[1]) {
    try {
      const decoded = decodeURIComponent(placeMatch[1].replace(/\+/g, " ")).trim();
      if (decoded) placeName = decoded;
    } catch {
      // Keep verified default place name
    }
  }

  const explicit = String(params.explicitMapUrl || "").trim();
  const mapsUrl = isTrustedGoogleMapsUrl(explicit)
    ? explicit
    : hasCoords
    ? `https://maps.google.com/?q=${latitude},${longitude}`
    : DEFAULT_MAPS_URL;

  return {
    placeName,
    address: cleanAddress,
    mapsUrl,
    latitude,
    longitude,
  };
}
