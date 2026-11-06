import Link from "next/link";
import { ExternalLink, FileText } from "lucide-react";
import { DOC_KIND_LABEL } from "@/lib/services/document-kinds";
import { cn } from "@/lib/utils";

export type ViewerDoc = { id: string; kind: string; title: string; text: string; fileId?: string; pdf?: boolean };
export type ViewerMark = { doc: string; start: number; end: number; line: number; label: string; status: string };

const MARK_TONE: Record<string, string> = {
  CONFIRMED: "bg-emerald-100 ring-emerald-300",
  PARTIAL: "bg-amber-100 ring-amber-300",
  NOT_MET: "bg-rose-100 ring-rose-300",
  UNKNOWN: "bg-slate-100 ring-slate-300",
};

/**
 * All parts of an application side by side. The passages Recruit24 used as evidence are marked in the text,
 * each with the requirement it supports; links like «Z. 14» from the profile jump straight to the line.
 */
export function DocumentViewer({ docs, marks, selected, hrefFor }: { docs: ViewerDoc[]; marks: ViewerMark[]; selected?: string; hrefFor: (docId: string) => string }) {
  if (!docs.length) return <p className="p-5 text-sm text-slate-500">Es wurden keine Unterlagen eingereicht.</p>;
  const doc = docs.find((d) => d.id === selected) ?? docs[0];
  const own = marks.filter((m) => m.doc === doc.id).sort((a, b) => a.start - b.start);
  return (
    <div className="grid gap-0 lg:grid-cols-[260px_1fr]">
      <nav className="border-b border-slate-100 p-3 lg:border-b-0 lg:border-r" aria-label="Unterlagen">
        <ul className="space-y-1">
          {docs.map((d) => {
            const n = marks.filter((m) => m.doc === d.id).length;
            return (
              <li key={d.id}>
                <Link href={hrefFor(d.id)} scroll={false} className={cn("flex items-start gap-2.5 rounded-lg px-3 py-2 text-sm transition", d.id === doc.id ? "bg-slate-100 text-ink" : "text-slate-600 hover:bg-slate-50")}>
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{DOC_KIND_LABEL[d.kind] ?? "Dokument"}</span>
                    <span className="block truncate text-xs text-slate-500">{d.title}</span>
                  </span>
                  {n > 0 && <span className="mt-0.5 rounded-full bg-amber-100 px-1.5 text-[11px] font-semibold text-amber-800">{n}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 px-3 text-xs leading-relaxed text-slate-500">Die Zahl zeigt, wie viele Stellen Recruit24 im Dokument als Beleg markiert hat.</p>
      </nav>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">{DOC_KIND_LABEL[doc.kind] ?? "Dokument"}</p>
            <p className="truncate text-xs text-slate-500">{doc.title}</p>
          </div>
          {doc.fileId && (
            <a href={`/api/files/${doc.fileId}${doc.pdf ? "?inline=1" : ""}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
              Original öffnen <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
        {own.length > 0 && (
          <div className="flex flex-wrap gap-1.5 border-b border-slate-100 bg-slate-50/60 px-5 py-2.5 text-xs">
            <span className="py-0.5 text-slate-500">Markiert:</span>
            {own.map((m, i) => (
              <a key={i} href={`#z-${m.line}`} className={cn("rounded px-1.5 py-0.5 font-medium text-slate-700 ring-1 ring-inset", MARK_TONE[m.status])}>{m.label}</a>
            ))}
          </div>
        )}
        {doc.text.trim() ? <Lines text={doc.text} marks={own} /> : <p className="p-5 text-sm text-slate-500">Aus dieser Datei liess sich kein Text lesen (z. B. ein eingescanntes Bild). Öffnen Sie das Original.</p>}
      </div>
    </div>
  );
}

function Lines({ text, marks }: { text: string; marks: ViewerMark[] }) {
  const rows: React.ReactNode[] = [];
  let offset = 0, page = 1, pageLine = 0;
  text.split("\n").forEach((raw, i) => {
    const lineNo = i + 1, from = offset, to = offset + raw.length;
    offset = to + 1;
    if (raw === "\f") {
      page += 1;
      pageLine = 0;
      rows.push(<div key={i} className="my-2 flex items-center gap-3 px-5 text-[11px] font-semibold uppercase tracking-wide text-slate-400"><span className="h-px flex-1 bg-slate-200" />Seite {page}<span className="h-px flex-1 bg-slate-200" /></div>);
      return;
    }
    pageLine += 1;
    const here = marks.filter((m) => m.start < to && m.end > from);
    // several requirements can rest on the same passage: merge overlapping marks, list every requirement
    const spans: { s: number; e: number; labels: string[]; status: string }[] = [];
    for (const m of here) {
      const s = Math.max(m.start, from), e = Math.min(m.end, to);
      const last = spans[spans.length - 1];
      if (last && s < last.e) {
        last.e = Math.max(last.e, e);
        if (!last.labels.includes(m.label)) last.labels.push(m.label);
      } else spans.push({ s, e, labels: [m.label], status: m.status });
    }
    const parts: React.ReactNode[] = [];
    let at = from;
    for (const sp of spans) {
      if (sp.s > at) parts.push(raw.slice(at - from, sp.s - from));
      parts.push(<mark key={sp.s} title={`Beleg für: ${sp.labels.join(", ")}`} className={cn("rounded px-0.5 text-ink ring-1 ring-inset", MARK_TONE[sp.status])}>{raw.slice(sp.s - from, sp.e - from)}</mark>);
      at = sp.e;
    }
    if (at < to) parts.push(raw.slice(at - from));
    rows.push(
      <div key={i} id={`z-${lineNo}`} className={cn("grid scroll-mt-28 grid-cols-[3.25rem_1fr] target:bg-amber-50 target:ring-1 target:ring-inset target:ring-amber-300", here.length > 0 && "bg-amber-50/40")}>
        <span className="select-none border-r border-slate-100 pr-3 text-right font-mono text-[11px] leading-6 text-slate-400">{pageLine}</span>
        <span className="whitespace-pre-wrap break-words px-4 font-mono text-[12.5px] leading-6 text-slate-700">{parts.length ? parts : " "}</span>
      </div>,
    );
  });
  return <div className="max-h-[760px] overflow-auto py-3">{rows}</div>;
}
