export const dynamic = "force-dynamic";
import { getCachedBrandAssets, getPublicSiteSettings } from "@/lib/public-data";
import { ContactForm } from "@/components/ContactForm";
import { TeamSection } from "@/components/team/TeamSection";
import { MapPin, Phone, Mail, Clock, ExternalLink } from "lucide-react";
import { resolveVerifiedGoogleMapsData } from "@/lib/location-helper";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import type { Metadata } from "next";
import {
  getSiteContentMap,
  getContentValue,
  hasContentOverride,
} from "@/lib/site-content";
import { EditableText } from "@/components/inline-edit/EditableText";

export const metadata: Metadata = {
  title: "Contact Us | Classic Concepts",
  description:
    "Get in touch with Classic Concepts for any enquiries regarding acrylic podiums, products, and custom solutions.",
};

export default async function ContactPage() {
  const [settings, brandAssets, content] = await Promise.all([
    getPublicSiteSettings(),
    getCachedBrandAssets(),
    getSiteContentMap(),
  ]);
  const teamMembers = brandAssets.teamMembers;
  const resolvedLocation = resolveVerifiedGoogleMapsData({
    address: settings?.address,
    mapEmbedUrl: settings?.mapEmbedUrl,
    explicitMapUrl: brandAssets.locations?.find((l) => l.mapUrl)?.mapUrl || null,
  });

  let mapSrc =
    settings?.mapEmbedUrl ||
    "https://www.google.com/maps?q=Secunderabad,+Hyderabad,+Telangana,+India&output=embed";
  if (mapSrc.includes("<iframe") && mapSrc.includes('src="')) {
    const match = mapSrc.match(/src="([^"]+)"/);
    if (match && match[1]) {
      mapSrc = match[1];
    }
  }

  return (
    <div className="relative bg-[#f8fafc] min-h-screen py-16 md:py-24 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[20%] w-[300px] h-[300px] bg-red-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-blob"></div>
        <div className="absolute top-[30%] right-[20%] w-[350px] h-[350px] bg-yellow-400 rounded-full mix-blend-multiply filter blur-[120px] opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-[20%] left-[40%] w-[400px] h-[400px] bg-blue-400 rounded-full mix-blend-multiply filter blur-[150px] opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="container mx-auto px-4 md:px-8 relative z-10">
        {/* Header section */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <EditableText
            as="h1"
            mode="plain"
            contentKey="contact.hero.title"
            label="Contact Page Heading"
            value={getContentValue(content, "contact.hero.title", "Contact Us")}
            className="text-4xl md:text-5xl font-extrabold text-slate-800 tracking-tight mb-6 drop-shadow-sm block"
          />
          <EditableText
            as="p"
            mode="multiline"
            contentKey="contact.hero.subtitle"
            label="Contact Page Subtitle"
            value={getContentValue(
              content,
              "contact.hero.subtitle",
              "Have a question about our products, or looking for a custom acrylic solution? Our team of experts is ready to help you with your next project."
            )}
            className="text-lg text-slate-600 leading-relaxed font-medium block"
          />
        </div>

        <div className="w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Contact Details side */}
          <div className="space-y-10">
            <div>
              <EditableText
                as="h2"
                mode="plain"
                contentKey="contact.details.heading"
                label="Contact Details Section Heading"
                value={getContentValue(
                  content,
                  "contact.details.heading",
                  "Get in Touch"
                )}
                className="text-2xl font-bold text-slate-800 mb-6 block"
              />
              <div className="space-y-6">
                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-[#0056b3] shrink-0">
                    <MapPin size={24} />
                  </div>
                  <div className="flex-1">
                    <EditableText
                      as="h3"
                      mode="plain"
                      contentKey="contact.address.label"
                      label="Office & Manufacturing Unit Label"
                      value={getContentValue(
                        content,
                        "contact.address.label",
                        "Head Office and Manufacturing Unit"
                      )}
                      className="font-bold text-slate-800 mb-1 block"
                    />
                    <EditableText
                      as="p"
                      mode="multiline"
                      allowSwitchToHtml={false}
                      settingField="address"
                      label="Head Office & Manufacturing Unit Address"
                      value={(
                        settings?.address || "Secunderabad, Hyderabad, Telangana, India"
                      ).replace(/\\n/g, "\n")}
                      className="text-slate-600 leading-relaxed whitespace-pre-wrap block"
                    />
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-[#0056b3] shrink-0">
                    <Phone size={24} />
                  </div>
                  <div className="flex-1">
                    <EditableText
                      as="h3"
                      mode="plain"
                      contentKey="contact.phone.label"
                      label="Phone Section Label"
                      value={getContentValue(
                        content,
                        "contact.phone.label",
                        "Phone Number"
                      )}
                      hasCustomValue={hasContentOverride(
                        content,
                        "contact.phone.label"
                      )}
                      className="font-bold text-slate-800 mb-1 block"
                    />
                    <div className="text-slate-600 leading-relaxed space-y-1">
                      <EditableText
                        as="div"
                        mode="plain"
                        allowSwitchToHtml={false}
                        settingField="phone1"
                        label="Primary Phone Number"
                        value={settings?.phone1 || "+917337222876"}
                        className="hover:text-[#0056b3] transition-colors"
                      />
                      {settings?.phone2 && (
                        <EditableText
                          as="div"
                          mode="plain"
                          allowSwitchToHtml={false}
                          settingField="phone2"
                          label="Secondary Phone Number"
                          value={settings.phone2}
                          className="hover:text-[#0056b3] transition-colors"
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-[#16a34a] shrink-0">
                    <WhatsAppIcon size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-800 mb-1 block">
                      WhatsApp Business Support
                    </h3>
                    <a
                      href="https://wa.me/917337220568"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-600 hover:text-[#16a34a] font-medium transition-colors inline-flex items-center gap-1.5"
                    >
                      +91 73372 20568
                    </a>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-[#0056b3] shrink-0">
                    <Mail size={24} />
                  </div>
                  <div className="flex-1">
                    <EditableText
                      as="h3"
                      mode="plain"
                      contentKey="contact.email.label"
                      label="Email Section Label"
                      value={getContentValue(
                        content,
                        "contact.email.label",
                        "Email Address"
                      )}
                      hasCustomValue={hasContentOverride(
                        content,
                        "contact.email.label"
                      )}
                      className="font-bold text-slate-800 mb-1 block"
                    />
                    <div className="text-slate-600 leading-relaxed space-y-1">
                      <EditableText
                        as="div"
                        mode="plain"
                        allowSwitchToHtml={false}
                        settingField="email"
                        label="Primary Email Address"
                        value={settings?.email || "sales@classicconcepts.in"}
                        className="hover:text-[#0056b3] transition-colors"
                      />
                      {settings?.email2 && (
                        <EditableText
                          as="div"
                          mode="plain"
                          allowSwitchToHtml={false}
                          settingField="email2"
                          label="Secondary Email Address"
                          value={settings.email2}
                          className="hover:text-[#0056b3] transition-colors"
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-[#0056b3] shrink-0">
                    <Clock size={24} />
                  </div>
                  <div className="flex-1">
                    <EditableText
                      as="h3"
                      mode="plain"
                      contentKey="contact.hours.label"
                      label="Business Hours Label"
                      value={getContentValue(
                        content,
                        "contact.hours.label",
                        "Business Hours"
                      )}
                      hasCustomValue={hasContentOverride(
                        content,
                        "contact.hours.label"
                      )}
                      className="font-bold text-slate-800 mb-1 block"
                    />
                    <EditableText
                      as="p"
                      mode="multiline"
                      allowSwitchToHtml={false}
                      settingField="businessHours"
                      label="Business Hours"
                      value={
                        settings?.businessHours ||
                        "Monday - Saturday: 9:00 AM to 6:00 PM\nSunday: Closed"
                      }
                      className="text-slate-600 leading-relaxed whitespace-pre-wrap block"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <EditableText
                  contentKey="contact.map.label"
                  value={getContentValue(
                    content,
                    "contact.map.label",
                    "Location Map"
                  )}
                  hasCustomValue={hasContentOverride(
                    content,
                    "contact.map.label"
                  )}
                  label="Map Section Caption"
                  className="font-semibold text-slate-600"
                />
                <EditableText
                  settingField="mapEmbedUrl"
                  value={mapSrc}
                  allowSwitchToHtml={false}
                  label="Google Maps Embed URL"
                  className="max-w-[200px] truncate text-[11px] text-slate-400"
                >
                  <span>Google Maps Location</span>
                </EditableText>
              </div>
              <div className="h-64 w-full bg-slate-200 rounded-2xl overflow-hidden shadow-inner">
                <iframe
                  src={mapSrc}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen={false}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
              <div className="pt-1 flex flex-wrap items-center gap-2">
                <a
                  href={resolvedLocation.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-blue-50 text-[#0056b3] border border-blue-200 text-xs sm:text-sm font-bold shadow-xs transition-colors"
                >
                  <MapPin size={15} />
                  <span>Open in Google Maps &amp; Get Directions</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>

          {/* Form Side */}
          <div className="bg-white/40 backdrop-blur-xl border border-white/60 p-8 md:p-10 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.04)] relative z-10">
            <ContactForm content={content} />
          </div>
        </div>

        {/* Team Members Section on Contact Page */}
        {teamMembers.length > 0 && (
          <div className="mt-20 border-t border-slate-200/80 pt-10">
            <TeamSection members={teamMembers} content={content} />
          </div>
        )}
      </div>
    </div>
  );
}
