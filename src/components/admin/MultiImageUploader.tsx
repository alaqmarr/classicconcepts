"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, X, Loader2, Image as ImageIcon } from "lucide-react";

interface MultiImageUploaderProps {
  name: string;
  defaultValues?: string[];
}

export function MultiImageUploader({ name, defaultValues = [] }: MultiImageUploaderProps) {
  const [uploadedUrls, setUploadedUrls] = useState<string[]>(defaultValues);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setIsUploading(true);
    setError("");

    try {
      const uploadPromises = acceptedFiles.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        const data = await res.json();
        return data.url;
      });

      const urls = await Promise.all(uploadPromises);
      setUploadedUrls((prev) => [...prev, ...urls]);
    } catch (err) {
      console.error(err);
      setError("Failed to upload some images. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.svg', '.gif']
    },
    multiple: true
  });

  const removeImage = (indexToRemove: number) => {
    setUploadedUrls((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className="w-full">
      {/* Hidden inputs to pass the URLs to Server Actions */}
      {uploadedUrls.map((url, idx) => (
        <input key={`${url}-${idx}`} type="hidden" name={name} value={url} />
      ))}

      {uploadedUrls.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 mb-6">
          {uploadedUrls.map((url, idx) => (
            <div key={`${url}-${idx}`} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Uploaded ${idx}`} className="object-cover w-full h-full" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button 
                  type="button" 
                  onClick={() => removeImage(idx)}
                  className="p-2 bg-white rounded-full text-red-500 hover:bg-red-50 hover:scale-110 transition-transform"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div 
        {...getRootProps()} 
        className={`relative flex flex-col items-center justify-center p-6 mb-4 border-2 border-dashed rounded-xl transition-all cursor-pointer ${
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
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${isDragActive ? 'bg-blue-100 text-[#0056b3]' : 'bg-white shadow-sm border border-slate-200 text-slate-400'}`}>
              {isDragActive ? <UploadCloud size={24} /> : <ImageIcon size={24} />}
            </div>
            <p className="text-sm font-bold text-slate-700 mb-1">
              {isDragActive ? "Drop images here" : "Drag & drop multiple images, or click to select"}
            </p>
            <p className="text-xs text-slate-400">
              Supports JPEG, PNG, WEBP, SVG (Max 5MB each)
            </p>
          </div>
        )}
      </div>

      {error && <p className="text-red-500 text-sm mt-1 mb-3">{error}</p>}

      {uploadedUrls.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
          {uploadedUrls.map((url, index) => (
            <div key={index} className="relative aspect-square bg-slate-100 rounded-xl overflow-hidden border border-slate-200 group">
              <img src={url} alt={`Uploaded ${index + 1}`} className="w-full h-full object-cover" />
              <button 
                type="button" 
                onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                className="absolute top-2 right-2 p-1.5 bg-white text-slate-600 hover:text-red-500 rounded-lg shadow-sm transition-colors border border-slate-200 opacity-0 group-hover:opacity-100"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
