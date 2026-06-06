import React, { useState, useRef } from "react";
import { Upload, FileText, CheckCircle, RefreshCw } from "lucide-react";

interface FileUploaderDropzoneProps {
  label: string;
  allowedExtensions: string[];
  onTextExtracted: (text: string, filename: string) => void;
  onError: (errors: string) => void;
}

async function extractDocxText(file: File): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const docFile = zip.file("word/document.xml");
  if (!docFile) throw new Error("word/document.xml tidak ditemukan di DOCX");
  const xml = await docFile.async("text");
  const texts: string[] = [];
  const regex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    texts.push(match[1]);
  }
  return texts.join(" ").replace(/\s+/g, " ").trim();
}

async function extractPdfText(file: File): Promise<string> {
  const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
  GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.9.155/pdf.worker.min.mjs";
  const doc = await getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  let fullText = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map((item: any) => item.str).join(" ") + "\n";
  }
  return fullText.trim();
}

async function extractImageText(file: File): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("ind+eng");
  const { data } = await worker.recognize(file);
  await worker.terminate();
  return data.text || "";
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
      let text = "";

      if (extension === ".txt") {
        text = await file.text();
      } else if (extension === ".docx") {
        text = await extractDocxText(file);
      } else if (extension === ".pdf") {
        text = await extractPdfText(file);
      } else if ([".png", ".jpg", ".jpeg"].includes(extension)) {
        text = await extractImageText(file);
      } else {
        throw new Error("Tipe berkas tidak didukung");
      }

      if (text) {
        onTextExtracted(text, file.name);
      } else {
        throw new Error("Tidak ada teks yang dapat diekstrak.");
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
