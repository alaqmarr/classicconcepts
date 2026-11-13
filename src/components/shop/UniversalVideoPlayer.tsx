"use client";

import React, { useState } from "react";
import { ExternalLink, Film, PlayCircle, Smartphone } from "lucide-react";
import { resolveProductVideos, type ResolvedVideoItem } from "@/lib/youtube";

interface UniversalVideoPlayerProps {
  rawVideoUrl?: string | null;
  productName: string;
  compact?: boolean;
  headerAction?: React.ReactNode;
}

function getPlatformBadgeClasses(platform: ResolvedVideoItem["platform"]): string {
  switch (platform) {
    case "youtube":
    case "youtube-short":
      return "bg-red-50 text-red-700 border-red-200";
    case "instagram-reel":
    case "instagram-post":
      return "bg-pink-50 text-pink-700 border-pink-200";
    case "vimeo":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "facebook":
    case "facebook-reel":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "gdrive":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "loom":
      return "bg-purple-50 text-purple-700 border-purple-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

export function UniversalVideoPlayer({
  rawVideoUrl,
  productName,
  compact = false,
  headerAction,
}: UniversalVideoPlayerProps) {
  const videos = resolveProductVideos(rawVideoUrl);
  const [activeIdx, setActiveIdx] = useState(0);

  if (videos.length === 0) {
    return null;
  }

  const safeIdx = activeIdx < videos.length ? activeIdx : 0;
  const activeVideo = videos[safeIdx];
  const isVertical = activeVideo.orientation === "vertical";
  const isInstagram =
    activeVideo.platform === "instagram-reel" ||
    activeVideo.platform === "instagram-post";

  return (
    <div className={compact ? "w-full space-y-3" : "w-full space-y-3.5"}>
      {/* Header Row */}
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <PlayCircle size={20} className="text-[#0056b3] shrink-0" />
            <span>
              {videos.length > 1
                ? `Product Videos (${videos.length})`
                : "Product Video"}
            </span>
          </h3>

          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getPlatformBadgeClasses(
                activeVideo.platform
              )}`}
            >
              {isVertical ? (
                <Smartphone className="w-3 h-3" />
              ) : (
                <Film className="w-3 h-3" />
              )}
              {activeVideo.platformLabel}
            </span>

            <a
              href={activeVideo.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-[#0056b3] transition-colors"
              title={`Open on ${activeVideo.platformLabel}`}
            >
              <span>Open</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            {headerAction}
          </div>
        </div>
      )}

      {/* Multi-Video Switcher Tabs */}
      {videos.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {videos.map((vid, idx) => {
            const active = idx === safeIdx;
            return (
              <button
                key={`${vid.embedUrl}-${idx}`}
                type="button"
                onClick={() => setActiveIdx(idx)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  active
                    ? "bg-[#0056b3] text-white border-[#0056b3] shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {vid.orientation === "vertical" ? (
                  <Smartphone className="w-3.5 h-3.5" />
                ) : (
                  <PlayCircle className="w-3.5 h-3.5" />
                )}
                <span>
                  {idx + 1}. {vid.platformLabel}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Adaptive Player Container */}
      {activeVideo.renderKind === "video" ? (
        <div
          className={
            isVertical
              ? "w-full max-w-[330px] mx-auto aspect-[9/16] rounded-2xl overflow-hidden shadow-md border border-slate-200 bg-slate-950"
              : "w-full aspect-video rounded-2xl overflow-hidden shadow-md border border-slate-200 bg-slate-950"
          }
        >
          <video
            key={activeVideo.embedUrl}
            src={activeVideo.embedUrl}
            controls
            playsInline
            preload="metadata"
            className="w-full h-full object-contain bg-black"
          />
        </div>
      ) : isInstagram ? (
        <div className="w-full max-w-[360px] mx-auto rounded-2xl overflow-hidden shadow-md border border-slate-200 bg-white">
          <iframe
            key={activeVideo.embedUrl}
            src={activeVideo.embedUrl}
            title={`${productName} - ${activeVideo.platformLabel}`}
            className="w-full min-h-[540px] sm:min-h-[580px] border-0 bg-white"
            scrolling="no"
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      ) : isVertical ? (
        <div className="w-full max-w-[330px] mx-auto aspect-[9/16] rounded-2xl overflow-hidden shadow-md border border-slate-200 bg-slate-950">
          <iframe
            key={activeVideo.embedUrl}
            src={activeVideo.embedUrl}
            title={`${productName} - ${activeVideo.platformLabel}`}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-md border border-slate-200 bg-slate-950">
          <iframe
            key={activeVideo.embedUrl}
            src={activeVideo.embedUrl}
            title={`${productName} - ${activeVideo.platformLabel}`}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      )}
    </div>
  );
}
