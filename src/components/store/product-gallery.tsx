"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

type ProductGalleryProps = {
  images: string[];
  productName: string;
  maker?: string;
};

export function ProductGallery({ images, productName, maker }: ProductGalleryProps) {
  // Normalize images array to ensure at least 1 image and remove duplicates/empties
  const gallery = images.filter(Boolean);
  const activeList = gallery.length > 0 ? gallery : ["/placeholder.jpg"];

  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowRight") {
        setActiveIndex((prev) => (prev + 1) % activeList.length);
      }
      if (e.key === "ArrowLeft") {
        setActiveIndex((prev) => (prev - 1 + activeList.length) % activeList.length);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, activeList.length]);

  const nextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveIndex((prev) => (prev + 1) % activeList.length);
  };

  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveIndex((prev) => (prev - 1 + activeList.length) % activeList.length);
  };

  const currentImage = activeList[activeIndex] || activeList[0];

  return (
    <div className="space-y-3.5">
      {/* Main Image Showcase */}
      <div className="group relative aspect-square sm:aspect-[4/3.8] max-h-[480px] w-full overflow-hidden bg-stone-200 shadow-xs">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentImage}
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0.4 }}
            transition={{ duration: 0.3 }}
            className="relative size-full cursor-zoom-in"
            onClick={() => setLightboxOpen(true)}
          >
            <Image
              src={currentImage}
              alt={`${productName} - View ${activeIndex + 1}`}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            />
          </motion.div>
        </AnimatePresence>

        {/* Counter Badge */}
        {activeList.length > 1 && (
          <div className="absolute left-4 top-4 z-10 rounded-full bg-stone-900/60 px-3 py-1 font-mono text-[11px] text-white backdrop-blur-sm">
            {activeIndex + 1} / {activeList.length}
          </div>
        )}

        {/* Zoom Lightbox Trigger Button */}
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          aria-label="Enlarge image"
          className="absolute right-4 top-4 z-10 grid size-9 place-items-center rounded-full bg-white/80 text-stone-700 opacity-0 shadow-sm backdrop-blur-sm transition-opacity hover:bg-white hover:text-stone-950 group-hover:opacity-100"
        >
          <Expand className="size-4" />
        </button>

        {/* Navigation Arrows for multi-image */}
        {activeList.length > 1 && (
          <>
            <button
              type="button"
              onClick={prevImage}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 grid size-10 place-items-center rounded-full bg-white/85 text-stone-800 opacity-0 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:scale-105 group-hover:opacity-100"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={nextImage}
              aria-label="Next image"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 grid size-10 place-items-center rounded-full bg-white/85 text-stone-800 opacity-0 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:scale-105 group-hover:opacity-100"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail Filmstrip */}
      {activeList.length > 1 && (
        <div className="flex gap-2.5 overflow-x-auto pb-1 pt-1 scrollbar-thin">
          {activeList.map((img, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                type="button"
                key={img + idx}
                onClick={() => setActiveIndex(idx)}
                aria-label={`View photo ${idx + 1}`}
                className={cn(
                  "relative aspect-square w-16 sm:w-20 shrink-0 overflow-hidden bg-stone-100 transition-all",
                  isActive
                    ? "ring-2 ring-[#91412e] ring-offset-1 opacity-100"
                    : "opacity-60 hover:opacity-100",
                )}
              >
                <Image
                  src={img}
                  alt={`${productName} thumbnail ${idx + 1}`}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/95 backdrop-blur-md p-4 sm:p-10"
            onClick={() => setLightboxOpen(false)}
          >
            {/* Top Bar */}
            <div className="absolute top-6 inset-x-6 z-20 flex items-center justify-between text-white">
              <div>
                <p className="font-serif text-lg tracking-tight">{productName}</p>
                {maker && <p className="text-xs text-stone-400">{maker}</p>}
              </div>

              <div className="flex items-center gap-4">
                <span className="font-mono text-xs text-stone-400">
                  {activeIndex + 1} of {activeList.length}
                </span>
                <button
                  type="button"
                  onClick={() => setLightboxOpen(false)}
                  className="grid size-10 place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  aria-label="Close fullscreen view"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            {/* Lightbox Main Image */}
            <div
              className="relative max-h-[85vh] max-w-[90vw] aspect-[4/5] w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={currentImage}
                alt={`${productName} - Fullscreen View ${activeIndex + 1}`}
                fill
                sizes="90vw"
                className="object-contain"
                priority
              />
            </div>

            {/* Lightbox Navigation Buttons */}
            {activeList.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    prevImage();
                  }}
                  className="absolute left-6 top-1/2 -translate-y-1/2 grid size-12 place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="size-6" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    nextImage();
                  }}
                  className="absolute right-6 top-1/2 -translate-y-1/2 grid size-12 place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  aria-label="Next photo"
                >
                  <ChevronRight className="size-6" />
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
