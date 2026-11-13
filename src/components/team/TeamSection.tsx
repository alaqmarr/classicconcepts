import { Phone, MessageCircle, Mail, Users } from "lucide-react";
import { getContentValue, hasContentOverride, type SiteContentMap } from "@/lib/site-content-shared";
import { EditableText } from "@/components/inline-edit/EditableText";
import { EditableImage } from "@/components/inline-edit/EditableImage";

interface TeamMemberItem {
  id: string;
  name: string;
  position: string;
  photoUrl: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  bio: string | null;
}

export function TeamSection({
  members,
  title = "Meet Our Team",
  subtitle = "Connect directly with our team of experts for personalized assistance, bulk enquiries, and custom acrylic fabrication.",
  content,
}: {
  members: TeamMemberItem[];
  title?: string;
  subtitle?: string;
  content?: SiteContentMap;
}) {
  if (!members || members.length === 0) return null;

  return (
    <div className="py-12">
      <div className="max-w-3xl mx-auto text-center mb-12">
        <EditableText
          as="span"
          mode="plain"
          contentKey="team.section.badge"
          label="Team Section Badge"
          value={getContentValue(
            content,
            "team.section.badge",
            "Direct Assistance"
          )}
          hasCustomValue={hasContentOverride(content, "team.section.badge")}
          className="inline-block px-4 py-1.5 rounded-full bg-blue-50 text-[#0056b3] font-bold text-xs uppercase tracking-widest mb-3 border border-blue-100"
        />
        <EditableText
          as="h2"
          mode="plain"
          contentKey="team.section.title"
          label="Team Section Heading"
          value={getContentValue(content, "team.section.title", title)}
          hasCustomValue={hasContentOverride(content, "team.section.title")}
          className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-4 block"
        />
        <EditableText
          as="p"
          mode="multiline"
          contentKey="team.section.subtitle"
          label="Team Section Subtitle"
          value={getContentValue(content, "team.section.subtitle", subtitle)}
          hasCustomValue={hasContentOverride(content, "team.section.subtitle")}
          className="text-slate-600 text-base md:text-lg leading-relaxed block"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8 w-full mx-auto">
        {members.map((member) => {
          const cleanWhatsapp = member.whatsapp
            ? member.whatsapp.replace(/[^0-9]/g, "")
            : "";

          return (
            <div
              key={member.id}
              className="group bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col"
            >
              {/* Photo */}
              <div className="relative aspect-[4/4] w-full bg-gradient-to-br from-slate-100 to-blue-50 overflow-hidden flex items-center justify-center">
                <EditableImage
                  entity={{
                    model: "teamMember",
                    id: member.id,
                    field: "photoUrl",
                  }}
                  src={member.photoUrl}
                  alt={member.name}
                  label={`Team Photo — ${member.name}`}
                  aspectRatio={1}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  wrapperClassName="relative w-full h-full flex items-center justify-center"
                  emptyPlaceholder={
                    <div className="w-24 h-24 rounded-full bg-white shadow-inner flex items-center justify-center text-[#0056b3]">
                      <Users size={40} />
                    </div>
                  }
                />
              </div>

              {/* Details */}
              <div className="p-6 flex flex-col flex-grow text-center">
                <EditableText
                  as="h3"
                  mode="plain"
                  allowSwitchToHtml={false}
                  entity={{
                    model: "teamMember",
                    id: member.id,
                    field: "name",
                  }}
                  label={`Team Member Name — ${member.name}`}
                  value={member.name}
                  className="text-xl font-extrabold text-slate-900 mb-1 block"
                />
                <EditableText
                  as="p"
                  mode="plain"
                  allowSwitchToHtml={false}
                  entity={{
                    model: "teamMember",
                    id: member.id,
                    field: "position",
                  }}
                  label={`Role / Designation — ${member.name}`}
                  value={member.position}
                  className="text-xs font-bold uppercase tracking-wider text-[#0056b3] mb-3 block"
                />

                {member.bio && (
                  <EditableText
                    as="p"
                    mode="multiline"
                    allowSwitchToHtml={false}
                    entity={{
                      model: "teamMember",
                      id: member.id,
                      field: "bio",
                    }}
                    label={`Bio — ${member.name}`}
                    value={member.bio}
                    className="text-sm text-slate-500 leading-relaxed mb-4 line-clamp-3 block"
                  />
                )}

                {member.email && (
                  <a
                    href={`mailto:${member.email}`}
                    className="inline-flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-[#0056b3] mb-4 transition-colors"
                  >
                    <Mail size={13} />
                    <span className="truncate">{member.email}</span>
                  </a>
                )}

                <div className="mt-auto pt-4 border-t border-slate-100 grid grid-cols-2 gap-2.5">
                  {member.phone ? (
                    <a
                      href={`tel:${member.phone}`}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#0056b3] text-white font-bold text-xs hover:bg-blue-800 transition-colors shadow-sm"
                    >
                      <Phone size={14} />
                      Call
                    </a>
                  ) : (
                    <span className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs cursor-not-allowed">
                      <Phone size={14} />
                      Call
                    </span>
                  )}

                  {cleanWhatsapp ? (
                    <a
                      href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
                        `Hello ${member.name}, I have an inquiry regarding Classic Concepts products.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#25D366] text-white font-bold text-xs hover:bg-[#1ebe57] transition-colors shadow-sm"
                    >
                      <MessageCircle size={14} />
                      WhatsApp
                    </a>
                  ) : (
                    <span className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs cursor-not-allowed">
                      <MessageCircle size={14} />
                      WhatsApp
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
