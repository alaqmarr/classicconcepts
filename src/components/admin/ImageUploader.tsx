"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, X, Loader2, Image as ImageIcon } from "lucide-react";

interface ImageUploaderProps {
  name: string;
  defaultValue?: string;
  required?: boolean;
}

export function ImageUploader({ name, defaultValue = "", required = false }: ImageUploaderProps) {
  const [uploadedUrl, setUploadedUrl] = useState<string>(defaultValue);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      const data = await res.json();
      setUploadedUrl(data.url);
    } catch (err) {
      console.error(err);
      setError("Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.svg', '.gif']
    },
    maxFiles: 1,
    multiple: false
  });

  const clearImage = () => {
    setUploadedUrl("");
  };

  return (
    <div className="w-full">
      {/* Hidden input to pass the URL to Server Actions */}
      <input type="hidden" name={name} value={uploadedUrl} required={required && !uploadedUrl} />

      {uploadedUrl ? (
        <div className="relative w-full aspect-video bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
          <img src={uploadedUrl} alt="Uploaded" className="w-full h-full object-cover" />
          <button 
            type="button" 
            onClick={clearImage}
            className="absolute top-2 right-2 p-1.5 bg-white text-slate-600 hover:text-red-500 rounded-lg shadow-sm transition-colors border border-slate-200"
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
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${isDragActive ? 'bg-blue-100 text-[#0056b3]' : 'bg-white shadow-sm border border-slate-200 text-slate-400'}`}>
                {isDragActive ? <UploadCloud size={24} /> : <ImageIcon size={24} />}
              </div>
              <p className="text-sm font-bold text-slate-700 mb-1">
                {isDragActive ? "Drop the image here" : "Click or drag an image to upload"}
              </p>
              <p className="text-xs text-slate-400 font-medium">SVG, PNG, JPG, or WEBP (max. 10MB)</p>
              {error && <p className="text-xs text-red-500 font-bold mt-3">{error}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
