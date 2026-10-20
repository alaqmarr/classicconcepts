"use client";

import { useState, useCallback } from "react";
import { useDropzone, FileRejection } from "react-dropzone";
import { UploadCloud, X, Loader2, Image as ImageIcon } from "lucide-react";
import { ImageCropperModal } from "./ImageCropperModal";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

interface MultiImageUploaderProps {
  name: string;
  defaultValues?: string[];
  aspectRatio?: number;
  aspectLabel?: string;
}

export function MultiImageUploader({
  name,
  defaultValues = [],
  aspectRatio = 1,
  aspectLabel = "1:1 Square",
}: MultiImageUploaderProps) {
  const [uploadedUrls, setUploadedUrls] = useState<string[]>(defaultValues);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [cropQueue, setCropQueue] = useState<File[]>([]);

  const uploadSingleFile = useCallback(async (file: File) => {
    setIsUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to upload ${file.name}`);
      }
      setUploadedUrls((prev) => [...prev, data.url]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const advanceQueueAfterFile = useCallback(
    async (fileToUpload: File) => {
      setCropQueue((prev) => prev.slice(1));
      await uploadSingleFile(fileToUpload);
    },
    [uploadSingleFile]
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      if (fileRejections.length > 0) {
        const isTooLarge = fileRejections.some((r) =>
          r.errors.some((e) => e.code === "file-too-large")
        );
        setError(
          isTooLarge
            ? "One or more images exceed the maximum size limit of 20 MB."
            : "Some files were rejected. Please upload JPG, PNG, WEBP, SVG, or GIF (Max 20MB)."
        );
      }

      if (acceptedFiles.length === 0) return;

      const rasterFiles: File[] = [];
      for (const file of acceptedFiles) {
        if (file.type === "image/svg+xml" || file.type === "image/gif") {
          await uploadSingleFile(file);
        } else {
          rasterFiles.push(file);
        }
      }

      if (rasterFiles.length > 0) {
        setCropQueue((prev) => [...prev, ...rasterFiles]);
      }
    },
    [uploadSingleFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp", ".svg", ".gif"],
    },
    maxSize: MAX_FILE_SIZE,
    multiple: true,
  });

  const removeImage = (indexToRemove: number) => {
    setUploadedUrls((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const currentCropFile = cropQueue[0] || null;

  return (
    <div className="w-full">
      {/* Hidden inputs to pass the URLs to Server Actions */}
      {uploadedUrls.map((url, idx) => (
        <input key={`${url}-${idx}`} type="hidden" name={name} value={url} />
      ))}

      {currentCropFile && (
        <ImageCropperModal
          file={currentCropFile}
          defaultAspectRatio={aspectRatio}
          aspectLabel={
            cropQueue.length > 1
              ? `${aspectLabel} (${cropQueue.length} remaining)`
              : aspectLabel
          }
          onComplete={(croppedFile) => advanceQueueAfterFile(croppedFile)}
          onSkipCrop={(originalFile) => advanceQueueAfterFile(originalFile)}
          onCancel={() => setCropQueue((prev) => prev.slice(1))}
        />
      )}

      {uploadedUrls.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
          {uploadedUrls.map((url, idx) => (
            <div
              key={`${url}-${idx}`}
              className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Uploaded ${idx + 1}`}
                className="object-contain w-full h-full"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(idx);
                }}
                className="absolute top-2 right-2 p-1.5 bg-white text-slate-600 hover:text-red-500 rounded-lg shadow-sm transition-colors border border-slate-200"
                title="Remove Image"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        {...getRootProps()}
        className={`relative flex flex-col items-center justify-center p-6 mb-2 border-2 border-dashed rounded-xl transition-all cursor-pointer ${
          isDragActive
            ? "border-[#0056b3] bg-blue-50/50"
            : error
            ? "border-red-300 bg-red-50"
            : "border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-[#0056b3]"
        }`}
      >
        <input {...getInputProps()} />

        {isUploading ? (
          <div className="flex flex-col items-center justify-center text-[#0056b3] py-4">
            <Loader2 size={32} className="animate-spin mb-3" />
            <p className="text-sm font-bold">Uploading images...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-500 text-center py-2">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                isDragActive
                  ? "bg-blue-100 text-[#0056b3]"
                  : "bg-white shadow-sm border border-slate-200 text-slate-400"
              }`}
            >
              {isDragActive ? <UploadCloud size={24} /> : <ImageIcon size={24} />}
            </div>
            <p className="text-sm font-bold text-slate-700 mb-1">
              {isDragActive
                ? "Drop images here"
                : "Drag & drop multiple images, or click to select & crop"}
            </p>
            <p className="text-xs text-slate-400">
              Supports JPEG, PNG, WEBP, SVG (Max 20MB each • Inbuilt Cropper)
            </p>
          </div>
        )}
      </div>

      {error && <p className="text-red-500 text-xs font-bold mt-1 mb-3">{error}</p>}
    </div>
  );
}
