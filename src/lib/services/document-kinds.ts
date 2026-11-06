/**
 * The parts of an application and where a quote sits in them. Pure functions (no database), shared by the
 * screening, the candidate profile and the document viewer.
 */

export type DocKind = "CV" | "COVER_LETTER" | "REFERENCE" | "CERTIFICATE" | "DOCUMENT";

export const DOC_KIND_LABEL: Record<string, string> = {
  CV: "Lebenslauf",
  COVER_LETTER: "Anschreiben",
  REFERENCE: "Arbeitszeugnis",
  CERTIFICATE: "Diplom / Zertifikat",
  DOCUMENT: "Dokument",
};

/** Short label for evidence chips. */
export const DOC_KIND_SHORT: Record<string, string> = {
  CV: "Lebenslauf",
  COVER_LETTER: "Anschreiben",
  REFERENCE: "Zeugnis",
  CERTIFICATE: "Diplom",
  DOCUMENT: "Dokument",
};

/** The cover letter typed into the application form is treated like a document with this id. */
export const FORM_LETTER_ID = "anschreiben";

/** Guesses what an uploaded file is, from its name first and its first lines second. */
export function guessDocKind(filename: string, text = ""): DocKind {
  const name = filename.toLowerCase();
  const head = text.slice(0, 600).toLowerCase();
  if (/(lebenslauf|curriculum|\bcv\b|_cv|cv_|resume|résumé)/.test(name)) return "CV";
  if (/(diplom|zertifikat|certificate|certificat|f(ä|ae)higkeitszeugnis|efz|eba|abschluss|attest|ausweis)/.test(name)) return "CERTIFICATE";
  if (/(zeugnis|referenz|reference|certificat de travail|certificato di lavoro)/.test(name)) return "REFERENCE";
  if (/(anschreiben|motivation|bewerbungsschreiben|begleitbrief|cover|lettre|lettera)/.test(name)) return "COVER_LETTER";
  if (/(arbeitszeugnis|zwischenzeugnis|certificat de travail)/.test(head)) return "REFERENCE";
  if (/(f(ä|ae)higkeitszeugnis|diplom|zertifikat|certificate of)/.test(head)) return "CERTIFICATE";
  if (/(sehr geehrte|dear |madame, monsieur|gentili)/.test(head)) return "COVER_LETTER";
  return "DOCUMENT";
}

export type Location = { start: number; end: number; line: number; page?: number; pageLine?: number };

/**
 * Where a quote sits in a text: character offsets, line number and – for multi-page PDFs, whose pages are
 * separated by a form feed – page and line on that page. Null when the quote is not in the text.
 */
export function locate(text: string, quote: string): Location | null {
  if (!text || !quote) return null;
  const q = quote.replace(/…$/, "").trim();
  let start = text.indexOf(q);
  if (start < 0) {
    // tolerate different whitespace
    const re = new RegExp(q.split(/\s+/).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+"));
    const m = re.exec(text);
    if (!m) return null;
    start = m.index;
    return finish(text, start, start + m[0].length);
  }
  return finish(text, start, start + q.length);
}

function finish(text: string, start: number, end: number): Location {
  const before = text.slice(0, start);
  const line = before.split("\n").length;
  if (!text.includes("\f")) return { start, end, line };
  const page = before.split("\f").length;
  // pages are joined as "…\n\f\nNext page…": count lines from the first line after the form feed
  const onPage = before.slice(before.lastIndexOf("\f") + 1).replace(/^\n/, "");
  return { start, end, line, page, pageLine: onPage.split("\n").length };
}

/** «S. 2 · Z. 14» or «Z. 14». */
export function placeLabel(l: { line?: number; page?: number; pageLine?: number }) {
  if (!l.line) return "";
  return l.page && l.page > 1 ? `S. ${l.page} · Z. ${l.pageLine ?? l.line}` : `Z. ${l.page ? l.pageLine ?? l.line : l.line}`;
}
