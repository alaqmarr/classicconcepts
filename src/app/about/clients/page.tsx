export const dynamic = "force-dynamic";
import { getCachedBrandAssets } from "@/lib/public-data";
import { Award } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { getSiteContentMap, getContentValue } from "@/lib/site-content";
import { EditableText } from "@/components/inline-edit/EditableText";
import { EditableImage } from "@/components/inline-edit/EditableImage";

export const metadata = {
  title: "Our Clients - Classic Concepts",
  description:
    "Explore the esteemed clients who trust Classic Concepts for their premium acrylic product needs.",
};

export default async function AboutClientsPage() {
  const [brandAssets, contentMap] = await Promise.all([
    getCachedBrandAssets(),
    getSiteContentMap(),
  ]);
  const clients = brandAssets.clients;

  return (
    <main className="min-h-screen bg-[#fafbfc] flex flex-col">
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "About Us", href: "/about" },
          { label: "Our Clients" },
        ]}
        title={
          <>
            Trusted By{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
              Industry Leaders
            </span>
          </>
        }
        description="We take pride in our long-standing relationships with some of the most prestigious brands and organizations across India and globally."
      />

      {/* Main Content - Clients Grid */}
      <section className="py-20 relative z-20">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-center gap-3 mb-16">
            <Award className="text-[#0056b3]" size={32} />
            <EditableText
              as="h2"
              contentKey="clients.page.heading"
              value={getContentValue(contentMap, "clients.page.heading", "Our Esteemed Clients")}
              label="Clients Page Heading"
              className="text-3xl font-bold text-slate-800"
            />
          </div>

          {clients.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 p-6 flex flex-col items-center justify-center gap-4 group"
                >
                  <div className="w-full aspect-[3/2] relative flex items-center justify-center p-2">
                    <EditableImage
                      entity={{ model: "client", id: client.id, field: "logoUrl" }}
                      src={client.logoUrl}
                      alt={client.name}
                      label={`Client Logo: ${client.name}`}
                      wrapperClassName="relative w-full h-full flex items-center justify-center"
                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition-all duration-300"
                      emptyPlaceholder={
                        <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded-xl px-2">
                          <span className="text-lg font-bold text-slate-400 text-center uppercase tracking-wide group-hover:text-[#0056b3] transition-colors">
                            {client.name}
                          </span>
                        </div>
                      }
                    />
                  </div>
                  <EditableText
                    entity={{ model: "client", id: client.id, field: "name" }}
                    value={client.name}
                    label="Client Name"
                    className="text-sm font-semibold text-slate-600 group-hover:text-[#0056b3] transition-colors text-center"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
              <p className="text-slate-500 text-lg">
                We are currently updating our client portfolio. Check back soon!
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
