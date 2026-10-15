import { Phone, MessageCircle, Mail, Users } from "lucide-react";

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
}: {
  members: TeamMemberItem[];
  title?: string;
  subtitle?: string;
}) {
  if (!members || members.length === 0) return null;

  return (
    <div className="py-12">
      <div className="max-w-3xl mx-auto text-center mb-12">
        <span className="inline-block px-4 py-1.5 rounded-full bg-blue-50 text-[#0056b3] font-bold text-xs uppercase tracking-widest mb-3 border border-blue-100">
          Direct Assistance
        </span>
        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
          {title}
        </h2>
        <p className="text-slate-600 text-base md:text-lg leading-relaxed">
          {subtitle}
        </p>
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
                {member.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={member.photoUrl}
                    alt={member.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-white shadow-inner flex items-center justify-center text-[#0056b3]">
                    <Users size={40} />
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="p-6 flex flex-col flex-grow text-center">
                <h3 className="text-xl font-extrabold text-slate-900 mb-1">
                  {member.name}
                </h3>
                <p className="text-xs font-bold uppercase tracking-wider text-[#0056b3] mb-3">
                  {member.position}
                </p>

                {member.bio && (
                  <p className="text-sm text-slate-500 leading-relaxed mb-4 line-clamp-3">
                    {member.bio}
                  </p>
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

                {/* Action Buttons: Call & WhatsApp */}
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
