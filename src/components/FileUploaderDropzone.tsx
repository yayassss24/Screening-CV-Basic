import React, { useState, useRef } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";

interface FileUploaderDropzoneProps {
  label: string;
  allowedExtensions: string[];
  onTextExtracted: (text: string, filename: string) => void;
  onError: (errors: string) => void;
}

export default function FileUploaderDropzone({
  label,
  allowedExtensions,
  onTextExtracted,
  onError,
}: FileUploaderDropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    const extension = "." + file.name.split(".").pop()?.toLowerCase();
    
    if (!allowedExtensions.includes(extension)) {
      onError(`Hanya mendukung dokumen dengan ekstensi: ${allowedExtensions.join(", ")}`);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      onError("Ukuran berkas melebihi batas maks 5MB.");
      return;
    }

    setIsParsing(true);
    setUploadedFileName(file.name);
    
    try {
      // Get correct MIME type
      let mimeType = file.type;
      if (!mimeType) {
        if (file.name.endsWith(".pdf")) mimeType = "application/pdf";
        else if (file.name.endsWith(".docx")) mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        else if (file.name.endsWith(".doc")) mimeType = "application/msword";
        else if (file.name.endsWith(".txt")) mimeType = "text/plain";
        else if (file.name.endsWith(".png")) mimeType = "image/png";
        else if (file.name.endsWith(".jpg") || file.name.endsWith(".jpeg")) mimeType = "image/jpeg";
      }

      // Convert to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.readAsDataURL(file);
        reader.onload = () => {
          const base64String = (reader.result as string).split(",")[1];
          resolve(base64String);
        };
        reader.onerror = (error) => reject(error);
      });

      const fileBase64 = await base64Promise;

      // Send to server-side document extractor
      const response = await fetch("/api/extract-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileBase64, mimeType }),
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "Gagal memproses berkas dokumen");
      }

      const resData = await response.json();
      if (resData.success && resData.text) {
        onTextExtracted(resData.text, file.name);
      } else {
        throw new Error("Gagal mengambil teks dari dalam dokumen berkas.");
      }
    } catch (err: any) {
      console.error("File extraction failed:", err);
      onError(`Gagal menguraikan ${file.name}: ${err.message}`);
      setUploadedFileName(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const triggerSelectFile = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      onClick={triggerSelectFile}
      className={`border rounded-xl p-3.5 flex items-center justify-between transition-all cursor-pointer select-none text-xs ${
        isDragActive
          ? "border-blue-500 bg-blue-50/25"
          : isParsing
          ? "border-slate-200 bg-slate-50/50 animate-pulse"
          : uploadedFileName
          ? "border-emerald-200 bg-emerald-50/10 hover:bg-emerald-50/20"
          : "border-slate-200 border-dashed hover:border-slate-300 hover:bg-slate-50/40 bg-transparent"
      }`}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={allowedExtensions.join(",")}
        className="hidden"
      />

      <div className="flex items-center gap-2.5">
        <div
          className={`p-2 rounded-lg ${
            isParsing
              ? "bg-slate-100 text-slate-500"
              : uploadedFileName
              ? "bg-emerald-100 text-emerald-600"
              : "bg-slate-50 text-slate-400 group-hover:text-slate-600"
          }`}
        >
          {isParsing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : uploadedFileName ? (
            <FileText className="w-4 h-4" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
        </div>
        <div className="text-left">
          <div className="font-bold text-slate-700">{label}</div>
          <div className="text-[10px] text-slate-400">
            {isParsing ? (
              <span className="text-blue-600 font-semibold flex items-center gap-1">
                Mentranskripsi isi dokumen berkas...
              </span>
            ) : uploadedFileName ? (
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle className="w-3 h-3 inline" /> {uploadedFileName}
              </span>
            ) : (
              `Seret atau klik untuk upload (${allowedExtensions.join(", ")}, maks 5MB)`
            )}
          </div>
        </div>
      </div>

      {!isParsing && uploadedFileName && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setUploadedFileName(null);
            onTextExtracted("", "");
          }}
          className="text-[10px] px-2 py-1 bg-slate-100 font-bold hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-lg transition-all"
        >
          Hapus
        </button>
      )}
    </div>
  );
}
