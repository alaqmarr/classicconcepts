"use client";

import { useState, useCallback } from "react";
import { useDropzone, FileRejection } from "react-dropzone";
import { UploadCloud, X, Loader2, FileText, ExternalLink, CheckCircle, Image as ImageIcon } from "lucide-react";
import { isImageUrl, isPdfUrl } from "@/lib/media-utils";
import { ImageCropperModal } from "./ImageCropperModal";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

interface FileUploaderProps {
  name: string;
  defaultValue?: string;
  required?: boolean;
  accept?: Record<string, string[]>;
  placeholder?: string;
  aspectRatio?: number;
  aspectLabel?: string;
}

export function FileUploader({
  name,
  defaultValue = "",
  required = false,
  accept,
  placeholder = "Upload file to Cloudflare R2 or enter link below",
  aspectRatio,
  aspectLabel,
}: FileUploaderProps) {
  const [uploadedUrl, setUploadedUrl] = useState<string>(defaultValue);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [cropFile, setCropFile] = useState<File | null>(null);

  const uploadFileToR2 = useCallback(async (fileToUpload: File) => {
    setCropFile(null);
    setIsUploading(true);
    setError("");
    setFileName(fileToUpload.name);

    const formData = new FormData();
    formData.append("file", fileToUpload);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setUploadedUrl(data.url);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to upload file to storage. Please try again.");
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
            ? "File exceeds the maximum size limit of 20 MB."
            : "Unsupported file format."
        );
        return;
      }

      const file = acceptedFiles[0];
      if (!file) return;

      if (file.size > MAX_FILE_SIZE) {
        setError("File size exceeds the maximum allowed limit of 20 MB.");
        return;
      }

      setError("");

      // If it's a raster image, open the inbuilt cropper
      if (
        file.type.startsWith("image/") &&
        file.type !== "image/svg+xml" &&
        file.type !== "image/gif"
      ) {
        setCropFile(file);
      } else {
        uploadFileToR2(file);
      }
    },
    [uploadFileToR2]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept || {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/zip": [".zip"],
      "video/*": [".mp4", ".webm"],
      "image/*": [".jpeg", ".jpg", ".png", ".webp", ".svg", ".gif"],
    },
    maxSize: MAX_FILE_SIZE,
    maxFiles: 1,
    multiple: false,
    disabled: isUploading,
  });

  const clearFile = () => {
    setUploadedUrl("");
    setFileName("");
    setError("");
  };

  return (
    <div className="space-y-3">
      {cropFile && (
        <ImageCropperModal
          file={cropFile}
          defaultAspectRatio={aspectRatio}
          aspectLabel={aspectLabel}
          onComplete={(croppedFile) => uploadFileToR2(croppedFile)}
          onSkipCrop={(originalFile) => uploadFileToR2(originalFile)}
          onCancel={() => setCropFile(null)}
        />
      )}

      {/* Upload Box */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors flex flex-col items-center justify-center min-h-[120px] ${
          isDragActive
            ? "border-[#0056b3] bg-blue-50/50"
            : uploadedUrl
            ? "border-emerald-300 bg-emerald-50/30"
            : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
        }`}
      >
        <input {...getInputProps()} />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-[#0056b3] animate-spin" />
            <span className="text-xs font-semibold text-[#0056b3]">Uploading to R2...</span>
          </div>
        ) : uploadedUrl ? (
          <div className="flex flex-col items-center gap-2.5 py-1" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-xs">
              <CheckCircle size={16} />
              <span>File ready & uploaded to R2</span>
            </div>

            {isImageUrl(uploadedUrl) && (
              <div className="relative w-28 h-20 rounded-lg overflow-hidden border border-slate-200 bg-white shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={uploadedUrl} alt="Preview" className="w-full h-full object-contain" />
              </div>
            )}

            <div className="flex items-center gap-2 max-w-full px-2">
              <a
                href={uploadedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#0056b3] hover:underline flex items-center gap-1.5 font-mono truncate max-w-xs md:max-w-md bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-xs"
              >
                {isPdfUrl(uploadedUrl) ? (
                  <span className="flex items-center gap-1 text-red-600 font-sans font-bold text-[11px]">
                    <FileText size={14} className="shrink-0 text-red-500" />
                    PDF
                  </span>
                ) : isImageUrl(uploadedUrl) ? (
                  <ImageIcon size={14} className="shrink-0 text-blue-500" />
                ) : (
                  <FileText size={14} className="shrink-0 text-slate-500" />
                )}
                <span className="truncate">{fileName || uploadedUrl.split("/").pop()}</span>
                <ExternalLink size={12} className="shrink-0 text-slate-400" />
              </a>
              <button
                type="button"
                onClick={clearFile}
                className="p-1 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                title="Remove file"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-[11px] text-slate-400">Click or drag a new file to replace (Max 20MB)</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-[#0056b3] flex items-center justify-center">
              <UploadCloud size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">
                Click or drag & drop file to upload
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                PDFs, Catalogs, Documents, Videos, or Images (Max 20MB • Inbuilt Cropper for Images)
              </p>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-xs font-medium text-red-500">{error}</p>}

      {/* Direct URL input fallback */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">
          {placeholder}
        </label>
        <input
          type="text"
          name={name}
          value={uploadedUrl}
          onChange={(e) => setUploadedUrl(e.target.value)}
          required={required}
          placeholder="https://..."
          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] text-sm font-mono"
        />
      </div>
    </div>
  );
}
