"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface PDFUploaderProps {
  caseId: string;
  existingFileName?: string | null;
}

export function PDFUploader({ caseId, existingFileName }: PDFUploaderProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleUpload(file: File) {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setUploadStatus("error");
      setErrorMsg("Only PDF files are accepted.");
      return;
    }

    setUploading(true);
    setUploadStatus("idle");
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("case_id", caseId);

      const res = await fetch("/api/upload/chart", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Upload failed");
      }

      setUploadStatus("success");
      router.refresh();
    } catch (err) {
      setUploadStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  }

  if (existingFileName) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <FileText className="h-4 w-4 text-green-600" />
        <span className="max-w-[200px] truncate text-muted-foreground" title={existingFileName}>
          {existingFileName}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={onFileChange}
      />
      {uploading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : uploadStatus === "success" ? (
        <CheckCircle2 className="h-4 w-4 text-green-600" />
      ) : uploadStatus === "error" ? (
        <div className="flex items-center gap-1">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span className="text-xs text-red-500">{errorMsg}</span>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="h-7 text-xs"
        >
          <Upload className="mr-1 h-3 w-3" />
          Upload PDF
        </Button>
      )}
    </div>
  );
}
