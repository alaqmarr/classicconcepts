import { getCachedBrandAssets } from "@/lib/public-data";
import type { IconType } from "react-icons";
import {
  FaAmazon,
  FaEbay,
  FaEtsy,
  FaGlobe,
  FaShopify,
  FaShoppingBag,
  FaShoppingCart,
  FaStore,
  FaWhatsapp,
} from "react-icons/fa";
import {
  SiAliexpress,
  SiEbay,
  SiEtsy,
  SiShopee,
  SiShopify,
  SiTarget,
} from "react-icons/si";
import {
  getContentValue,
  hasContentOverride,
  type SiteContentMap,
} from "@/lib/site-content";
import { EditableText } from "@/components/inline-edit/EditableText";

const PLATFORM_ICONS: Record<string, IconType> = {
  FaAmazon,
  FaShoppingBag,
  FaShoppingCart,
  FaStore,
  FaGlobe,
  FaShopify,
  FaEbay,
  FaEtsy,
  FaWhatsapp,
  SiShopify,
  SiEbay,
  SiEtsy,
  SiAliexpress,
  SiTarget,
  SiShopee,
};

function renderPlatformIcon(iconName: string, size: number) {
  const IconComp = PLATFORM_ICONS[iconName];
  if (IconComp) {
    return <IconComp size={size} />;
  }
  if (iconName === "SiFlipkart") {
    return <FaShoppingBag size={size} />;
  }
  if (iconName === "SiWalmart") {
    return <FaStore size={size} />;
  }
  return null;
}

export async function AvailableOnPlatforms({
  content,
}: {
  content?: SiteContentMap;
}) {
  const { onlinePlatforms: platforms } = await getCachedBrandAssets();

  if (!platforms || platforms.length === 0) return null;

  return (
    <section className="relative bg-gradient-to-b from-white via-slate-50/50 to-white py-24 overflow-hidden border-t border-slate-100">
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute -top-[20%] left-[0%] w-[150%] h-[50%] bg-gradient-to-r from-red-100/30 to-transparent -rotate-12 transform origin-top-left"></div>
        <div className="absolute top-[20%] left-[0%] w-[150%] h-[40%] bg-gradient-to-r from-yellow-100/30 to-transparent -rotate-12 transform origin-top-left"></div>
        <div className="absolute top-[60%] left-[0%] w-[150%] h-[60%] bg-gradient-to-r from-blue-100/30 to-transparent -rotate-12 transform origin-top-left"></div>
      </div>

      <div className="container mx-auto px-4 md:px-8 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <EditableText
            as="span"
            mode="plain"
            contentKey="home.platforms.eyebrow"
            label="Platforms Eyebrow"
            value={getContentValue(
              content,
              "home.platforms.eyebrow",
              "Available On"
            )}
            className="text-[#3b82f6] text-[10px] font-bold uppercase tracking-widest mb-3 block"
          />
          <EditableText
            as="h2"
            mode="plain"
            contentKey="home.platforms.title"
            label="Platforms Heading"
            value={getContentValue(
              content,
              "home.platforms.title",
              "Shop our premium products directly from"
            )}
            hasCustomValue={hasContentOverride(
              content,
              "home.platforms.title"
            )}
            className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight mb-4 block"
          >
            Shop our premium products{" "}
            <span className="text-[#3b82f6]">directly from</span>
          </EditableText>
          <EditableText
            as="p"
            mode="multiline"
            contentKey="home.platforms.subtitle"
            label="Platforms Subtitle"
            value={getContentValue(
              content,
              "home.platforms.subtitle",
              "Experience the convenience of shopping for Classic Concepts acrylic products on your favorite e-commerce platforms with trusted delivery."
            )}
            className="text-slate-500 font-medium text-sm md:text-base block"
          />
        </div>

        <div className="flex flex-wrap justify-center gap-6 md:gap-8 w-full mx-auto">
          {platforms.map((platform) => {
            const hasExternalUrl =
              Boolean(platform.storeUrl) && platform.storeUrl !== "#";
            const href = hasExternalUrl ? platform.storeUrl : "/shop";

            return (
              <a
                key={platform.id}
                href={href}
                target={hasExternalUrl ? "_blank" : undefined}
                rel={hasExternalUrl ? "noopener noreferrer" : undefined}
                className="flex w-[280px] bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 border border-slate-100 group"
              >
                <div
                  className={`w-2/5 flex items-center justify-center p-6 ${
                    platform.colorClass || "text-slate-800"
                  } bg-slate-50 group-hover:bg-white transition-colors`}
                >
                  {renderPlatformIcon(platform.iconName, 40) || (
                    <span className="font-bold text-lg text-center leading-tight">
                      {platform.name}
                    </span>
                  )}
                </div>
                <div className="w-3/5 bg-gradient-to-b from-white via-slate-50/50 to-white group-hover:bg-gradient-to-b from-slate-50 via-slate-100/50 to-slate-50 text-slate-800 flex flex-col justify-center px-5 py-4 relative transition-colors">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Buy on
                  </span>
                  <EditableText
                    as="span"
                    mode="plain"
                    allowSwitchToHtml={false}
                    entity={{
                      model: "onlinePlatform",
                      id: platform.id,
                      field: "name",
                    }}
                    label={`Platform Name — ${platform.name}`}
                    value={platform.name}
                    className="text-base font-extrabold leading-tight block"
                  />
                  {platform.storeRegion && (
                    <EditableText
                      as="span"
                      mode="plain"
                      allowSwitchToHtml={false}
                      entity={{
                        model: "onlinePlatform",
                        id: platform.id,
                        field: "storeRegion",
                      }}
                      label={`Platform Region — ${platform.name}`}
                      value={platform.storeRegion}
                      className="text-[11px] font-semibold text-slate-400 mt-1 block"
                    />
                  )}
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
