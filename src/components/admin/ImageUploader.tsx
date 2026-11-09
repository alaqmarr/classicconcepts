"use client";

import { useState, useCallback } from "react";
import { useDropzone, FileRejection } from "react-dropzone";
import { UploadCloud, X, Loader2, Image as ImageIcon } from "lucide-react";
import { ImageCropperModal } from "./ImageCropperModal";
import { compressRasterImageIfNeeded, uploadAdminFile } from "@/lib/client-upload";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

interface ImageUploaderProps {
  name: string;
  defaultValue?: string;
  required?: boolean;
  aspectRatio?: number;
  aspectLabel?: string;
}

export function ImageUploader({
  name,
  defaultValue = "",
  required = false,
  aspectRatio,
  aspectLabel,
}: ImageUploaderProps) {
  const [uploadedUrl, setUploadedUrl] = useState<string>(defaultValue);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [cropFile, setCropFile] = useState<File | null>(null);

  const uploadFileToR2 = useCallback(async (fileToUpload: File, compressFirst = false) => {
    setCropFile(null);
    setIsUploading(true);
    setError("");

    try {
      const readyFile = compressFirst
        ? await compressRasterImageIfNeeded(fileToUpload)
        : fileToUpload;
      const url = await uploadAdminFile(readyFile);
      setUploadedUrl(url);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      if (fileRejections.length > 0) {
        const isTooLarge = fileRejections.some((r) =>
          r.errors.some((e) => e.code === "file-too-large")
        );
        setError(
          isTooLarge
            ? "Image exceeds the maximum size limit of 20 MB."
            : "Unsupported file format. Please upload JPG, PNG, WEBP, or GIF."
        );
        return;
      }

      const file = acceptedFiles[0];
      if (!file) return;

      if (file.size > MAX_FILE_SIZE) {
        setError("Image exceeds the maximum size limit of 20 MB.");
        return;
      }

      setError("");

      if (file.type === "image/gif") {
        uploadFileToR2(file, false);
      } else {
        setCropFile(file);
      }
    },
    [uploadFileToR2]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpeg", ".jpg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
      "image/gif": [".gif"],
    },
    maxSize: MAX_FILE_SIZE,
    maxFiles: 1,
    multiple: false,
    disabled: isUploading,
  });

  const clearImage = () => {
    setUploadedUrl("");
    setError("");
  };

  return (
    <div
      className="w-full relative"
      data-uploading={isUploading || !!cropFile ? "true" : undefined}
    >
      <input type="hidden" name={name} value={uploadedUrl} />
      {required && !uploadedUrl && (
        <input
          type="text"
          tabIndex={-1}
          aria-hidden="true"
          required
          value=""
          onChange={() => {}}
          className="sr-only"
        />
      )}

      {cropFile && (
        <ImageCropperModal
          file={cropFile}
          defaultAspectRatio={aspectRatio}
          aspectLabel={aspectLabel}
          onComplete={(croppedFile) => uploadFileToR2(croppedFile, false)}
          onSkipCrop={(originalFile) => uploadFileToR2(originalFile, true)}
          onCancel={() => setCropFile(null)}
        />
      )}

      {uploadedUrl ? (
        <div className="relative w-full aspect-video bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={uploadedUrl}
            alt="Uploaded"
            className="w-full h-full object-contain bg-slate-50"
          />
          <button
            type="button"
            onClick={clearImage}
            className="absolute top-2 right-2 p-1.5 bg-white text-slate-600 hover:text-red-500 rounded-lg shadow-sm transition-colors border border-slate-200"
            title="Remove Image"
          >
            <X size={18} />
          </button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-all cursor-pointer ${
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
              <p className="text-sm font-bold">Uploading image...</p>
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
                  ? "Drop the image here"
                  : "Click or drag an image to crop & upload"}
              </p>
              <p className="text-xs text-slate-400 font-medium">
                PNG, JPG, WEBP, or GIF (Max 20MB • Inbuilt Cropper)
              </p>
              {error && (
                <p className="text-xs text-red-500 font-bold mt-3">{error}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
