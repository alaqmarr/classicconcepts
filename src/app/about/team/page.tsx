export const dynamic = "force-dynamic";
import { getCachedBrandAssets, getPublicSiteSettings } from "@/lib/public-data";
import { PageHeader } from "@/components/layout/PageHeader";
import { TeamSection } from "@/components/team/TeamSection";
import {
  getSiteContentMap,
  getContentValue,
  hasContentOverride,
} from "@/lib/site-content";
import { EditableText } from "@/components/inline-edit/EditableText";
import { Users, Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import Link from "next/link";

export const metadata = {
  title: "Our Team - Classic Concepts",
  description:
    "Meet the dedicated team behind Classic Concepts — experts in acrylic podiums and custom fabrication.",
};

export default async function TeamPage() {
  const [brandAssets, settings, content] = await Promise.all([
    getCachedBrandAssets(),
    getPublicSiteSettings(),
    getSiteContentMap(),
  ]);
  const members = brandAssets.teamMembers;

  const defaultWhatsapp = (
    settings?.whatsappNumber || "+917337222876"
  ).replace(/[^0-9]/g, "");

  return (
    <main className="min-h-screen bg-[#fafbfc] flex flex-col">
      <PageHeader
        contentKeyPrefix="team.banner"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "About Us", href: "/about" },
          { label: "Our Team" },
        ]}
        title={
          <>
            Our{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
              Team
            </span>
          </>
        }
        description="Meet the specialists behind Classic Concepts' precision acrylic fabrication, design, and client support."
      />

      <section className="py-12 container mx-auto px-6 relative z-20">
        {members.length > 0 ? (
          <TeamSection
            members={members}
            content={content}
            title="The People Behind Classic Concepts"
            subtitle="With over two decades of experience in acrylic engineering and design, our team is ready to assist you directly via phone or WhatsApp."
          />
        ) : (
          <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-slate-200 max-w-2xl mx-auto my-8">
            <div className="w-16 h-16 bg-blue-50 text-[#0056b3] rounded-full flex items-center justify-center mx-auto mb-4">
              <Users size={32} />
            </div>
            <EditableText
              as="h2"
              contentKey="team.empty.heading"
              value={getContentValue(
                content,
                "team.empty.heading",
                "Connect With Our Team"
              )}
              hasCustomValue={hasContentOverride(
                content,
                "team.empty.heading"
              )}
              label="Empty Team Heading"
              className="text-2xl font-bold text-slate-900 mb-2 block"
            />
            <EditableText
              as="p"
              mode="multiline"
              contentKey="team.empty.subtitle"
              value={getContentValue(
                content,
                "team.empty.subtitle",
                "Our dedicated sales and engineering specialists are available to help you choose the right podiums and custom acrylic products."
              )}
              hasCustomValue={hasContentOverride(
                content,
                "team.empty.subtitle"
              )}
              label="Empty Team Subtitle"
              className="text-slate-600 mb-6 block"
            />
            <div className="flex flex-wrap items-center justify-center gap-4">
              <a
                href={`tel:${settings?.phone1 || "+917337222876"}`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0056b3] text-white font-bold hover:bg-blue-800 transition-colors"
              >
                <Phone size={18} />
                <span>Call </span>
                <EditableText
                  settingField="phone1"
                  value={settings?.phone1 || "+917337222876"}
                  label="Primary Phone Number"
                />
              </a>
              <a
                href={`https://wa.me/${defaultWhatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#25D366] text-white font-bold hover:bg-[#1ebe57] transition-colors"
              >
                <WhatsAppIcon size={18} />
                <EditableText
                  contentKey="team.empty.whatsapp_cta"
                  value={getContentValue(
                    content,
                    "team.empty.whatsapp_cta",
                    "WhatsApp Us"
                  )}
                  hasCustomValue={hasContentOverride(
                    content,
                    "team.empty.whatsapp_cta"
                  )}
                  label="WhatsApp Button Text"
                />
              </a>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors"
              >
                <EditableText
                  contentKey="team.empty.contact_cta"
                  value={getContentValue(
                    content,
                    "team.empty.contact_cta",
                    "Contact Page"
                  )}
                  hasCustomValue={hasContentOverride(
                    content,
                    "team.empty.contact_cta"
                  )}
                  label="Contact Page Button Text"
                />
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
