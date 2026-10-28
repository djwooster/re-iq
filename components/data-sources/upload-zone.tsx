"use client";

import { UploadCloud } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/cn";

const ACCEPT = {
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.ms-excel": [".xls"],
  "text/csv": [".csv"],
  "application/pdf": [".pdf"],
};

export function UploadZone({
  onFiles,
  onExamples,
  compact,
}: {
  onFiles: (files: File[]) => void;
  /** Shown when example reports are available to upload without real files. */
  onExamples?: () => void;
  compact?: boolean;
}) {
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    // Unsupported types are passed through so the pipeline can explain why it rejects them.
    onDrop: (accepted, rejected) => onFiles([...accepted, ...rejected.map((r) => r.file)]),
    noClick: true,
    accept: ACCEPT,
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed text-center transition-[background-color,border-color] duration-200 ease-out",
        compact ? "px-4 py-6" : "px-6 py-10",
        isDragActive ? "border-fg-3 bg-fg/[0.035]" : "border-border-strong/70 bg-transparent",
      )}
    >
      <input {...getInputProps()} aria-label="Upload report files" />
      <UploadCloud className={cn("mb-2.5 size-5 transition-colors", isDragActive ? "text-fg" : "text-fg-3")} strokeWidth={1.5} />
      <p className="text-xs text-fg">{isDragActive ? "Drop to upload" : "Drop monthly reports here"}</p>
      <p className="mt-1 text-[11px] text-fg-3">
        Rent roll, T12, budget, AR aging, or work orders · Excel, CSV, or PDF from any system
      </p>
      <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={open}
          className="cursor-pointer rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-fg transition-colors hover:border-border-strong"
        >
          Choose files
        </button>
        {onExamples && (
          <button
            type="button"
            onClick={onExamples}
            className="cursor-pointer rounded-md border border-transparent bg-inverted px-3 py-1.5 text-xs font-medium text-inverted-fg transition-opacity hover:opacity-90"
          >
            Use example reports
          </button>
        )}
      </div>
    </div>
  );
}
