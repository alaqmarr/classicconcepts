import { Diamond, Package, PenTool } from "lucide-react";
import {
  getContentValue,
  hasContentOverride,
  type SiteContentMap,
} from "@/lib/site-content";
import { EditableText } from "@/components/inline-edit/EditableText";

export function WhyChooseUs({ content }: { content?: SiteContentMap }) {
  return (
    <section className="bg-[#05060A] text-white py-20 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[30%] -left-[10%] w-[50%] h-[80%] bg-[#3b82f6] rounded-full mix-blend-screen filter blur-[120px] opacity-20"></div>
        <div className="absolute top-[20%] right-[10%] w-[40%] h-[60%] bg-[#e31837] rounded-full mix-blend-screen filter blur-[130px] opacity-20"></div>
        <div className="absolute -bottom-[20%] left-[30%] w-[60%] h-[50%] bg-[#ffdf00] rounded-full mix-blend-screen filter blur-[150px] opacity-[0.15]"></div>
      </div>

      <div className="container mx-auto px-4 md:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-8 items-center lg:items-start">
          {/* Left Title Column */}
          <div className="w-full lg:w-1/3 text-center lg:text-left">
            <EditableText
              as="span"
              mode="plain"
              contentKey="home.why.eyebrow"
              label="Why Choose Us Eyebrow"
              value={getContentValue(
                content,
                "home.why.eyebrow",
                "Why Choose Us"
              )}
              className="text-white/80 text-[10px] font-bold uppercase tracking-widest mb-3 block"
            />
            <EditableText
              as="h2"
              mode="plain"
              contentKey="home.why.title"
              label="Why Choose Us Heading"
              value={getContentValue(
                content,
                "home.why.title",
                "Why Choose Classic Concepts?"
              )}
              hasCustomValue={hasContentOverride(content, "home.why.title")}
              className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight block"
            >
              Why Choose
              <br />
              Classic Concepts?
            </EditableText>
          </div>

          {/* Right Features Columns */}
          <div className="w-full lg:w-2/3 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center lg:items-start text-center lg:text-left group">
              <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white mb-6 group-hover:scale-110 group-hover:bg-white group-hover:text-[#3b82f6] transition-all duration-300">
                <Diamond size={24} />
              </div>
              <EditableText
                as="h3"
                mode="plain"
                contentKey="home.why.card1.title"
                label="Feature 1 Heading"
                value={getContentValue(
                  content,
                  "home.why.card1.title",
                  "Direct Factory Pricing"
                )}
                className="text-[17px] font-bold mb-3 block"
              />
              <EditableText
                as="p"
                mode="multiline"
                contentKey="home.why.card1.body"
                label="Feature 1 Description"
                value={getContentValue(
                  content,
                  "home.why.card1.body",
                  "Buy directly from our 16,000 sq. ft. factory Since 2008 with honest pricing for single orders as well as bulk institutional orders."
                )}
                className="text-white/80 text-sm leading-relaxed font-medium block"
              />
            </div>

            <div className="flex flex-col items-center lg:items-start text-center lg:text-left group">
              <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white mb-6 group-hover:scale-110 group-hover:bg-white group-hover:text-[#e31837] transition-all duration-300">
                <Package size={24} />
              </div>
              <EditableText
                as="h3"
                mode="plain"
                contentKey="home.why.card2.title"
                label="Feature 2 Heading"
                value={getContentValue(
                  content,
                  "home.why.card2.title",
                  "Non-Yellowing Cast Acrylic"
                )}
                className="text-[17px] font-bold mb-3 block"
              />
              <EditableText
                as="p"
                mode="multiline"
                contentKey="home.why.card2.body"
                label="Feature 2 Description"
                value={getContentValue(
                  content,
                  "home.why.card2.body",
                  "Made from 100% imported clear cast acrylic with smooth diamond-polished edges and safe wooden crated delivery across India."
                )}
                className="text-white/80 text-sm leading-relaxed font-medium block"
              />
            </div>

            <div className="flex flex-col items-center lg:items-start text-center lg:text-left group">
              <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white mb-6 group-hover:scale-110 group-hover:bg-white group-hover:text-[#e31837] transition-all duration-300">
                <PenTool size={24} />
              </div>
              <EditableText
                as="h3"
                mode="plain"
                contentKey="home.why.card3.title"
                label="Feature 3 Heading"
                value={getContentValue(
                  content,
                  "home.why.card3.title",
                  "Custom Size & Logo Printing"
                )}
                className="text-[17px] font-bold mb-3 block"
              />
              <EditableText
                as="p"
                mode="multiline"
                contentKey="home.why.card3.body"
                label="Feature 3 Description"
                value={getContentValue(
                  content,
                  "home.why.card3.body",
                  "Add your hotel, school, or company logo with UV printing or laser engraving, or request custom sizes made to your drawing."
                )}
                className="text-white/80 text-sm leading-relaxed font-medium block"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
