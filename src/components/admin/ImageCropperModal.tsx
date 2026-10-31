"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Crop, RotateCw, ZoomIn, ZoomOut, Check, X, Maximize2, Sparkles } from "lucide-react";

interface ImageCropperModalProps {
  file: File;
  defaultAspectRatio?: number; // e.g., 1 for 1:1, 4/3 for 4:3, 16/9 for 16:9, undefined for freeform
  aspectLabel?: string;
  onComplete: (croppedFile: File) => void;
  onSkipCrop: (originalFile: File) => void;
  onCancel: () => void;
}

interface CropBox {
  x: number; // percentage 0..100 of displayed image width
  y: number; // percentage 0..100 of displayed image height
  w: number; // percentage 0..100
  h: number; // percentage 0..100
}

const ASPECT_PRESETS: { label: string; value: number | undefined }[] = [
  { label: "Free", value: undefined },
  { label: "1:1 Square", value: 1 },
  { label: "4:3 Standard", value: 4 / 3 },
  { label: "3:2 Landscape", value: 3 / 2 },
  { label: "16:9 Wide", value: 16 / 9 },
  { label: "3:4 Portrait", value: 3 / 4 },
];

export function ImageCropperModal({
  file,
  defaultAspectRatio,
  aspectLabel,
  onComplete,
  onSkipCrop,
  onCancel,
}: ImageCropperModalProps) {
  const [imageSrc, setImageSrc] = useState<string>("");
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number }>({ w: 1, h: 1 });
  const [aspect, setAspect] = useState<number | undefined>(defaultAspectRatio);
  const [rotation, setRotation] = useState<number>(0);
  const [scale, setScale] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState(false);

  // Crop box in percentage (0-100) of the rendered image element
  const [crop, setCrop] = useState<CropBox>({ x: 5, y: 5, w: 90, h: 90 });

  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragStateRef = useRef<{
    mode: "move" | "nw" | "ne" | "sw" | "se" | null;
    startX: number;
    startY: number;
    startCrop: CropBox;
  }>({
    mode: null,
    startX: 0,
    startY: 0,
    startCrop: { x: 5, y: 5, w: 90, h: 90 },
  });

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setImageSrc(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const applyAspectRatioToCrop = useCallback(
    (targetAspect: number | undefined, imgW: number, imgH: number) => {
      if (!targetAspect || !imgW || !imgH) {
        setCrop({ x: 5, y: 5, w: 90, h: 90 });
        return;
      }
      // targetAspect = (w_pct * imgW) / (h_pct * imgH)
      // => w_pct / h_pct = targetAspect * (imgH / imgW)
      const pctRatio = targetAspect * (imgH / imgW);
      let w = 85;
      let h = w / pctRatio;
      if (h > 85) {
        h = 85;
        w = h * pctRatio;
      }
      const x = (100 - w) / 2;
      const y = (100 - h) / 2;
      setCrop({ x, y, w, h });
    },
    []
  );

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const nw = img.naturalWidth || 800;
    const nh = img.naturalHeight || 600;
    setNaturalSize({ w: nw, h: nh });
    applyAspectRatioToCrop(aspect, nw, nh);
  };

  const handleSelectAspect = (newAspect: number | undefined) => {
    setAspect(newAspect);
    applyAspectRatioToCrop(newAspect, naturalSize.w, naturalSize.h);
  };

  const startDrag = (
    e: React.PointerEvent,
    mode: "move" | "nw" | "ne" | "sw" | "se"
  ) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragStateRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...crop },
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const state = dragStateRef.current;
    if (!state.mode || !imgRef.current) return;

    const rect = imgRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const dxPct = ((e.clientX - state.startX) / rect.width) * 100;
    const dyPct = ((e.clientY - state.startY) / rect.height) * 100;

    const { startCrop, mode } = state;
    const pctRatio = aspect ? aspect * (naturalSize.h / naturalSize.w) : undefined;

    if (mode === "move") {
      const nx = Math.max(0, Math.min(100 - startCrop.w, startCrop.x + dxPct));
      const ny = Math.max(0, Math.min(100 - startCrop.h, startCrop.y + dyPct));
      setCrop({ ...startCrop, x: nx, y: ny });
      return;
    }

    let { x, y, w, h } = startCrop;
    const minSize = 10;

    if (mode === "se") {
      w = Math.max(minSize, Math.min(100 - x, startCrop.w + dxPct));
      h = pctRatio ? w / pctRatio : Math.max(minSize, Math.min(100 - y, startCrop.h + dyPct));
      if (y + h > 100) {
        h = 100 - y;
        if (pctRatio) w = h * pctRatio;
      }
    } else if (mode === "sw") {
      const maxW = startCrop.x + startCrop.w;
      w = Math.max(minSize, Math.min(maxW, startCrop.w - dxPct));
      x = startCrop.x + (startCrop.w - w);
      h = pctRatio ? w / pctRatio : Math.max(minSize, Math.min(100 - y, startCrop.h + dyPct));
      if (y + h > 100) {
        h = 100 - y;
        if (pctRatio) {
          w = h * pctRatio;
          x = startCrop.x + (startCrop.w - w);
        }
      }
    } else if (mode === "ne") {
      const maxH = startCrop.y + startCrop.h;
      w = Math.max(minSize, Math.min(100 - x, startCrop.w + dxPct));
      h = pctRatio ? w / pctRatio : Math.max(minSize, Math.min(maxH, startCrop.h - dyPct));
      y = startCrop.y + (startCrop.h - h);
      if (y < 0) {
        y = 0;
        h = maxH;
        if (pctRatio) w = h * pctRatio;
      }
    } else if (mode === "nw") {
      const maxW = startCrop.x + startCrop.w;
      const maxH = startCrop.y + startCrop.h;
      w = Math.max(minSize, Math.min(maxW, startCrop.w - dxPct));
      h = pctRatio ? w / pctRatio : Math.max(minSize, Math.min(maxH, startCrop.h - dyPct));
      x = maxW - w;
      y = maxH - h;
      if (y < 0) {
        y = 0;
        h = maxH;
        if (pctRatio) {
          w = h * pctRatio;
          x = maxW - w;
        }
      }
    }

    setCrop({ x, y, w, h });
  };

  const endDrag = () => {
    dragStateRef.current.mode = null;
  };

  const handleCropAndSave = async () => {
    if (!imgRef.current) return;
    setIsProcessing(true);

    try {
      const img = imgRef.current;
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;

      const sx = (crop.x / 100) * nw;
      const sy = (crop.y / 100) * nh;
      const sw = (crop.w / 100) * nw;
      const sh = (crop.h / 100) * nh;

      const canvas = document.createElement("canvas");
      const isRotated90 = rotation % 180 !== 0;
      const rawOutW = isRotated90 ? sh : sw;
      const rawOutH = isRotated90 ? sw : sh;

      // Cap output canvas to max 2000px on longest side so 20MB DSLR photos become fast, crisp ~300KB web assets
      const MAX_OUTPUT_DIMENSION = 2000;
      const downscale =
        Math.max(rawOutW, rawOutH) > MAX_OUTPUT_DIMENSION
          ? MAX_OUTPUT_DIMENSION / Math.max(rawOutW, rawOutH)
          : 1;

      canvas.width = Math.max(1, Math.round(rawOutW * downscale));
      canvas.height = Math.max(1, Math.round(rawOutH * downscale));

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable");

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(scale * downscale, scale * downscale);

      const drawW = sw;
      const drawH = sh;
      ctx.drawImage(img, sx, sy, sw, sh, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      const mimeType =
        file.type === "image/png" || file.type === "image/webp"
          ? file.type
          : "image/jpeg";

      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed"))),
          mimeType,
          0.92
        );
      });

      const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      const croppedFile = new File([blob], `${baseName}-cropped.${ext}`, {
        type: mimeType,
      });

      onComplete(croppedFile);
    } catch (err) {
      console.error("Crop error:", err);
      onSkipCrop(file);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4"
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#0056b3] flex items-center justify-center">
              <Crop size={18} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800">
                Crop & Adjust Image
              </h3>
              <p className="text-xs text-slate-500">
                {aspectLabel
                  ? `Recommended: ${aspectLabel} • Drag corners to resize or move selection`
                  : "Drag corners to resize or move selection • Max 20MB supported"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Aspect Ratio Toolbar */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">
              Ratio:
            </span>
            {defaultAspectRatio &&
              !ASPECT_PRESETS.some(
                (p) => p.value && Math.abs(p.value - defaultAspectRatio) < 0.01
              ) && (
                <button
                  type="button"
                  onClick={() => handleSelectAspect(defaultAspectRatio)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                    aspect && Math.abs(aspect - defaultAspectRatio) < 0.01
                      ? "bg-[#0056b3] text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <Sparkles size={12} />
                  {aspectLabel || "Recommended"}
                </button>
              )}
            {ASPECT_PRESETS.map((preset) => {
              const isSelected =
                preset.value === undefined
                  ? aspect === undefined
                  : aspect !== undefined && Math.abs(aspect - preset.value) < 0.01;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleSelectAspect(preset.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    isSelected
                      ? "bg-[#0056b3] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setAspect(undefined);
                setCrop({ x: 0, y: 0, w: 100, h: 100 });
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center gap-1"
              title="Select Full Image"
            >
              <Maximize2 size={12} />
              Full Image
            </button>
          </div>

          {/* Zoom & Rotate Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg">
              <ZoomOut size={14} className="text-slate-500" />
              <input
                type="range"
                min={1}
                max={2.5}
                step={0.05}
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-20 accent-[#0056b3]"
              />
              <ZoomIn size={14} className="text-slate-500" />
            </div>
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center gap-1"
            >
              <RotateCw size={13} />
              Rotate
            </button>
          </div>
        </div>

        {/* Interactive Canvas Area */}
        <div className="flex-1 bg-slate-950 flex items-center justify-center p-6 overflow-auto select-none min-h-[340px] max-h-[58vh]">
          {imageSrc && (
            <div className="relative inline-block max-w-full max-h-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Crop preview"
                onLoad={handleImageLoad}
                style={{
                  transform: `rotate(${rotation}deg) scale(${scale})`,
                  maxHeight: "50vh",
                  maxWidth: "100%",
                  display: "block",
                }}
                className="object-contain pointer-events-none select-none"
              />

              {/* Darkened overlay outside crop box */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "rgba(0, 0, 0, 0.55)",
                  clipPath: `polygon(
                    0% 0%, 0% 100%, ${crop.x}% 100%, ${crop.x}% ${crop.y}%,
                    ${crop.x + crop.w}% ${crop.y}%, ${crop.x + crop.w}% ${crop.y + crop.h}%,
                    ${crop.x}% ${crop.y + crop.h}%, ${crop.x}% 100%, 100% 100%, 100% 0%
                  )`,
                }}
              />

              {/* Crop Selection Box */}
              <div
                onPointerDown={(e) => startDrag(e, "move")}
                style={{
                  left: `${crop.x}%`,
                  top: `${crop.y}%`,
                  width: `${crop.w}%`,
                  height: `${crop.h}%`,
                }}
                className="absolute border-2 border-white shadow-[0_0_0_1px_rgba(0,86,179,0.8)] cursor-move"
              >
                {/* Rule of Thirds Grid Lines */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                  <div className="border-r border-b border-white/30" />
                  <div className="border-r border-b border-white/30" />
                  <div className="border-b border-white/30" />
                  <div className="border-r border-b border-white/30" />
                  <div className="border-r border-b border-white/30" />
                  <div className="border-b border-white/30" />
                  <div className="border-r border-white/30" />
                  <div className="border-r border-white/30" />
                  <div />
                </div>

                {/* Corner Handles */}
                <div
                  onPointerDown={(e) => startDrag(e, "nw")}
                  className="absolute -top-2 -left-2 w-4 h-4 bg-[#0056b3] border-2 border-white rounded-xs cursor-nwse-resize"
                />
                <div
                  onPointerDown={(e) => startDrag(e, "ne")}
                  className="absolute -top-2 -right-2 w-4 h-4 bg-[#0056b3] border-2 border-white rounded-xs cursor-nesw-resize"
                />
                <div
                  onPointerDown={(e) => startDrag(e, "sw")}
                  className="absolute -bottom-2 -left-2 w-4 h-4 bg-[#0056b3] border-2 border-white rounded-xs cursor-nesw-resize"
                />
                <div
                  onPointerDown={(e) => startDrag(e, "se")}
                  className="absolute -bottom-2 -right-2 w-4 h-4 bg-[#0056b3] border-2 border-white rounded-xs cursor-nwse-resize"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200/70 transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onSkipCrop(file)}
              disabled={isProcessing}
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Upload Original (Skip Crop)
            </button>
            <button
              type="button"
              onClick={handleCropAndSave}
              disabled={isProcessing}
              className="px-6 py-2.5 rounded-xl text-sm font-bold bg-[#0056b3] text-white hover:bg-blue-800 transition-colors flex items-center gap-2 shadow-md"
            >
              <Check size={16} />
              {isProcessing ? "Processing..." : "Crop & Upload"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
