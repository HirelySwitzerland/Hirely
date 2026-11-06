"use client";

import { Download } from "lucide-react";

/** Opens the browser's print dialog – there «Als PDF speichern» creates the PDF. */
export function PrintButton({ label = "Als PDF speichern" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-ink/90">
      <Download className="h-4 w-4" />{label}
    </button>
  );
}
