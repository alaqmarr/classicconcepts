"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ProductGalleryProps {
  images: string[];
  productName: string;
  discountBadge?: string | null;
  selectedImageUrl?: string | null;
}

export function ProductGallery({
  images,
  productName,
  discountBadge,
  selectedImageUrl,
}: ProductGalleryProps) {
  const safeImages = useMemo(() => {
    let imgs = images.length > 0 ? [...images] : ["/placeholder-image.jpg"];
    if (selectedImageUrl && !imgs.includes(selectedImageUrl)) {
      imgs = [selectedImageUrl, ...imgs];
    }
    return imgs;
  }, [images, selectedImageUrl]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);

  const thumbTrackRef = useRef<HTMLDivElement | null>(null);
  const thumbItemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const touchStartXRef = useRef<number | null>(null);

  const total = safeImages.length;

  const goToIndex = useCallback(
    (nextIndex: number, dir?: number) => {
      if (total <= 1) return;
      const wrapped = ((nextIndex % total) + total) % total;
      setDirection(dir ?? (wrapped >= currentIndex ? 1 : -1));
      setCurrentIndex(wrapped);
    },
    [currentIndex, total]
  );

  const goToNext = useCallback(() => {
    if (total <= 1) return;
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const goToPrev = useCallback(() => {
    if (total <= 1) return;
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Keep moving forward automatically unless hovered/paused
  useEffect(() => {
    if (isPaused || total <= 1) return;

    const interval = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % total);
    }, 3500);

    return () => clearInterval(interval);
  }, [isPaused, total]);

  // Switch to selected variant image when chosen
  useEffect(() => {
    if (selectedImageUrl) {
      const index = safeImages.findIndex((img) => img === selectedImageUrl);
      if (index !== -1) {
        setDirection(1);
        setCurrentIndex(index);
      }
    }
  }, [selectedImageUrl, safeImages]);

  // Reset index safely if images list shrinks
  useEffect(() => {
    if (currentIndex >= total) {
      setCurrentIndex(0);
    }
  }, [currentIndex, total]);

  // Smoothly scroll ONLY the horizontal thumbnail strip (never page vertical scroll)
  useEffect(() => {
    const track = thumbTrackRef.current;
    const activeThumb = thumbItemRefs.current[currentIndex];
    if (!track || !activeThumb) return;

    const trackWidth = track.clientWidth;
    const thumbLeft = activeThumb.offsetLeft;
    const thumbWidth = activeThumb.offsetWidth;
    const targetLeft = Math.max(0, thumbLeft - trackWidth / 2 + thumbWidth / 2);

    track.scrollTo({
      left: targetLeft,
      behavior: "smooth",
    });
  }, [currentIndex]);

  const scrollThumbStrip = (dir: "left" | "right") => {
    const track = thumbTrackRef.current;
    if (!track) return;
    const step = Math.max(160, track.clientWidth * 0.65);
    track.scrollBy({
      left: dir === "right" ? step : -step,
      behavior: "smooth",
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const deltaX = endX - touchStartXRef.current;
    touchStartXRef.current = null;

    if (Math.abs(deltaX) > 40) {
      if (deltaX < 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
  };

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 48 : -48,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -48 : 48,
      opacity: 0,
    }),
  };

  return (
    <div
      className="w-full max-w-[340px] sm:max-w-[460px] md:max-w-[540px] lg:max-w-[500px] xl:max-w-[560px] 2xl:max-w-[620px] mx-auto flex flex-col gap-4 select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Main Carousel Stage */}
      <div
        className="group relative aspect-square w-full rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {discountBadge && (
          <div className="absolute top-4 left-4 z-20 bg-red-500 text-white text-xs sm:text-sm font-bold px-3.5 py-1.5 rounded-full shadow-md">
            {discountBadge}
          </div>
        )}

        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <Image
              src={safeImages[currentIndex]}
              alt={`${productName} image ${currentIndex + 1}`}
              fill
              sizes="(max-width: 640px) 340px, (max-width: 1024px) 540px, 620px"
              className="object-cover"
              priority={currentIndex === 0}
            />
          </motion.div>
        </AnimatePresence>

        {/* Left / Right Navigation Arrows */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={goToPrev}
              aria-label="Previous product image"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/90 hover:bg-[#0056b3] text-slate-800 hover:text-white border border-slate-200/80 shadow-lg flex items-center justify-center transition-all duration-200 active:scale-95"
            >
              <ChevronLeft size={22} />
            </button>

            <button
              type="button"
              onClick={goToNext}
              aria-label="Next product image"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/90 hover:bg-[#0056b3] text-slate-800 hover:text-white border border-slate-200/80 shadow-lg flex items-center justify-center transition-all duration-200 active:scale-95"
            >
              <ChevronRight size={22} />
            </button>

            {/* Image Counter Pill */}
            <div className="absolute bottom-3 right-3 z-20 bg-slate-900/75 backdrop-blur-xs text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
              {currentIndex + 1} / {total}
            </div>
          </>
        )}
      </div>

      {/* Single-Row Horizontal Auto-Advancing Thumbnail Strip */}
      {total > 1 && (
        <div className="relative w-full flex items-center gap-2">
          {total > 4 && (
            <button
              type="button"
              onClick={() => scrollThumbStrip("left")}
              aria-label="Scroll thumbnails left"
              className="flex-shrink-0 w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-[#0056b3] hover:border-[#0056b3] shadow-xs flex items-center justify-center transition-colors"
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
                  className={`relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 bg-white transition-all duration-200 ${
                    isActive
                      ? "border-[#0056b3] ring-2 ring-[#0056b3]/20 shadow-md opacity-100"
                      : "border-slate-200 opacity-65 hover:opacity-100 hover:border-slate-300"
                  }`}
                >
                  <Image
                    src={img}
                    alt={`${productName} thumbnail ${index + 1}`}
                    fill
                    sizes="80px"
                    className="object-cover"
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
              className="flex-shrink-0 w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-[#0056b3] hover:border-[#0056b3] shadow-xs flex items-center justify-center transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
