"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

interface ProductGalleryProps {
  images: string[];
  productName: string;
  discountBadge?: string | null;
  selectedImageUrl?: string | null;
}

export function ProductGallery({ images, productName, discountBadge, selectedImageUrl }: ProductGalleryProps) {
  const safeImages = useMemo(() => {
    let imgs = images.length > 0 ? [...images] : ["/placeholder-image.jpg"];
    if (selectedImageUrl && !imgs.includes(selectedImageUrl)) {
      imgs = [selectedImageUrl, ...imgs];
    }
    return imgs;
  }, [images, selectedImageUrl]);

  const [currentIndex, setCurrentIndex] = useState(0);

  // If a variant provides a specific image, try to switch to it
  useEffect(() => {
    if (selectedImageUrl) {
      const index = safeImages.findIndex(img => img === selectedImageUrl);
      if (index !== -1) {
        setCurrentIndex(index);
      }
    }
  }, [selectedImageUrl, safeImages]);

  return (
    <div className="flex flex-col gap-6">
      {/* Main Image */}
      <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm">
        {discountBadge && (
          <div className="absolute top-4 left-4 z-10 bg-red-500 text-white text-sm font-bold px-4 py-1.5 rounded-full shadow-md">
            {discountBadge}
          </div>
        )}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            <Image 
              src={safeImages[currentIndex]} 
              alt={`${productName} image ${currentIndex + 1}`} 
              fill 
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Thumbnails */}
      {safeImages.length > 1 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
          {safeImages.map((img, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                currentIndex === index 
                  ? "border-[#0056b3] shadow-md transform scale-105" 
                  : "border-slate-200 opacity-60 hover:opacity-100 hover:border-slate-300"
              }`}
            >
              <Image 
                src={img} 
                alt={`Thumbnail ${index + 1}`} 
                fill 
                sizes="150px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
