"use client";

import { Download } from "lucide-react";

import type { OpsExportFile } from "@/lib/ops/export";

type ExportButtonsProps = {
  files: OpsExportFile[];
};

export function ExportButtons({ files }: ExportButtonsProps) {
  function downloadFile(file: OpsExportFile) {
    const blob = new Blob([file.content], { type: file.mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = file.filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {files.map((file) => (
        <button
          key={file.filename}
          type="button"
          onClick={() => downloadFile(file)}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
        >
          <Download className="h-4 w-4" aria-hidden />
          {file.label}
        </button>
      ))}
    </div>
  );
}
