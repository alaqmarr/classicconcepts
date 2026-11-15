"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";

interface ProductGalleryProps {
  images: string[];
  productName: string;
  discountBadge?: string | null;
  selectedImageUrl?: string | null;
  activeImage?: string;
  onSelectImage?: (url: string) => void;
}

export function ProductGallery({
  images,
  productName,
  discountBadge,
  selectedImageUrl,
  activeImage,
  onSelectImage,
}: ProductGalleryProps) {
  const safeImages = images.length > 0 ? images : ["/short-logo.png"];
  const controlledUrl = selectedImageUrl || activeImage || safeImages[0];
  const initialIdx = Math.max(0, safeImages.indexOf(controlledUrl));
  const [currentIndex, setCurrentIndex] = useState(initialIdx);
  const [isZooming, setIsZooming] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });

  const imageContainerRef = useRef<HTMLDivElement>(null);
  const thumbTrackRef = useRef<HTMLDivElement>(null);
  const thumbItemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const total = safeImages.length;

  // Keep internal index synced when parent changes selectedImageUrl / activeImage (e.g., variant click)
  useEffect(() => {
    const targetUrl = selectedImageUrl || activeImage;
    if (!targetUrl) return;
    const idx = safeImages.indexOf(targetUrl);
    if (idx !== -1 && idx !== currentIndex) {
      setCurrentIndex(idx);
    }
  }, [selectedImageUrl, activeImage, safeImages, currentIndex]);

  // Keep active thumbnail centered inside the horizontal strip
  useEffect(() => {
    const track = thumbTrackRef.current;
    const activeThumb = thumbItemRefs.current[currentIndex];
    if (!track || !activeThumb) return;

    const targetLeft =
      activeThumb.offsetLeft -
      track.clientWidth / 2 +
      activeThumb.clientWidth / 2;

    track.scrollTo({
      left: Math.max(0, targetLeft),
      behavior: "smooth",
    });
  }, [currentIndex]);

  const goToIndex = useCallback(
    (nextIdx: number) => {
      if (total === 0) return;
      const wrapped = ((nextIdx % total) + total) % total;
      setCurrentIndex(wrapped);
      onSelectImage?.(safeImages[wrapped]);
    },
    [total, safeImages, onSelectImage]
  );

  const handlePrev = () => goToIndex(currentIndex - 1);
  const handleNext = () => goToIndex(currentIndex + 1);

  const scrollThumbStrip = (direction: "left" | "right") => {
    const track = thumbTrackRef.current;
    if (!track) return;
    const step = Math.max(180, track.clientWidth * 0.65);
    track.scrollBy({
      left: direction === "left" ? -step : step,
      behavior: "smooth",
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;
    const { left, top, width, height } =
      imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPos({ x, y });
  };

  const displayedImage = safeImages[currentIndex] || safeImages[0];

  return (
    <div className="space-y-4 w-full mx-auto">
      {/* Main Studio Image Frame */}
      <div
        ref={imageContainerRef}
        className="relative aspect-square w-full rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-xs cursor-crosshair group select-none"
        onMouseEnter={() => setIsZooming(true)}
        onMouseLeave={() => setIsZooming(false)}
        onMouseMove={handleMouseMove}
      >
        <Image
          src={displayedImage}
          alt={productName}
          fill
          priority
          sizes="(max-width: 1024px) 92vw, 45vw"
          className={`object-contain p-3 sm:p-5 transition-transform duration-200 ease-out ${
            isZooming ? "scale-[2]" : "scale-100"
          }`}
          style={
            isZooming
              ? {
                  transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                }
              : undefined
          }
        />

        {discountBadge && (
          <div className="absolute top-3.5 right-3.5 bg-[#e31837] text-white px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider shadow-sm pointer-events-none">
            {discountBadge}
          </div>
        )}

        {/* Hover Zoom Hint */}
        {!isZooming && (
          <div className="absolute bottom-3.5 right-3.5 bg-slate-900/75 backdrop-blur-xs text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 pointer-events-none opacity-80 group-hover:opacity-0 transition-opacity">
            <ZoomIn size={14} /> Hover to zoom
          </div>
        )}

        {/* Prev / Next Navigation Overlay */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              aria-label="Previous product image"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 hover:bg-white text-slate-800 shadow-md border border-slate-200 flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              aria-label="Next product image"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 hover:bg-white text-slate-800 shadow-md border border-slate-200 flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
            >
              <ChevronRight size={18} />
            </button>

            {/* Image Counter Pill */}
            <div className="absolute top-3.5 left-3.5 bg-slate-900/70 backdrop-blur-xs text-white px-2.5 py-1 rounded-full text-[11px] font-bold pointer-events-none">
              {currentIndex + 1} / {total}
            </div>
          </>
        )}
      </div>

      {/* Horizontal Thumbnail Strip */}
      {total > 1 && (
        <div className="relative w-full flex items-center gap-2">
          {total > 4 && (
            <button
              type="button"
              onClick={() => scrollThumbStrip("left")}
              aria-label="Scroll thumbnails left"
              className="flex-shrink-0 w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-[#0056b3] hover:border-[#0056b3] shadow-xs flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
          )}

          <div
            ref={thumbTrackRef}
            className="flex-1 flex items-center gap-2.5 overflow-x-auto py-1 px-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {safeImages.map((img, index) => {
              const isActive = currentIndex === index;
              return (
                <button
                  key={`${img}-${index}`}
                  ref={(el) => {
                    thumbItemRefs.current[index] = el;
                  }}
                  type="button"
                  onClick={() => goToIndex(index)}
                  aria-label={`View image ${index + 1}`}
                  className={`relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 bg-white transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "border-[#0056b3] ring-2 ring-[#0056b3]/20 shadow-sm opacity-100"
                      : "border-slate-200 opacity-70 hover:opacity-100 hover:border-slate-300"
                  }`}
                >
                  <Image
                    src={img}
                    alt={`${productName} thumbnail ${index + 1}`}
                    fill
                    sizes="80px"
                    className="object-contain p-1"
                  />
                </button>
              );
            })}
          </div>

          {total > 4 && (
            <button
              type="button"
              onClick={() => scrollThumbStrip("right")}
              aria-label="Scroll thumbnails right"
              className="flex-shrink-0 w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-[#0056b3] hover:border-[#0056b3] shadow-xs flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
