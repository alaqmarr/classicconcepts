import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
};

function toAbsoluteUrl(url: string | null | undefined, origin: string): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${origin}${url.startsWith("/") ? "" : "/"}${url}`;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  try {
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      req.nextUrl.origin ||
      "https://classicconcepts.in";

    const [settings, branches, clients, platforms, certificates, team] =
      await Promise.all([
        prisma.siteSetting.findUnique({ where: { id: "default" } }),
        prisma.infrastructureLocation.findMany({
          orderBy: { sortOrder: "asc" },
        }),
        prisma.client.findMany({
          orderBy: { createdAt: "desc" },
        }),
        prisma.onlinePlatform.findMany({
          orderBy: { createdAt: "asc" },
        }),
        prisma.certificate.findMany({
          orderBy: { sortOrder: "asc" },
        }),
        prisma.teamMember.findMany({
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        }),
      ]);

    const whatsappNumber = settings?.whatsappNumber || "+917337222876";
    const whatsappClean = whatsappNumber.replace(/\D/g, "");
    const businessHoursRaw =
      settings?.businessHours ||
      "Monday - Saturday: 9:00 AM to 6:00 PM\nSunday: Closed";

    const payload = {
      success: true,
      updatedAt: settings?.updatedAt || new Date().toISOString(),
      brand: {
        companyName: "Classic Concepts Acrylic Private Limited",
        brandName: "Classic Concepts",
        sisterBrand: "Classic Edge 53",
        sisterBrandUrl: "https://classicedge53.com",
        tagline: "Two Decades of Excellence. Endless Possibilities in Acrylic.",
        website: "https://classicconcepts.in",
        logoUrl: toAbsoluteUrl("/logo.png", origin),
        shortLogoUrl: toAbsoluteUrl("/short-logo.png", origin),
        heroImageUrl: toAbsoluteUrl("/hero.png", origin),
        aboutIntroImageUrl: toAbsoluteUrl(
          settings?.aboutIntroImage || "/butterfly-table.png",
          origin
        ),
        clientCarouselSpeedSeconds: settings?.clientCarouselSpeed || 25,
        certifications: {
          iso: toAbsoluteUrl(
            settings?.aboutCertIso || "/iso-certificate.png",
            origin
          ),
          hym: toAbsoluteUrl(
            settings?.aboutCertHym || "/hym-certificate.png",
            origin
          ),
          ga: toAbsoluteUrl(
            settings?.aboutCertGa || "/ga-certificate.png",
            origin
          ),
          ascb: toAbsoluteUrl(
            settings?.aboutCertAscb || "/ascb-certificate.png",
            origin
          ),
          allCertificates: certificates.map((c) => ({
            id: c.id,
            title: c.title,
            issuedBy: c.issuedBy,
            fileUrl: toAbsoluteUrl(c.imageUrl, origin),
            sortOrder: c.sortOrder,
          })),
        },
        clients: clients.map((c) => ({
          id: c.id,
          name: c.name,
          logoUrl: toAbsoluteUrl(c.logoUrl, origin),
        })),
        onlinePlatforms: platforms.map((p) => ({
          id: p.id,
          name: p.name,
          storeUrl: p.storeUrl,
          storeRegion: p.storeRegion,
          iconName: p.iconName,
          colorClass: p.colorClass,
        })),
      },
      contact: {
        address:
          settings?.address ||
          "Classic Concepts Acrylic Pvt. Ltd., Bowenpally, Secunderabad, Telangana, India",
        primaryPhone: settings?.phone1 || "+917337222876",
        secondaryPhone: settings?.phone2 || null,
        phones: [settings?.phone1, settings?.phone2].filter(Boolean),
        whatsappNumber,
        whatsappUrl: `https://wa.me/${whatsappClean}`,
        primaryEmail: settings?.email || "sales@classicconcepts.in",
        secondaryEmail: settings?.email2 || null,
        emails: [settings?.email, settings?.email2].filter(Boolean),
        businessHours: businessHoursRaw,
        businessHoursLines: businessHoursRaw
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean),
        mapEmbedUrl: settings?.mapEmbedUrl || null,
        payment: {
          upiId: settings?.upiId || null,
          upiName: settings?.upiName || "Classic Concepts",
        },
      },
      branches: branches.map((b) => ({
        id: b.id,
        name: b.name,
        imageUrl: toAbsoluteUrl(b.imageUrl, origin),
        mapUrl: b.mapUrl || null,
        sortOrder: b.sortOrder,
      })),
      team: team.map((m) => ({
        id: m.id,
        name: m.name,
        position: m.position,
        photoUrl: toAbsoluteUrl(m.photoUrl, origin),
        phone: m.phone || null,
        whatsapp: m.whatsapp || null,
        email: m.email || null,
        bio: m.bio || null,
        sortOrder: m.sortOrder,
      })),
    };

    return NextResponse.json(payload, { status: 200, headers: CORS_HEADERS });
  } catch (error) {
    console.error("Error in /api/brand-info:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch brand and contact info" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
